import { and, asc, count, eq, isNull } from 'drizzle-orm'

import { db } from '#/db/index'
import { documentBlocks, documentVersions, documents } from '#/db/schema'

export async function listDocuments(input: { organizationId: string; projectId: string }) {
  const rows = await db
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
