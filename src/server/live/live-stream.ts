import type { LiveStreamMessage } from '#/types/live-events'

export const LIVE_ACCESS_RECHECK_MS = 5_000
export const LIVE_CONNECTION_MAX_AGE_MS = 25_000
export const LIVE_EVENT_QUERY_INTERVAL_MS = 1_000

export function parseLiveEventCursor(request: Request) {
  const urlCursor = new URL(request.url).searchParams.get('cursor')
  const rawCursor = urlCursor ?? request.headers.get('last-event-id')
  if (rawCursor === null || rawCursor === '') return null

  const cursor = Number(rawCursor)
  if (!Number.isSafeInteger(cursor) || cursor < 0) return null
  return cursor
}

export function encodeServerSentEvent(message: LiveStreamMessage) {
  const cursor = 'cursor' in message ? message.cursor : undefined
  return `${cursor === undefined ? '' : `id: ${cursor}\n`}data: ${JSON.stringify(message)}\n\n`
}
