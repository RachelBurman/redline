import { and, count, desc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { user } from '#/db/auth-schema'
import { db } from '#/db/index'
import { documentBlocks, documentVersions, documents, reviewItems } from '#/db/schema'

import { DocumentNotFoundError } from './get-document'

import type { DocumentVersionSummary } from '#/types/document-versions'

const restoredVersion = alias(documentVersions, 'restored_version')

export async function listDocumentVersions(input: {
  documentId: string
  organizationId: string
}): Promise<DocumentVersionSummary[]> {
  const [document] = await db
    .select({ currentVersionId: documents.currentVersionId })
    .from(documents)
    .where(
      and(eq(documents.id, input.documentId), eq(documents.organizationId, input.organizationId)),
    )
    .limit(1)
  if (!document) throw new DocumentNotFoundError()

  const [versions, blockCounts, reviewRows] = await Promise.all([
    db
      .select({
        id: documentVersions.id,
        versionNumber: documentVersions.versionNumber,
        origin: documentVersions.origin,
        note: documentVersions.note,
        parentVersionId: documentVersions.parentVersionId,
        restoredFromVersionId: restoredVersion.id,
        restoredFromVersionNumber: restoredVersion.versionNumber,
        createdById: user.id,
        createdByName: user.name,
        createdAt: documentVersions.createdAt,
        publishedAt: documentVersions.publishedAt,
      })
      .from(documentVersions)
      .innerJoin(user, eq(documentVersions.createdById, user.id))
      .leftJoin(restoredVersion, eq(documentVersions.restoredFromVersionId, restoredVersion.id))
      .where(
        and(
          eq(documentVersions.documentId, input.documentId),
          eq(documentVersions.status, 'ready'),
        ),
      )
      .orderBy(desc(documentVersions.versionNumber)),
    db
      .select({ documentVersionId: documentBlocks.documentVersionId, blockCount: count() })
      .from(documentBlocks)
      .innerJoin(documentVersions, eq(documentBlocks.documentVersionId, documentVersions.id))
      .where(eq(documentVersions.documentId, input.documentId))
      .groupBy(documentBlocks.documentVersionId),
    db
      .select({ documentVersionId: reviewItems.documentVersionId, status: reviewItems.status })
      .from(reviewItems)
      .where(eq(reviewItems.documentId, input.documentId)),
  ])

  const blockCountByVersion = new Map(
    blockCounts.map((row) => [row.documentVersionId, row.blockCount]),
  )
  const countsByVersion = new Map<string, { accepted: number; unresolved: number }>()
  for (const row of reviewRows) {
    const counts = countsByVersion.get(row.documentVersionId) ?? { accepted: 0, unresolved: 0 }
    if (row.status === 'accepted') counts.accepted += 1
    if (['open', 'under_discussion', 'conflict'].includes(row.status)) counts.unresolved += 1
    countsByVersion.set(row.documentVersionId, counts)
  }

  return versions.map((version) => {
    const reviewCounts = countsByVersion.get(version.id) ?? { accepted: 0, unresolved: 0 }
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      origin: version.origin,
      note: version.note,
      parentVersionId: version.parentVersionId,
      restoredFromVersion:
        version.restoredFromVersionId === null || version.restoredFromVersionNumber === null
          ? null
          : {
              id: version.restoredFromVersionId,
              versionNumber: version.restoredFromVersionNumber,
            },
      createdBy: { id: version.createdById, name: version.createdByName },
      createdAt: version.createdAt.toISOString(),
      publishedAt: version.publishedAt?.toISOString() ?? null,
      isCurrent: version.id === document.currentVersionId,
      blockCount: blockCountByVersion.get(version.id) ?? 0,
      acceptedChangeCount: reviewCounts.accepted,
      unresolvedReviewItemCount: reviewCounts.unresolved,
    }
  })
}
