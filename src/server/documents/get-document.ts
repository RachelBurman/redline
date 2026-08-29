import { and, asc, eq } from 'drizzle-orm'

import { db } from '#/db/index'
import {
  documentBlocks,
  documentVersions,
  documents,
  reviewItems,
  reviewResolutions,
  reviewRounds,
} from '#/db/schema'
import { applyBlockChanges } from '#/domain/documents/apply-block-changes'

import type { AcceptedBlockChange } from '#/domain/documents/apply-block-changes'

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
      versionOrigin: documentVersions.origin,
      versionNote: documentVersions.note,
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

  const [blocks, rounds, acceptedReplacements] = await Promise.all([
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
    db
      .select({
        targetBlockId: reviewItems.targetBlockId,
        changeType: reviewItems.changeType,
        finalContent: reviewResolutions.finalContent,
      })
      .from(reviewItems)
      .innerJoin(reviewResolutions, eq(reviewResolutions.reviewItemId, reviewItems.id))
      .where(
        and(
          eq(reviewItems.documentVersionId, document.versionId),
          eq(reviewItems.status, 'accepted'),
          eq(reviewResolutions.decision, 'accept'),
        ),
      ),
  ])

  const reviewRound = rounds[0]
  if (!reviewRound) throw new Error('The document review round is missing.')

  const acceptedChanges: AcceptedBlockChange[] = []
  for (const replacement of acceptedReplacements) {
    if (replacement.changeType === 'delete') {
      acceptedChanges.push({
        changeType: 'delete',
        targetBlockId: replacement.targetBlockId,
        finalContent: null,
      })
    } else if (replacement.changeType === 'replace' && replacement.finalContent !== null) {
      acceptedChanges.push({
        changeType: 'replace',
        targetBlockId: replacement.targetBlockId,
        finalContent: replacement.finalContent,
      })
    }
  }

  return {
    document: {
      id: document.id,
      title: document.title,
      createdAt: document.createdAt.toISOString(),
    },
    version: {
      id: document.versionId,
      versionNumber: document.versionNumber,
      origin: document.versionOrigin,
      note: document.versionNote,
      isCurrent: true,
      parserWarnings: document.parserWarnings,
      createdAt: document.versionCreatedAt.toISOString(),
    },
    reviewRound,
    blocks: applyBlockChanges(blocks, acceptedChanges),
  }
}
