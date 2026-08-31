import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { apiRequest } from '#/lib/api-client'

import { groupReviewComments } from './group-review-comments'
import { ReviewCommentForm } from './review-comment-form'
import { ReviewCommentThread } from './review-comment-thread'

import type { ReviewCommentSummary, ReviewItemSummary } from '#/types/reviews'
import type { CreateReviewCommentAction } from './review-comment-form'

export type ListReviewCommentsAction = (
  documentId: string,
  reviewItemId: string,
) => Promise<ReviewCommentSummary[]>

async function listReviewCommentsWithApi(documentId: string, reviewItemId: string) {
  return apiRequest<ReviewCommentSummary[]>(
    `/api/v1/documents/${documentId}/review-items/${reviewItemId}/comments`,
  )
}

function reviewCommentsQueryKey(documentId: string, reviewItemId: string) {
  return ['review-comments', documentId, reviewItemId] as const
}

interface ReviewDiscussionProps {
  documentId: string
  reviewItemId: ReviewItemSummary['id']
  canComment: boolean
  createReviewComment?: CreateReviewCommentAction
  listReviewComments?: ListReviewCommentsAction
  onCommentCreated: (comment: ReviewCommentSummary) => void
}

export function ReviewDiscussion({
  documentId,
  reviewItemId,
  canComment,
  createReviewComment,
  listReviewComments = listReviewCommentsWithApi,
  onCommentCreated,
}: ReviewDiscussionProps) {
  const queryClient = useQueryClient()
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyAnnouncement, setReplyAnnouncement] = useState<string | null>(null)
  const queryKey = reviewCommentsQueryKey(documentId, reviewItemId)
  const comments = useQuery({
    queryKey,
    queryFn: () => listReviewComments(documentId, reviewItemId),
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
  })

  function handleCommentCreated(comment: ReviewCommentSummary) {
    queryClient.setQueryData<ReviewCommentSummary[]>(queryKey, (currentComments) => {
      if (currentComments?.some((current) => current.id === comment.id)) return currentComments
      return [...(currentComments ?? []), comment]
    })
    if (comment.parentCommentId) {
      setReplyingToId(null)
      setReplyAnnouncement('Reply added to the discussion.')
    }
    onCommentCreated(comment)
  }

  const threads = groupReviewComments(comments.data ?? [])

  return (
    <section aria-labelledby={`discussion-heading-${reviewItemId}`} className="mt-4">
      <h4 className="text-xs font-bold text-[#4e5954]" id={`discussion-heading-${reviewItemId}`}>
        Discussion
      </h4>

      <div aria-busy={comments.isPending} className="mt-2">
        {comments.isPending ? (
          <output
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg bg-[#f3f2ed] px-3 py-2 text-xs text-[#68726d]"
          >
            <LoaderCircle aria-hidden="true" className="animate-spin" size={13} />
            Loading discussion…
          </output>
        ) : comments.isError ? (
          <div className="rounded-lg bg-[#fff0eb] px-3 py-2 text-xs text-[#91452f]" role="alert">
            <p>
              {comments.error instanceof Error
                ? comments.error.message
                : 'The discussion could not be loaded.'}
            </p>
            <button
              className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[#dfb7aa] bg-white px-2 font-bold"
              onClick={() => void comments.refetch()}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={12} />
              Retry
            </button>
          </div>
        ) : threads.length === 0 ? (
          <p className="rounded-lg bg-[#f3f2ed] px-3 py-2 text-xs leading-5 text-[#68726d]">
            No comments yet. Start the discussion below.
          </p>
        ) : (
          <ol aria-label="Review comments" className="grid gap-2">
            {threads.map((thread) => (
              <ReviewCommentThread
                canComment={canComment}
                createReviewComment={createReviewComment}
                documentId={documentId}
                isReplying={replyingToId === thread.comment.id}
                key={thread.comment.id}
                onCancelReply={() => setReplyingToId(null)}
                onCreated={handleCommentCreated}
                onStartReply={() => {
                  setReplyAnnouncement(null)
                  setReplyingToId((current) =>
                    current === thread.comment.id ? null : thread.comment.id,
                  )
                }}
                reviewItemId={reviewItemId}
                thread={thread}
              />
            ))}
          </ol>
        )}
      </div>

      {replyAnnouncement ? (
        <output aria-live="polite" className="sr-only">
          {replyAnnouncement}
        </output>
      ) : null}

      {canComment ? (
        <ReviewCommentForm
          createReviewComment={createReviewComment}
          documentId={documentId}
          onCreated={handleCommentCreated}
          reviewItemId={reviewItemId}
        />
      ) : null}
    </section>
  )
}
