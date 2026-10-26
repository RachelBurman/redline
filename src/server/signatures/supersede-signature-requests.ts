import { and, eq } from 'drizzle-orm'

import { signatureRequests } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'

import type { db } from '#/db/index'

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function supersedePendingSignatureRequests(
  tx: DatabaseTransaction,
  input: {
    organizationId: string
    projectId: string
    documentId: string
    previousDocumentVersionId: string
    newDocumentVersionId: string
    reviewRoundId: string
    actorId: string
  },
) {
  const supersededAt = new Date()
  const requests = await tx
    .update(signatureRequests)
    .set({
      status: 'superseded',
      supersededAt,
      supersededByVersionId: input.newDocumentVersionId,
    })
    .where(
      and(
        eq(signatureRequests.documentId, input.documentId),
        eq(signatureRequests.documentVersionId, input.previousDocumentVersionId),
        eq(signatureRequests.status, 'pending'),
      ),
    )
    .returning({ id: signatureRequests.id })

  async function appendSupersessionEvent(index: number): Promise<void> {
    const request = requests[index]
    if (!request) return
    await appendAuditEvent(tx, {
      organizationId: input.organizationId,
      projectId: input.projectId,
      documentId: input.documentId,
      documentVersionId: input.previousDocumentVersionId,
      reviewRoundId: input.reviewRoundId,
      actorId: input.actorId,
      eventType: 'signature_request.superseded',
      requestId: request.id,
      payload: {
        signatureRequestId: request.id,
        supersededByDocumentVersionId: input.newDocumentVersionId,
      },
    })
    await appendSupersessionEvent(index + 1)
  }
  await appendSupersessionEvent(0)

  return requests.map((request) => request.id)
}
