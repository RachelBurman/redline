import { and, eq, inArray, ne, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import { documentBlocks, documents, reviewItems, reviewResolutions } from '#/db/schema'
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
        changeType: reviewItems.changeType,
        proposedContent: reviewItems.proposedContent,
        status: reviewItems.status,
        revision: reviewItems.revision,
        blockText: documentBlocks.text,
        currentVersionId: documents.currentVersionId,
      })
      .from(reviewItems)
      .innerJoin(documents, eq(reviewItems.documentId, documents.id))
      .innerJoin(documentBlocks, eq(reviewItems.targetBlockId, documentBlocks.id))
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
    if (item.startOffset === null || item.endOffset === null) {
      throw new ReviewTargetError('The paragraph proposal is incomplete.')
    }
    if (
      (item.changeType === 'replace' || item.changeType === 'insert') &&
      item.proposedContent === null
    ) {
      throw new ReviewTargetError('The proposal has no proposed text.')
    }
    if (!['replace', 'delete', 'insert'].includes(item.changeType)) {
      throw new ReviewTargetError('This proposal type cannot be resolved by the current workflow.')
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

    if (item.changeType !== 'insert') {
      const [existingAcceptedItem] = await tx
        .select({ id: reviewItems.id })
        .from(reviewItems)
        .where(
          and(
            eq(reviewItems.documentVersionId, item.documentVersionId),
            eq(reviewItems.targetBlockId, item.targetBlockId),
            eq(reviewItems.status, 'accepted'),
            inArray(reviewItems.changeType, ['replace', 'delete']),
            ne(reviewItems.id, item.id),
          ),
        )
        .limit(1)

      if (existingAcceptedItem) {
        throw new ReviewConflictError(
          'This paragraph already has an accepted change awaiting a new version.',
        )
      }
    }

    const conflictedItems =
      item.changeType === 'insert'
        ? []
        : await tx
            .update(reviewItems)
            .set({ status: 'conflict', updatedAt: now })
            .where(
              and(
                eq(reviewItems.documentVersionId, item.documentVersionId),
                eq(reviewItems.targetBlockId, item.targetBlockId),
                ne(reviewItems.id, item.id),
                inArray(reviewItems.changeType, ['replace', 'delete']),
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
    const finalContent = item.changeType === 'delete' ? null : item.proposedContent
    if (item.changeType !== 'delete' && finalContent === null) {
      throw new ReviewTargetError('The proposal has no proposed text.')
    }

    await tx.insert(reviewResolutions).values({
      reviewItemId: item.id,
      decision: 'accept',
      finalContent,
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
      eventType: 'review_item.accepted',
      payload: {
        changeType: item.changeType,
        targetBlockId: item.targetBlockId,
        finalContentHash: finalContent === null ? null : hashText(finalContent),
        deletedContentHash: item.changeType === 'delete' ? item.targetContentHash : null,
        conflictedReviewItemIds: conflictedItems.map((conflict) => conflict.id),
        awaitingVersionCreation: true,
      },
    })

    return {
      reviewItemId: item.id,
      decision: 'accept' as const,
      status: 'accepted' as const,
      documentVersionId: item.documentVersionId,
      reviewRoundId: item.reviewRoundId,
      conflictedReviewItemCount: conflictedItems.length,
    }
  })
}
