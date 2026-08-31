import { Reply } from 'lucide-react'
import { useRef } from 'react'

import { ReviewCommentCard } from './review-comment-card'
import { ReviewCommentForm } from './review-comment-form'
import { reviewCommentFormId } from './review-comment-form-id'

import type { ReviewCommentSummary, ReviewItemSummary } from '#/types/reviews'
import type { ReviewCommentThreadData } from './group-review-comments'
import type { CreateReviewCommentAction } from './review-comment-form'

interface ReviewCommentThreadProps {
  canComment: boolean
  createReviewComment?: CreateReviewCommentAction
  documentId: string
  isReplying: boolean
  onCancelReply: () => void
  onCreated: (comment: ReviewCommentSummary) => void
  onStartReply: () => void
  reviewItemId: ReviewItemSummary['id']
  thread: ReviewCommentThreadData
}

export function ReviewCommentThread({
  canComment,
  createReviewComment,
  documentId,
  isReplying,
  onCancelReply,
  onCreated,
  onStartReply,
  reviewItemId,
  thread,
}: ReviewCommentThreadProps) {
  const replyButtonRef = useRef<HTMLButtonElement>(null)
  const canReply = canComment && thread.comment.parentCommentId === null
  const formId = reviewCommentFormId(reviewItemId, thread.comment.id)

  function handleCancelReply() {
    replyButtonRef.current?.focus()
    onCancelReply()
  }

  function handleCreated(comment: ReviewCommentSummary) {
    replyButtonRef.current?.focus()
    onCreated(comment)
  }

  return (
    <li>
      <ReviewCommentCard comment={thread.comment}>
        {canReply ? (
          <button
            aria-controls={formId}
            aria-expanded={isReplying}
            aria-label={`Reply to ${thread.comment.author.name}`}
            className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold text-[#315845] hover:bg-[#e8f1ec] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315845]"
            onClick={onStartReply}
            ref={replyButtonRef}
            type="button"
          >
            <Reply aria-hidden="true" size={12} />
            Reply
          </button>
        ) : null}
      </ReviewCommentCard>

      {isReplying ? (
        <ReviewCommentForm
          createReviewComment={createReviewComment}
          documentId={documentId}
          onCancel={handleCancelReply}
          onCreated={handleCreated}
          parentCommentAuthor={thread.comment.author.name}
          parentCommentId={thread.comment.id}
          reviewItemId={reviewItemId}
        />
      ) : null}

      {thread.replies.length > 0 ? (
        <ol
          aria-label={`Replies to ${thread.comment.author.name}'s comment`}
          className="mt-2 ml-4 grid gap-2 border-l-2 border-[#d9e5de] pl-3"
        >
          {thread.replies.map((reply) => (
            <li key={reply.id}>
              <ReviewCommentCard comment={reply} isReply />
            </li>
          ))}
        </ol>
      ) : null}
    </li>
  )
}
