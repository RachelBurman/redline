import { and, asc, count, eq, isNull } from 'drizzle-orm'

import { db } from '#/db/index'
import {
  documentBlocks,
  documentVersions,
  documents,
  reviewAssignments,
  reviewRounds,
} from '#/db/schema'
import { hasOrganizationWideDocumentAccess } from '#/server/auth/permissions'

export async function listDocuments(input: {
  organizationId: string
  projectId: string
  role: string
  userId: string
}) {
  const baseQuery = db
    .select({
      id: documents.id,
      title: documents.title,
      versionId: documentVersions.id,
      versionNumber: documentVersions.versionNumber,
      blockCount: count(documentBlocks.id),
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(documentVersions, eq(documents.currentVersionId, documentVersions.id))

  const accessibleQuery = hasOrganizationWideDocumentAccess(input.role)
    ? baseQuery
    : baseQuery
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
            eq(reviewAssignments.reviewerId, input.userId),
            isNull(reviewAssignments.revokedAt),
          ),
        )

  const rows = await accessibleQuery
    .leftJoin(documentBlocks, eq(documentBlocks.documentVersionId, documentVersions.id))
    .where(
      and(
        eq(documents.organizationId, input.organizationId),
        eq(documents.projectId, input.projectId),
        isNull(documents.archivedAt),
      ),
    )
    .groupBy(
      documents.id,
      documents.title,
      documentVersions.id,
      documentVersions.versionNumber,
      documents.createdAt,
    )
    .orderBy(asc(documents.createdAt))

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    versionId: row.versionId,
    versionNumber: row.versionNumber,
    blockCount: row.blockCount,
    createdAt: row.createdAt.toISOString(),
  }))
}
