import { createHash, randomUUID } from 'node:crypto'

import { and, eq, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import { documents, reviewComments, reviewItems } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanCommentOnReviewItem } from '#/server/auth/permissions'

import { ReviewTargetError } from './review-errors'

import type { CreateReviewCommentInput, ReviewCommentSummary } from '#/types/reviews'

interface CommentContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
  userName: string
}

export async function createReviewComment(input: {
  context: CommentContext
  documentId: string
  reviewItemId: string
  comment: CreateReviewCommentInput
}): Promise<ReviewCommentSummary> {
  assertCanCommentOnReviewItem(input.context.role)

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.documentId}))`)

    const [reviewItem] = await tx
      .select({
        id: reviewItems.id,
        documentVersionId: reviewItems.documentVersionId,
        reviewRoundId: reviewItems.reviewRoundId,
        status: reviewItems.status,
        revision: reviewItems.revision,
      })
      .from(reviewItems)
      .innerJoin(documents, eq(reviewItems.documentId, documents.id))
      .where(
        and(
          eq(reviewItems.id, input.reviewItemId),
          eq(reviewItems.documentId, input.documentId),
          eq(documents.organizationId, input.context.organizationId),
        ),
      )
      .limit(1)
      .for('update')

    if (!reviewItem) throw new ReviewTargetError('The review proposal was not found.')

    const now = new Date()
    const commentId = randomUUID()
    const [comment] = await tx
      .insert(reviewComments)
      .values({
        id: commentId,
        reviewItemId: reviewItem.id,
        authorId: input.context.userId,
        body: input.comment.body,
        createdAt: now,
      })
      .returning()

    if (!comment) throw new Error('The review comment could not be created.')

    if (reviewItem.status === 'open') {
      await tx
        .update(reviewItems)
        .set({
          status: 'under_discussion',
          revision: reviewItem.revision + 1,
          updatedAt: now,
        })
        .where(
          and(eq(reviewItems.id, reviewItem.id), eq(reviewItems.revision, reviewItem.revision)),
        )
    }

    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: reviewItem.documentVersionId,
      reviewRoundId: reviewItem.reviewRoundId,
      reviewItemId: reviewItem.id,
      actorId: input.context.userId,
      eventType: 'review_comment.created',
      payload: {
        commentId,
        parentCommentId: null,
        bodyLength: input.comment.body.length,
        bodyHash: createHash('sha256').update(input.comment.body, 'utf8').digest('hex'),
      },
    })

    return {
      id: comment.id,
      reviewItemId: comment.reviewItemId,
      parentCommentId: comment.parentCommentId,
      body: comment.body,
      author: { id: input.context.userId, name: input.context.userName },
      createdAt: comment.createdAt.toISOString(),
      editedAt: comment.editedAt?.toISOString() ?? null,
    }
  })
}
