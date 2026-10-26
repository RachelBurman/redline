import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { DocumentAccessDeniedError } from '#/server/auth/document-access'
import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { getLatestLiveEventCursor, listLiveEvents } from '#/server/live/live-events'
import {
  encodeServerSentEvent,
  LIVE_ACCESS_RECHECK_MS,
  LIVE_CONNECTION_MAX_AGE_MS,
  LIVE_EVENT_QUERY_INTERVAL_MS,
  parseLiveEventCursor,
} from '#/server/live/live-stream'
import { assertLiveSubscriptionAccess } from '#/server/live/live-subscription-access'
import { reviewErrorResponse } from '#/server/reviews/review-error-response'

import type { LiveStreamMessage } from '#/types/live-events'

const encoder = new TextEncoder()
let activeConnectionCount = 0

function waitForNextQuery(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const onAbort = () => {
      clearTimeout(timeout)
      resolve()
    }
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, LIVE_EVENT_QUERY_INTERVAL_MS)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export const Route = createFileRoute('/api/v1/documents/$documentId/events')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const { session, workspace } = await requireWorkspaceContext(request)
          const accessContext = {
            organizationId: workspace.organization.id,
            role: workspace.organization.role,
            userId: session.user.id,
          }
          await assertLiveSubscriptionAccess({ context: accessContext, documentId })

          const requestedCursor = parseLiveEventCursor(request)
          const initialCursor = requestedCursor ?? (await getLatestLiveEventCursor())
          let cancelled = false

          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const send = (message: LiveStreamMessage) => {
                if (!cancelled) controller.enqueue(encoder.encode(encodeServerSentEvent(message)))
              }

              void (async () => {
                let cursor = initialCursor
                let lastAccessCheck = Date.now()
                const connectionStartedAt = Date.now()
                activeConnectionCount += 1
                send({ type: 'system.ready', cursor })
                console.info(
                  JSON.stringify({
                    metric: 'live_connection_opened',
                    documentId,
                    resumed: requestedCursor !== null,
                    activeConnectionCount,
                  }),
                )

                try {
                  while (
                    !cancelled &&
                    !request.signal.aborted &&
                    Date.now() - connectionStartedAt < LIVE_CONNECTION_MAX_AGE_MS
                  ) {
                    if (Date.now() - lastAccessCheck >= LIVE_ACCESS_RECHECK_MS) {
                      const refreshed = await requireWorkspaceContext(request)
                      if (
                        refreshed.session.user.id !== accessContext.userId ||
                        refreshed.workspace.organization.id !== accessContext.organizationId
                      ) {
                        throw new DocumentAccessDeniedError()
                      }
                      await assertLiveSubscriptionAccess({
                        context: {
                          organizationId: refreshed.workspace.organization.id,
                          role: refreshed.workspace.organization.role,
                          userId: refreshed.session.user.id,
                        },
                        documentId,
                      })
                      lastAccessCheck = Date.now()
                    }

                    const events = await listLiveEvents({
                      organizationId: accessContext.organizationId,
                      documentId,
                      after: cursor,
                    })
                    for (const event of events) {
                      send(event)
                      cursor = event.cursor
                    }
                    if (events.length > 0) {
                      console.info(
                        JSON.stringify({
                          metric: 'live_events_delivered',
                          documentId,
                          count: events.length,
                          maximumLatencyMs: Math.max(
                            ...events.map((event) => Date.now() - Date.parse(event.occurredAt)),
                          ),
                        }),
                      )
                    }

                    if (events.length === 100) continue
                    await waitForNextQuery(request.signal)
                  }

                  if (!cancelled && !request.signal.aborted) {
                    send({ type: 'system.rotate', cursor })
                    controller.close()
                  }
                } catch (error) {
                  if (error instanceof DocumentAccessDeniedError) {
                    send({ type: 'system.access-revoked' })
                  } else {
                    console.error(
                      JSON.stringify({ metric: 'live_connection_failed', documentId }),
                      error,
                    )
                  }
                  if (!cancelled) controller.close()
                } finally {
                  activeConnectionCount = Math.max(0, activeConnectionCount - 1)
                  console.info(
                    JSON.stringify({
                      metric: 'live_connection_closed',
                      documentId,
                      durationMs: Date.now() - connectionStartedAt,
                      activeConnectionCount,
                    }),
                  )
                }
              })()
            },
            cancel() {
              cancelled = true
            },
          })

          return new Response(stream, {
            headers: {
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
              'Content-Type': 'text/event-stream; charset=utf-8',
              'X-Accel-Buffering': 'no',
            },
          })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
    },
  },
})
