import { and, asc, eq } from 'drizzle-orm'

import { user } from '#/db/auth-schema'
import { db } from '#/db/index'
import { documents, reviewComments, reviewItems } from '#/db/schema'

import { ReviewItemNotFoundError } from './review-errors'

import type { ReviewCommentSummary } from '#/types/reviews'

interface ReviewCommentRow {
  id: string
  reviewItemId: string
  parentCommentId: string | null
  body: string
  authorId: string
  authorName: string
  createdAt: Date
  editedAt: Date | null
}

export function mapReviewCommentRow(row: ReviewCommentRow): ReviewCommentSummary {
  return {
    id: row.id,
    reviewItemId: row.reviewItemId,
    parentCommentId: row.parentCommentId,
    body: row.body,
    author: { id: row.authorId, name: row.authorName },
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
  }
}

export async function listReviewComments(input: {
  documentId: string
  reviewItemId: string
  organizationId: string
}): Promise<ReviewCommentSummary[]> {
  const [reviewItem] = await db
    .select({ id: reviewItems.id })
    .from(reviewItems)
    .innerJoin(documents, eq(reviewItems.documentId, documents.id))
    .where(
      and(
        eq(reviewItems.id, input.reviewItemId),
        eq(reviewItems.documentId, input.documentId),
        eq(documents.organizationId, input.organizationId),
      ),
    )
    .limit(1)

  if (!reviewItem) throw new ReviewItemNotFoundError()

  const rows = await db
    .select({
      id: reviewComments.id,
      reviewItemId: reviewComments.reviewItemId,
      parentCommentId: reviewComments.parentCommentId,
      body: reviewComments.body,
      authorId: user.id,
      authorName: user.name,
      createdAt: reviewComments.createdAt,
      editedAt: reviewComments.editedAt,
    })
    .from(reviewComments)
    .innerJoin(user, eq(reviewComments.authorId, user.id))
    .where(eq(reviewComments.reviewItemId, reviewItem.id))
    .orderBy(asc(reviewComments.createdAt), asc(reviewComments.id))

  return rows.map(mapReviewCommentRow)
}
