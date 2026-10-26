import { and, asc, eq, gt, max } from 'drizzle-orm'

import { db } from '#/db/index'
import { liveEvents } from '#/db/schema'

import type { LiveEvent } from '#/types/live-events'

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export interface AppendLiveEventInput {
  organizationId: string
  documentId: string
  actorId: string
  eventType: string
  documentVersionId?: string
  reviewRoundId?: string
  reviewItemId?: string
}

const BROADCAST_AUDIT_EVENTS = new Set([
  'document.version_created',
  'document.version_restored',
  'media_asset.proposal_created',
  'review_assignment.created',
  'review_assignment.revoked',
  'review_comment.created',
  'review_item.accepted',
  'review_item.created',
  'review_item.rejected',
  'signature.declined',
  'signature.signed',
  'signature_request.cancelled',
  'signature_request.completed',
  'signature_request.created',
  'signature_request.superseded',
])

export function isBroadcastAuditEvent(input: {
  documentId?: string
  eventType: string
}): input is { documentId: string; eventType: string } {
  return Boolean(input.documentId && BROADCAST_AUDIT_EVENTS.has(input.eventType))
}

export async function appendLiveEvent(tx: DatabaseTransaction, input: AppendLiveEventInput) {
  const [event] = await tx
    .insert(liveEvents)
    .values({
      organizationId: input.organizationId,
      documentId: input.documentId,
      documentVersionId: input.documentVersionId,
      reviewRoundId: input.reviewRoundId,
      reviewItemId: input.reviewItemId,
      actorId: input.actorId,
      eventType: input.eventType,
    })
    .returning()

  if (!event) throw new Error('The live event could not be recorded.')
  return toLiveEvent(event)
}

export async function getLatestLiveEventCursor() {
  const [row] = await db.select({ cursor: max(liveEvents.sequence) }).from(liveEvents)
  return row?.cursor ?? 0
}

export async function listLiveEvents(input: {
  organizationId: string
  documentId: string
  after: number
  limit?: number
}) {
  const rows = await db
    .select()
    .from(liveEvents)
    .where(
      and(
        eq(liveEvents.organizationId, input.organizationId),
        eq(liveEvents.documentId, input.documentId),
        gt(liveEvents.sequence, input.after),
      ),
    )
    .orderBy(asc(liveEvents.sequence))
    .limit(input.limit ?? 100)

  return rows.map(toLiveEvent)
}

function toLiveEvent(event: typeof liveEvents.$inferSelect): LiveEvent {
  return {
    id: event.id,
    cursor: event.sequence,
    organizationId: event.organizationId,
    documentId: event.documentId,
    documentVersionId: event.documentVersionId,
    reviewRoundId: event.reviewRoundId,
    reviewItemId: event.reviewItemId,
    actorId: event.actorId,
    type: event.eventType,
    occurredAt: event.occurredAt.toISOString(),
  }
}
