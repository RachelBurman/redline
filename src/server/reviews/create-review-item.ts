import { randomUUID } from 'node:crypto'

import { and, eq, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import { documentBlocks, documents, reviewItems, reviewRounds } from '#/db/schema'
import { createTextSelectionAnchor } from '#/domain/review/selection-anchor'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanReviewDocument } from '#/server/auth/permissions'

import { ReviewTargetError } from './review-errors'

import type { CreateReviewItemInput } from '#/types/reviews'

interface ReviewContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

export async function createReviewItem(input: {
  context: ReviewContext
  documentId: string
  review: CreateReviewItemInput
}) {
  assertCanReviewDocument(input.context.role)

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.documentId}))`)

    const [target] = await tx
      .select({
        documentVersionId: documentBlocks.documentVersionId,
        blockId: documentBlocks.id,
        blockType: documentBlocks.blockType,
        blockText: documentBlocks.text,
        currentVersionId: documents.currentVersionId,
        reviewRoundStatus: reviewRounds.status,
      })
      .from(documents)
      .innerJoin(
        documentBlocks,
        and(
          eq(documentBlocks.id, input.review.targetBlockId),
          eq(documentBlocks.documentVersionId, input.review.documentVersionId),
        ),
      )
      .innerJoin(
        reviewRounds,
        and(
          eq(reviewRounds.id, input.review.reviewRoundId),
          eq(reviewRounds.documentId, documents.id),
          eq(reviewRounds.documentVersionId, input.review.documentVersionId),
        ),
      )
      .where(
        and(
          eq(documents.id, input.documentId),
          eq(documents.organizationId, input.context.organizationId),
        ),
      )
      .limit(1)

    if (!target) {
      throw new ReviewTargetError('The selected paragraph does not belong to this review round.')
    }
    if (target.currentVersionId !== input.review.documentVersionId) {
      throw new ReviewTargetError(
        'This document version is no longer current. Refresh before proposing a change.',
      )
    }
    if (target.reviewRoundStatus !== 'open') {
      throw new ReviewTargetError('This review round is already complete.')
    }
    if (target.blockType !== 'paragraph') {
      throw new ReviewTargetError('The first review slice supports paragraph replacements only.')
    }
    if (target.blockText === input.review.proposedContent) {
      throw new ReviewTargetError('Replacement text must differ from the original paragraph.')
    }

    const anchor = createTextSelectionAnchor({
      documentVersionId: target.documentVersionId,
      blockId: target.blockId,
      blockText: target.blockText,
      startOffset: 0,
      endOffset: target.blockText.length,
    })
    const reviewItemId = randomUUID()
    const [reviewItem] = await tx
      .insert(reviewItems)
      .values({
        id: reviewItemId,
        documentId: input.documentId,
        documentVersionId: input.review.documentVersionId,
        reviewRoundId: input.review.reviewRoundId,
        targetBlockId: input.review.targetBlockId,
        authorId: input.context.userId,
        startOffset: anchor.startOffset,
        endOffset: anchor.endOffset,
        offsetEncoding: anchor.offsetEncoding,
        anchorPrefix: anchor.prefix,
        anchorQuote: anchor.quote,
        anchorSuffix: anchor.suffix,
        targetContentHash: anchor.contentHash,
        originalContent: target.blockText,
        proposedContent: input.review.proposedContent,
        changeType: 'replace',
        category: input.review.category,
        priority: input.review.priority,
        rationale: input.review.rationale,
      })
      .returning()

    if (!reviewItem) throw new Error('The review proposal could not be created.')

    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: input.review.documentVersionId,
      reviewRoundId: input.review.reviewRoundId,
      reviewItemId,
      actorId: input.context.userId,
      eventType: 'review_item.created',
      payload: {
        changeType: 'replace',
        category: input.review.category,
        priority: input.review.priority,
        targetBlockId: input.review.targetBlockId,
        targetContentHash: anchor.contentHash,
      },
    })

    return reviewItem
  })
}
