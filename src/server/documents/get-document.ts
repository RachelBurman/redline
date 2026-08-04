import { and, asc, eq } from 'drizzle-orm'

import { db } from '#/db/index'
import { documentBlocks, documentVersions, documents, reviewRounds } from '#/db/schema'

export class DocumentNotFoundError extends Error {
  constructor() {
    super('The document was not found in this organisation.')
    this.name = 'DocumentNotFoundError'
  }
}

export async function getDocument(input: { documentId: string; organizationId: string }) {
  const [document] = await db
    .select({
      id: documents.id,
      title: documents.title,
      createdAt: documents.createdAt,
      versionId: documentVersions.id,
      versionNumber: documentVersions.versionNumber,
      parserWarnings: documentVersions.parserWarnings,
      versionCreatedAt: documentVersions.createdAt,
    })
    .from(documents)
    .innerJoin(documentVersions, eq(documents.currentVersionId, documentVersions.id))
    .where(
      and(eq(documents.id, input.documentId), eq(documents.organizationId, input.organizationId)),
    )
    .limit(1)

  if (!document) throw new DocumentNotFoundError()

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
      .where(eq(documentBlocks.documentVersionId, document.versionId))
      .orderBy(asc(documentBlocks.ordinal)),
    db
      .select({ id: reviewRounds.id, name: reviewRounds.name })
      .from(reviewRounds)
      .where(eq(reviewRounds.documentVersionId, document.versionId))
      .orderBy(asc(reviewRounds.createdAt))
      .limit(1),
  ])

  const reviewRound = rounds[0]
  if (!reviewRound) throw new Error('The document review round is missing.')

  return {
    document: {
      id: document.id,
      title: document.title,
      createdAt: document.createdAt.toISOString(),
    },
    version: {
      id: document.versionId,
      versionNumber: document.versionNumber,
      parserWarnings: document.parserWarnings,
      createdAt: document.versionCreatedAt.toISOString(),
    },
    reviewRound,
    blocks,
  }
}
