import { createHash, randomUUID } from 'node:crypto'

import { desc, eq, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import { auditEvents } from '#/db/schema'

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export interface AuditEventInput {
  organizationId: string
  actorId: string
  eventType: string
  payload?: Record<string, unknown>
  projectId?: string
  documentId?: string
  documentVersionId?: string
  reviewRoundId?: string
  reviewItemId?: string
  requestId?: string
}

export async function appendAuditEvent(tx: DatabaseTransaction, input: AuditEventInput) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.organizationId}))`)

  const [previousEvent] = await tx
    .select({ eventHash: auditEvents.eventHash })
    .from(auditEvents)
    .where(eq(auditEvents.organizationId, input.organizationId))
    .orderBy(desc(auditEvents.sequence))
    .limit(1)

  const id = randomUUID()
  const occurredAt = new Date()
  const payload = input.payload ?? {}
  const previousHash = previousEvent?.eventHash ?? null
  const eventHash = createHash('sha256')
    .update(
      JSON.stringify({
        id,
        organizationId: input.organizationId,
        actorId: input.actorId,
        eventType: input.eventType,
        payload,
        previousHash,
        occurredAt: occurredAt.toISOString(),
      }),
    )
    .digest('hex')

  const [event] = await tx
    .insert(auditEvents)
    .values({
      id,
      organizationId: input.organizationId,
      projectId: input.projectId,
      documentId: input.documentId,
      documentVersionId: input.documentVersionId,
      reviewRoundId: input.reviewRoundId,
      reviewItemId: input.reviewItemId,
      actorId: input.actorId,
      eventType: input.eventType,
      payload,
      requestId: input.requestId,
      previousHash,
      eventHash,
      occurredAt,
    })
    .returning()

  if (!event) {
    throw new Error('The audit event could not be recorded.')
  }

  return event
}
