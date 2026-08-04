import { randomUUID } from 'node:crypto'

import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import {
  documentBlocks,
  documentVersions,
  documents,
  reviewItems,
  reviewResolutions,
  reviewRounds,
} from '#/db/schema'
import {
  StaleSelectionError,
  assertSelectionAnchorMatches,
  hashText,
} from '#/domain/review/selection-anchor'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanResolveReviewItem } from '#/server/auth/permissions'

import { ReviewConflictError, ReviewTargetError } from './review-errors'

interface ResolutionContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

export async function resolveReviewItem(input: {
  context: ResolutionContext
  documentId: string
  reviewItemId: string
  decision: 'accept' | 'reject'
  expectedRevision: number
}) {
  assertCanResolveReviewItem(input.context.role)

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.documentId}))`)

    const [item] = await tx
      .select({
        id: reviewItems.id,
        documentVersionId: reviewItems.documentVersionId,
        reviewRoundId: reviewItems.reviewRoundId,
        targetBlockId: reviewItems.targetBlockId,
        startOffset: reviewItems.startOffset,
        endOffset: reviewItems.endOffset,
        anchorPrefix: reviewItems.anchorPrefix,
        anchorQuote: reviewItems.anchorQuote,
        anchorSuffix: reviewItems.anchorSuffix,
        targetContentHash: reviewItems.targetContentHash,
        originalContent: reviewItems.originalContent,
        proposedContent: reviewItems.proposedContent,
        status: reviewItems.status,
        revision: reviewItems.revision,
        blockText: documentBlocks.text,
        currentVersionId: documents.currentVersionId,
        currentVersionNumber: documentVersions.versionNumber,
        parserVersion: documentVersions.parserVersion,
        parserWarnings: documentVersions.parserWarnings,
      })
      .from(reviewItems)
      .innerJoin(documents, eq(reviewItems.documentId, documents.id))
      .innerJoin(documentBlocks, eq(reviewItems.targetBlockId, documentBlocks.id))
      .innerJoin(documentVersions, eq(reviewItems.documentVersionId, documentVersions.id))
      .where(
        and(
          eq(reviewItems.id, input.reviewItemId),
          eq(reviewItems.documentId, input.documentId),
          eq(documents.organizationId, input.context.organizationId),
        ),
      )
      .limit(1)
      .for('update')

    if (!item) throw new ReviewTargetError('The review proposal was not found.')
    if (!['open', 'under_discussion'].includes(item.status)) {
      throw new ReviewConflictError('This proposal has already been resolved or superseded.')
    }
    if (item.revision !== input.expectedRevision) throw new ReviewConflictError()

    const now = new Date()

    if (input.decision === 'reject') {
      await tx
        .update(reviewItems)
        .set({
          status: 'rejected',
          revision: item.revision + 1,
          resolvedAt: now,
          updatedAt: now,
        })
        .where(and(eq(reviewItems.id, item.id), eq(reviewItems.revision, item.revision)))
      await tx.insert(reviewResolutions).values({
        reviewItemId: item.id,
        decision: 'reject',
        resolverId: input.context.userId,
        resolvedAt: now,
      })
      await appendAuditEvent(tx, {
        organizationId: input.context.organizationId,
        projectId: input.context.projectId,
        documentId: input.documentId,
        documentVersionId: item.documentVersionId,
        reviewRoundId: item.reviewRoundId,
        reviewItemId: item.id,
        actorId: input.context.userId,
        eventType: 'review_item.rejected',
        payload: { expectedRevision: input.expectedRevision },
      })

      return {
        reviewItemId: item.id,
        decision: 'reject' as const,
        status: 'rejected' as const,
        documentVersionId: item.documentVersionId,
        reviewRoundId: item.reviewRoundId,
        conflictedReviewItemCount: 0,
      }
    }

    if (item.currentVersionId !== item.documentVersionId) {
      throw new ReviewConflictError(
        'This proposal targets an older document version and cannot be accepted automatically.',
      )
    }
    if (item.startOffset === null || item.endOffset === null || item.proposedContent === null) {
      throw new ReviewTargetError('The replacement proposal is incomplete.')
    }

    try {
      assertSelectionAnchorMatches({
        anchor: {
          documentVersionId: item.documentVersionId,
          blockId: item.targetBlockId,
          startOffset: item.startOffset,
          endOffset: item.endOffset,
          offsetEncoding: 'utf16',
          quote: item.anchorQuote,
          prefix: item.anchorPrefix ?? '',
          suffix: item.anchorSuffix ?? '',
          contentHash: item.targetContentHash,
        },
        documentVersionId: item.documentVersionId,
        blockId: item.targetBlockId,
        blockText: item.blockText,
      })
    } catch (error) {
      if (error instanceof StaleSelectionError) {
        throw new ReviewConflictError(
          'The target paragraph no longer matches the stored proposal anchor.',
        )
      }
      throw error
    }

    const sourceBlocks = await tx
      .select({
        id: documentBlocks.id,
        parentBlockId: documentBlocks.parentBlockId,
        stableKey: documentBlocks.stableKey,
        ordinal: documentBlocks.ordinal,
        blockType: documentBlocks.blockType,
        text: documentBlocks.text,
        headingLevel: documentBlocks.headingLevel,
        attributes: documentBlocks.attributes,
      })
      .from(documentBlocks)
      .where(eq(documentBlocks.documentVersionId, item.documentVersionId))
      .orderBy(asc(documentBlocks.ordinal))

    const newVersionId = randomUUID()
    const newReviewRoundId = randomUUID()
    await tx.insert(documentVersions).values({
      id: newVersionId,
      documentId: input.documentId,
      parentVersionId: item.documentVersionId,
      versionNumber: item.currentVersionNumber + 1,
      origin: 'checkpoint',
      status: 'ready',
      parserVersion: item.parserVersion,
      parserWarnings: item.parserWarnings,
      createdById: input.context.userId,
      publishedAt: now,
    })
    await tx.insert(documentBlocks).values(
      sourceBlocks.map((block) => {
        const text = block.id === item.targetBlockId ? item.proposedContent! : block.text
        return {
          documentVersionId: newVersionId,
          stableKey: block.stableKey,
          ordinal: block.ordinal,
          blockType: block.blockType,
          text,
          headingLevel: block.headingLevel,
          contentHash: hashText(text),
          attributes: block.attributes,
        }
      }),
    )

    const conflictedItems = await tx
      .update(reviewItems)
      .set({ status: 'conflict', updatedAt: now })
      .where(
        and(
          eq(reviewItems.documentVersionId, item.documentVersionId),
          ne(reviewItems.id, item.id),
          inArray(reviewItems.status, ['open', 'under_discussion']),
        ),
      )
      .returning({ id: reviewItems.id })
    await tx
      .update(reviewItems)
      .set({
        status: 'accepted',
        revision: item.revision + 1,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(and(eq(reviewItems.id, item.id), eq(reviewItems.revision, item.revision)))
    await tx.insert(reviewResolutions).values({
      reviewItemId: item.id,
      decision: 'accept',
      finalContent: item.proposedContent,
      resolverId: input.context.userId,
      resolvedAt: now,
    })
    await tx
      .update(reviewRounds)
      .set({ status: 'completed', completedById: input.context.userId, completedAt: now })
      .where(eq(reviewRounds.id, item.reviewRoundId))
    await tx.insert(reviewRounds).values({
      id: newReviewRoundId,
      documentId: input.documentId,
      documentVersionId: newVersionId,
      name: `Review round ${item.currentVersionNumber + 1}`,
      createdById: input.context.userId,
    })
    await tx
      .update(documents)
      .set({ currentVersionId: newVersionId, updatedAt: now })
      .where(eq(documents.id, input.documentId))
    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: newVersionId,
      reviewRoundId: item.reviewRoundId,
      reviewItemId: item.id,
      actorId: input.context.userId,
      eventType: 'review_item.accepted',
      payload: {
        sourceDocumentVersionId: item.documentVersionId,
        resolvedDocumentVersionId: newVersionId,
        targetBlockId: item.targetBlockId,
        finalContentHash: hashText(item.proposedContent),
        conflictedReviewItemIds: conflictedItems.map((conflict) => conflict.id),
      },
    })

    return {
      reviewItemId: item.id,
      decision: 'accept' as const,
      status: 'accepted' as const,
      documentVersionId: newVersionId,
      reviewRoundId: newReviewRoundId,
      conflictedReviewItemCount: conflictedItems.length,
    }
  })
}
