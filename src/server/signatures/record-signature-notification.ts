import { db } from '#/db/index'
import { appendAuditEvent } from '#/server/audit/append-audit-event'

export async function recordSignatureNotification(input: {
  organizationId: string
  projectId: string
  documentId: string
  documentVersionId: string
  reviewRoundId: string
  actorId: string
  signatureRequestId: string
  signerId: string
  outcome: 'sent' | 'failed'
}) {
  await db.transaction((tx) =>
    appendAuditEvent(tx, {
      organizationId: input.organizationId,
      projectId: input.projectId,
      documentId: input.documentId,
      documentVersionId: input.documentVersionId,
      reviewRoundId: input.reviewRoundId,
      actorId: input.actorId,
      eventType: `signature_notification.${input.outcome}`,
      requestId: input.signatureRequestId,
      payload: {
        signatureRequestId: input.signatureRequestId,
        signerId: input.signerId,
        channel: 'email',
        outcome: input.outcome,
      },
    }),
  )
}
