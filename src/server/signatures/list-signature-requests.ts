import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'

import { user } from '#/db/auth-schema'
import { db } from '#/db/index'
import {
  documentVersions,
  documents,
  reviewAssignments,
  reviewRounds,
  signatureRequests,
  signatureSlots,
} from '#/db/schema'
import { assertDocumentAccess } from '#/server/auth/document-access'

import type { SignatureRequestList, SignatureRequestSummary } from '#/types/signatures'

export async function listSignatureRequests(input: {
  organizationId: string
  role: string
  userId: string
  documentId: string
  documentVersionId: string
}): Promise<SignatureRequestList> {
  await assertDocumentAccess({
    context: input,
    documentId: input.documentId,
    documentVersionId: input.documentVersionId,
  })

  const requestRows = await db
    .select({
      id: signatureRequests.id,
      documentVersionId: signatureRequests.documentVersionId,
      versionNumber: documentVersions.versionNumber,
      reviewRoundId: signatureRequests.reviewRoundId,
      requestedById: signatureRequests.requestedById,
      scope: signatureRequests.scope,
      purpose: signatureRequests.purpose,
      contentSha256: signatureRequests.contentSha256,
      status: signatureRequests.status,
      createdAt: signatureRequests.createdAt,
      completedAt: signatureRequests.completedAt,
      cancelledAt: signatureRequests.cancelledAt,
      supersededAt: signatureRequests.supersededAt,
    })
    .from(signatureRequests)
    .innerJoin(documentVersions, eq(signatureRequests.documentVersionId, documentVersions.id))
    .innerJoin(documents, eq(signatureRequests.documentId, documents.id))
    .where(
      and(
        eq(signatureRequests.documentId, input.documentId),
        eq(signatureRequests.documentVersionId, input.documentVersionId),
        eq(signatureRequests.organizationId, input.organizationId),
        eq(documents.organizationId, input.organizationId),
      ),
    )
    .orderBy(desc(signatureRequests.createdAt))

  const requestIds = requestRows.map((request) => request.id)
  const slotRows =
    requestIds.length === 0
      ? []
      : await db
          .select({
            id: signatureSlots.id,
            signatureRequestId: signatureSlots.signatureRequestId,
            signerId: signatureSlots.signerId,
            status: signatureSlots.status,
            signedAt: signatureSlots.signedAt,
            declinedAt: signatureSlots.declinedAt,
            declineReason: signatureSlots.declineReason,
          })
          .from(signatureSlots)
          .where(inArray(signatureSlots.signatureRequestId, requestIds))
          .orderBy(asc(signatureSlots.createdAt))

  const assignmentRows = await db
    .select({ signerId: reviewAssignments.reviewerId })
    .from(reviewAssignments)
    .innerJoin(reviewRounds, eq(reviewAssignments.reviewRoundId, reviewRounds.id))
    .where(
      and(
        eq(reviewRounds.documentVersionId, input.documentVersionId),
        isNull(reviewAssignments.revokedAt),
      ),
    )

  const userIds = [
    ...new Set([
      ...requestRows.map((request) => request.requestedById),
      ...slotRows.map((slot) => slot.signerId),
      ...assignmentRows.map((assignment) => assignment.signerId),
    ]),
  ]
  const users =
    userIds.length === 0
      ? []
      : await db
          .select({ id: user.id, name: user.name, email: user.email })
          .from(user)
          .where(inArray(user.id, userIds))
          .orderBy(asc(user.name), asc(user.email))
  const usersById = new Map(users.map((entry) => [entry.id, entry]))

  const requests: SignatureRequestSummary[] = requestRows.map((request) => ({
    id: request.id,
    documentVersionId: request.documentVersionId,
    versionNumber: request.versionNumber,
    reviewRoundId: request.reviewRoundId,
    scope: request.scope,
    purpose: request.purpose,
    contentSha256: request.contentSha256,
    status: request.status,
    requestedBy: {
      id: request.requestedById,
      name: usersById.get(request.requestedById)?.name ?? 'Unknown user',
    },
    createdAt: request.createdAt.toISOString(),
    completedAt: request.completedAt?.toISOString() ?? null,
    cancelledAt: request.cancelledAt?.toISOString() ?? null,
    supersededAt: request.supersededAt?.toISOString() ?? null,
    slots: slotRows
      .filter((slot) => slot.signatureRequestId === request.id)
      .map((slot) => ({
        id: slot.id,
        signerId: slot.signerId,
        signerName: usersById.get(slot.signerId)?.name ?? 'Unknown signer',
        status: slot.status,
        signedAt: slot.signedAt?.toISOString() ?? null,
        declinedAt: slot.declinedAt?.toISOString() ?? null,
        declineReason: slot.declineReason,
      })),
  }))

  return {
    requests,
    availableSigners: [...new Set(assignmentRows.map((assignment) => assignment.signerId))]
      .map((signerId) => usersById.get(signerId))
      .filter((entry): entry is { id: string; name: string; email: string } => Boolean(entry)),
  }
}
