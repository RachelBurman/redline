import { and, desc, eq } from 'drizzle-orm'

import { user } from '#/db/auth-schema'
import { db } from '#/db/index'
import { documentBlocks, documents, reviewItems } from '#/db/schema'
import {
  assertDocumentAccess,
  listAccessibleDocumentVersionIds,
} from '#/server/auth/document-access'

import type { ReviewCategory, ReviewPriority } from '#/domain/review/review-options'
import type { ReviewItemStatus, ReviewItemSummary } from '#/types/reviews'

export async function listReviewItems(input: {
  documentId: string
  organizationId: string
  role: string
  userId: string
}): Promise<ReviewItemSummary[]> {
  const [, accessibleVersionIds, rows] = await Promise.all([
    assertDocumentAccess({ context: input, documentId: input.documentId }),
    listAccessibleDocumentVersionIds({
      context: input,
      documentId: input.documentId,
    }),
    db
      .select({
        id: reviewItems.id,
        documentVersionId: reviewItems.documentVersionId,
        reviewRoundId: reviewItems.reviewRoundId,
        targetBlockId: reviewItems.targetBlockId,
        targetStableKey: documentBlocks.stableKey,
        changeType: reviewItems.changeType,
        originalContent: reviewItems.originalContent,
        proposedContent: reviewItems.proposedContent,
        proposedMedia: reviewItems.proposedMedia,
        category: reviewItems.category,
        priority: reviewItems.priority,
        rationale: reviewItems.rationale,
        status: reviewItems.status,
        revision: reviewItems.revision,
        authorId: user.id,
        authorName: user.name,
        createdAt: reviewItems.createdAt,
        resolvedAt: reviewItems.resolvedAt,
      })
      .from(reviewItems)
      .innerJoin(documents, eq(reviewItems.documentId, documents.id))
      .innerJoin(documentBlocks, eq(reviewItems.targetBlockId, documentBlocks.id))
      .innerJoin(user, eq(reviewItems.authorId, user.id))
      .where(
        and(
          eq(reviewItems.documentId, input.documentId),
          eq(documents.organizationId, input.organizationId),
        ),
      )
      .orderBy(desc(reviewItems.createdAt)),
  ])

  const summaries: ReviewItemSummary[] = []
  for (const row of rows) {
    if (accessibleVersionIds !== null && !accessibleVersionIds.has(row.documentVersionId)) continue
    summaries.push({
      id: row.id,
      documentVersionId: row.documentVersionId,
      reviewRoundId: row.reviewRoundId,
      targetBlockId: row.targetBlockId,
      targetStableKey: row.targetStableKey,
      changeType: row.changeType as ReviewItemSummary['changeType'],
      originalContent: row.originalContent,
      proposedContent: row.proposedContent,
      proposedMedia: row.proposedMedia as ReviewItemSummary['proposedMedia'],
      category: row.category as ReviewCategory,
      priority: row.priority as ReviewPriority,
      rationale: row.rationale,
      status: row.status as ReviewItemStatus,
      revision: row.revision,
      author: { id: row.authorId, name: row.authorName },
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    })
  }
  return summaries
}
