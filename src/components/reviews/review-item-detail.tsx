import { useState } from 'react'

import { ReviewDiscussion } from './review-discussion'
import { ReviewItemChangeSummary } from './review-item-change-summary'
import { ReviewResolutionControls } from './review-resolution-controls'

import type { ReviewCommentSummary, ReviewItemSummary } from '#/types/reviews'
import type { ListReviewCommentsAction } from './review-discussion'

interface ReviewItemDetailProps {
  item: ReviewItemSummary
  documentId: string
  canComment: boolean
  canResolve: boolean
  listReviewComments?: ListReviewCommentsAction
  onCommentCreated: (comment: ReviewCommentSummary) => void
  onResolve: (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
}

const changeTypeLabels = {
  delete: 'Deletion',
  insert: 'New paragraph',
  replace: 'Replacement',
  media_insert: 'New image',
  media_replace: 'Image replacement',
  media_delete: 'Image deletion',
  media_caption: 'Caption change',
  media_alt_text: 'Accessible description change',
  media_reorder: 'Image reorder',
} as const

export function ReviewItemDetail({
  item,
  documentId,
  canComment,
  canResolve,
  listReviewComments,
  onCommentCreated,
  onResolve,
}: ReviewItemDetailProps) {
  const [pendingDecision, setPendingDecision] = useState<'accept' | 'reject' | null>(null)
  const [resolutionError, setResolutionError] = useState<string | null>(null)

  async function handleResolve(decision: 'accept' | 'reject') {
    setPendingDecision(decision)
    setResolutionError(null)
    try {
      await onResolve(item, decision)
    } catch (error) {
      setResolutionError(
        error instanceof Error ? error.message : 'The decision could not be recorded.',
      )
      setPendingDecision(null)
    }
  }

  return (
    <section
      aria-labelledby="review-detail-heading"
      className="mt-4 border-t border-[#e3e1da] pt-4"
    >
      <p className="text-[10px] font-bold tracking-[0.13em] text-[#a64e38] uppercase">
        Selected proposal
      </p>
      <h3 className="mt-1 text-sm font-bold text-[#303b36]" id="review-detail-heading">
        {changeTypeLabels[item.changeType]} · {item.category}
      </h3>

      <dl className="mt-3 grid gap-3 text-xs">
        <ReviewItemChangeSummary item={item} />
        <div>
          <dt className="font-bold text-[#68716d]">Rationale</dt>
          <dd className="mt-1 leading-5 text-[#4e5954]">{item.rationale}</dd>
        </div>
      </dl>

      <ReviewDiscussion
        canComment={canComment}
        documentId={documentId}
        key={item.id}
        listReviewComments={listReviewComments}
        onCommentCreated={onCommentCreated}
        reviewItemId={item.id}
      />

      {resolutionError ? (
        <p className="mt-3 rounded-lg bg-[#fff0eb] px-3 py-2 text-xs text-[#91452f]" role="alert">
          {resolutionError}
        </p>
      ) : null}

      <ReviewResolutionControls
        canResolve={canResolve}
        item={item}
        onResolve={(decision) => void handleResolve(decision)}
        pendingDecision={pendingDecision}
      />
    </section>
  )
}
