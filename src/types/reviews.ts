import type { ReviewCategory, ReviewPriority } from '#/domain/review/review-options'

export type ReviewItemStatus =
  | 'open'
  | 'under_discussion'
  | 'accepted'
  | 'rejected'
  | 'superseded'
  | 'conflict'
  | 'resolved'

export interface ReviewItemSummary {
  id: string
  documentVersionId: string
  reviewRoundId: string
  targetBlockId: string
  targetStableKey: string
  originalContent: string
  proposedContent: string | null
  category: ReviewCategory
  priority: ReviewPriority
  rationale: string
  status: ReviewItemStatus
  revision: number
  author: {
    id: string
    name: string
  }
  createdAt: string
  resolvedAt: string | null
}

export interface CreateReviewItemInput {
  documentVersionId: string
  reviewRoundId: string
  targetBlockId: string
  proposedContent: string
  category: ReviewCategory
  priority: ReviewPriority
  rationale: string
}

export interface ResolveReviewItemResult {
  reviewItemId: string
  decision: 'accept' | 'reject'
  status: 'accepted' | 'rejected'
  documentVersionId: string
  reviewRoundId: string
  conflictedReviewItemCount: number
}
