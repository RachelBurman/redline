import { and, asc, eq } from 'drizzle-orm'

import { db } from '#/db/index'
import { documentBlocks, documentVersions, documents, reviewRounds } from '#/db/schema'

import { DocumentVersionNotFoundError } from './version-errors'

import type { DocumentDetail } from '#/types/documents'

export async function getDocumentVersion(input: {
  documentId: string
  documentVersionId: string
  organizationId: string
}): Promise<DocumentDetail> {
  const [version] = await db
    .select({
      documentId: documents.id,
      documentTitle: documents.title,
      documentCreatedAt: documents.createdAt,
      currentVersionId: documents.currentVersionId,
      versionId: documentVersions.id,
      versionNumber: documentVersions.versionNumber,
      versionOrigin: documentVersions.origin,
      versionNote: documentVersions.note,
      parserWarnings: documentVersions.parserWarnings,
      versionCreatedAt: documentVersions.createdAt,
    })
    .from(documentVersions)
    .innerJoin(documents, eq(documentVersions.documentId, documents.id))
    .where(
      and(
        eq(documentVersions.id, input.documentVersionId),
        eq(documentVersions.documentId, input.documentId),
        eq(documentVersions.status, 'ready'),
        eq(documents.organizationId, input.organizationId),
      ),
    )
    .limit(1)
  if (!version) throw new DocumentVersionNotFoundError()

  const [blocks, rounds] = await Promise.all([
    db
      .select({
        id: documentBlocks.id,
        stableKey: documentBlocks.stableKey,
        ordinal: documentBlocks.ordinal,
        blockType: documentBlocks.blockType,
        text: documentBlocks.text,
        headingLevel: documentBlocks.headingLevel,
        contentHash: documentBlocks.contentHash,
      })
      .from(documentBlocks)
      .where(eq(documentBlocks.documentVersionId, version.versionId))
      .orderBy(asc(documentBlocks.ordinal)),
    db
      .select({ id: reviewRounds.id, name: reviewRounds.name })
      .from(reviewRounds)
      .where(eq(reviewRounds.documentVersionId, version.versionId))
      .orderBy(asc(reviewRounds.createdAt))
      .limit(1),
  ])

  const reviewRound = rounds[0]
  if (!reviewRound) throw new Error('The document review round is missing.')

  return {
    document: {
      id: version.documentId,
      title: version.documentTitle,
      createdAt: version.documentCreatedAt.toISOString(),
    },
    version: {
      id: version.versionId,
      versionNumber: version.versionNumber,
      origin: version.versionOrigin,
      note: version.versionNote,
      isCurrent: version.currentVersionId === version.versionId,
      parserWarnings: version.parserWarnings,
      createdAt: version.versionCreatedAt.toISOString(),
    },
    reviewRound,
    insertionAnchor:
      blocks.length === 0
        ? null
        : {
            blockId: blocks.at(-1)!.id,
            stableKey: blocks.at(-1)!.stableKey,
          },
    blocks,
  }
}
