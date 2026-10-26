import { and, eq, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import { signatureRequests } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanManageSignatureRequests } from '#/server/auth/permissions'

import { SignatureRequestConflictError, SignatureRequestNotFoundError } from './signature-errors'

export async function cancelSignatureRequest(input: {
  context: { organizationId: string; projectId: string; role: string; userId: string }
  documentId: string
  signatureRequestId: string
}) {
  assertCanManageSignatureRequests(input.context.role)

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.signatureRequestId}))`)
    const [request] = await tx
      .select()
      .from(signatureRequests)
      .where(
        and(
          eq(signatureRequests.id, input.signatureRequestId),
          eq(signatureRequests.documentId, input.documentId),
          eq(signatureRequests.organizationId, input.context.organizationId),
        ),
      )
      .limit(1)
      .for('update')
    if (!request) throw new SignatureRequestNotFoundError()
    if (request.status === 'cancelled') {
      return { signatureRequestId: request.id, status: 'cancelled' as const, repeated: true }
    }
    if (request.status !== 'pending') throw new SignatureRequestConflictError()

    const cancelledAt = new Date()
    await tx
      .update(signatureRequests)
      .set({ status: 'cancelled', cancelledAt, cancelledById: input.context.userId })
      .where(eq(signatureRequests.id, request.id))
    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: request.documentVersionId,
      reviewRoundId: request.reviewRoundId,
      actorId: input.context.userId,
      eventType: 'signature_request.cancelled',
      requestId: request.id,
      payload: { signatureRequestId: request.id },
    })

    return {
      signatureRequestId: request.id,
      status: 'cancelled' as const,
      cancelledAt: cancelledAt.toISOString(),
      repeated: false,
    }
  })
}
