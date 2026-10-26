import { and, eq, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import { documents, signatureRequests, signatureSlots } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'

import {
  SignatureRequestConflictError,
  SignatureRequestNotFoundError,
  SignatureSlotNotFoundError,
} from './signature-errors'

export async function declineSignatureRequest(input: {
  context: { organizationId: string; projectId: string; userId: string }
  documentId: string
  signatureRequestId: string
  reason: string
}) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.signatureRequestId}))`)
    const [target] = await tx
      .select({
        requestId: signatureRequests.id,
        requestStatus: signatureRequests.status,
        documentVersionId: signatureRequests.documentVersionId,
        reviewRoundId: signatureRequests.reviewRoundId,
        slotId: signatureSlots.id,
        slotStatus: signatureSlots.status,
      })
      .from(signatureRequests)
      .innerJoin(documents, eq(signatureRequests.documentId, documents.id))
      .leftJoin(
        signatureSlots,
        and(
          eq(signatureSlots.signatureRequestId, signatureRequests.id),
          eq(signatureSlots.signerId, input.context.userId),
        ),
      )
      .where(
        and(
          eq(signatureRequests.id, input.signatureRequestId),
          eq(signatureRequests.documentId, input.documentId),
          eq(signatureRequests.organizationId, input.context.organizationId),
        ),
      )
      .limit(1)
    if (!target) throw new SignatureRequestNotFoundError()
    if (!target.slotId || !target.slotStatus) throw new SignatureSlotNotFoundError()
    if (target.slotStatus === 'declined') {
      return { signatureRequestId: target.requestId, status: 'declined' as const, repeated: true }
    }
    if (target.slotStatus !== 'pending' || target.requestStatus !== 'pending') {
      throw new SignatureRequestConflictError()
    }

    const declinedAt = new Date()
    await tx
      .update(signatureSlots)
      .set({ status: 'declined', declinedAt, declineReason: input.reason })
      .where(and(eq(signatureSlots.id, target.slotId), eq(signatureSlots.status, 'pending')))
    await tx
      .update(signatureRequests)
      .set({ status: 'declined' })
      .where(eq(signatureRequests.id, target.requestId))
    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: target.documentVersionId,
      reviewRoundId: target.reviewRoundId,
      actorId: input.context.userId,
      eventType: 'signature.declined',
      requestId: target.requestId,
      payload: {
        signatureRequestId: target.requestId,
        signatureSlotId: target.slotId,
        signerId: input.context.userId,
        reason: input.reason,
        outcome: 'declined',
      },
    })

    return {
      signatureRequestId: target.requestId,
      status: 'declined' as const,
      declinedAt: declinedAt.toISOString(),
      repeated: false,
    }
  })
}
