import type { ReviewCategory, ReviewPriority } from '#/domain/review/review-options'

export type ReviewItemStatus =
  | 'open'
  | 'under_discussion'
  | 'accepted'
  | 'rejected'
  | 'superseded'
  | 'conflict'
  | 'resolved'

export type ReviewChangeType = 'replace' | 'delete' | 'insert'

export interface ReviewItemSummary {
  id: string
  documentVersionId: string
  reviewRoundId: string
  targetBlockId: string
  targetStableKey: string
  changeType: ReviewChangeType
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

interface CreateReviewItemBase {
  documentVersionId: string
  reviewRoundId: string
  targetBlockId: string
  category: ReviewCategory
  priority: ReviewPriority
  rationale: string
}

export type CreateReviewItemInput = CreateReviewItemBase &
  (
    | { changeType: 'replace'; proposedContent: string }
    | { changeType: 'delete'; proposedContent: null }
    | { changeType: 'insert'; proposedContent: string }
  )

export interface ResolveReviewItemResult {
  reviewItemId: string
  decision: 'accept' | 'reject'
  status: 'accepted' | 'rejected'
  documentVersionId: string
  reviewRoundId: string
  conflictedReviewItemCount: number
}

export interface CreateReviewCommentInput {
  body: string
}

export interface ReviewCommentSummary {
  id: string
  reviewItemId: string
  parentCommentId: string | null
  body: string
  author: {
    id: string
    name: string
  }
  createdAt: string
  editedAt: string | null
}
