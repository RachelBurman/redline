import { and, eq, isNull } from 'drizzle-orm'

import { db } from '#/db/index'
import { documentVersions, documents, reviewAssignments, reviewRounds } from '#/db/schema'

import { hasOrganizationWideDocumentAccess } from './permissions'

export class DocumentAccessDeniedError extends Error {
  constructor() {
    super('The document was not found or has not been assigned to you.')
    this.name = 'DocumentAccessDeniedError'
  }
}

export interface DocumentAccessContext {
  organizationId: string
  role: string
  userId: string
}

export async function assertDocumentAccess(input: {
  context: DocumentAccessContext
  documentId: string
  documentVersionId?: string
}) {
  if (hasOrganizationWideDocumentAccess(input.context.role)) return

  const [assignment] = await db
    .select({ id: reviewAssignments.id })
    .from(documents)
    .innerJoin(
      documentVersions,
      input.documentVersionId
        ? and(
            eq(documentVersions.id, input.documentVersionId),
            eq(documentVersions.documentId, documents.id),
          )
        : eq(documentVersions.id, documents.currentVersionId),
    )
    .innerJoin(
      reviewRounds,
      and(
        eq(reviewRounds.documentId, documents.id),
        eq(reviewRounds.documentVersionId, documentVersions.id),
      ),
    )
    .innerJoin(
      reviewAssignments,
      and(
        eq(reviewAssignments.reviewRoundId, reviewRounds.id),
        eq(reviewAssignments.reviewerId, input.context.userId),
        isNull(reviewAssignments.revokedAt),
      ),
    )
    .where(
      and(
        eq(documents.id, input.documentId),
        eq(documents.organizationId, input.context.organizationId),
        isNull(documents.archivedAt),
      ),
    )
    .limit(1)

  if (!assignment) throw new DocumentAccessDeniedError()
}

export async function listAccessibleDocumentVersionIds(input: {
  context: DocumentAccessContext
  documentId: string
}) {
  if (hasOrganizationWideDocumentAccess(input.context.role)) return null

  const rows = await db
    .select({ documentVersionId: reviewRounds.documentVersionId })
    .from(reviewRounds)
    .innerJoin(documents, eq(reviewRounds.documentId, documents.id))
    .innerJoin(
      reviewAssignments,
      and(
        eq(reviewAssignments.reviewRoundId, reviewRounds.id),
        eq(reviewAssignments.reviewerId, input.context.userId),
        isNull(reviewAssignments.revokedAt),
      ),
    )
    .where(
      and(
        eq(documents.id, input.documentId),
        eq(documents.organizationId, input.context.organizationId),
        isNull(documents.archivedAt),
      ),
    )

  return new Set(rows.map((row) => row.documentVersionId))
}
