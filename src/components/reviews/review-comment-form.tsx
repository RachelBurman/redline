import { useForm } from '@tanstack/react-form'
import { LoaderCircle, MessageSquarePlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { apiRequest } from '#/lib/api-client'

import { reviewCommentFormId } from './review-comment-form-id'

import type {
  CreateReviewCommentInput,
  ReviewCommentSummary,
  ReviewItemSummary,
} from '#/types/reviews'

export type CreateReviewCommentAction = (
  documentId: string,
  reviewItemId: string,
  input: CreateReviewCommentInput,
) => Promise<ReviewCommentSummary>

async function createReviewCommentWithApi(
  documentId: string,
  reviewItemId: string,
  input: CreateReviewCommentInput,
) {
  return apiRequest<ReviewCommentSummary>(
    `/api/v1/documents/${documentId}/review-items/${reviewItemId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}

interface ReviewCommentFormProps {
  documentId: string
  reviewItemId: ReviewItemSummary['id']
  createReviewComment?: CreateReviewCommentAction
  onCancel?: () => void
  onCreated: (comment: ReviewCommentSummary) => void
  parentCommentAuthor?: string
  parentCommentId?: string
}

export function ReviewCommentForm({
  documentId,
  reviewItemId,
  createReviewComment = createReviewCommentWithApi,
  onCancel,
  onCreated,
  parentCommentAuthor,
  parentCommentId,
}: ReviewCommentFormProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isReply = Boolean(parentCommentId)
  const formId = reviewCommentFormId(reviewItemId, parentCommentId)
  const fieldLabel = isReply ? `Reply to ${parentCommentAuthor ?? 'comment'}` : 'Comment'

  useEffect(() => {
    if (isReply) textareaRef.current?.focus()
  }, [isReply])

  const form = useForm({
    defaultValues: { body: '' },
    onSubmit: async ({ value }) => {
      setSubmissionError(null)
      setSuccessMessage(null)
      try {
        const comment = await createReviewComment(documentId, reviewItemId, {
          body: value.body,
          ...(parentCommentId ? { parentCommentId } : {}),
        })
        form.reset()
        setSuccessMessage(isReply ? 'Reply added.' : 'Comment added.')
        onCreated(comment)
      } catch (error) {
        setSubmissionError(
          error instanceof Error ? error.message : 'The comment could not be added.',
        )
      }
    },
  })

  return (
    <section
      aria-labelledby={`${formId}-heading`}
      className={isReply ? 'mt-2 ml-4 border-l-2 border-[#d9e5de] pl-3' : 'mt-4'}
      id={formId}
    >
      <h4 className="text-xs font-bold text-[#4e5954]" id={`${formId}-heading`}>
        {isReply ? fieldLabel : 'Add to discussion'}
      </h4>
      <form
        className="mt-2 grid gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Field name="body">
          {(field) => (
            <label className="block">
              <span className="sr-only">{fieldLabel}</span>
              <textarea
                className="min-h-20 w-full resize-y rounded-xl border border-[#d5d3cc] bg-white px-3 py-2.5 text-sm leading-5 text-[#303b36] focus:border-[#dc755b] focus:outline-none"
                maxLength={5_000}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder={isReply ? 'Write a reply' : 'Write a comment'}
                ref={textareaRef}
                required
                value={field.state.value}
              />
            </label>
          )}
        </form.Field>

        {submissionError ? (
          <p className="rounded-lg bg-[#fff0eb] px-3 py-2 text-xs text-[#91452f]" role="alert">
            {submissionError}
          </p>
        ) : null}
        {successMessage ? (
          <output
            aria-live="polite"
            className="rounded-lg bg-[#edf5f0] px-3 py-2 text-xs font-semibold text-[#315845]"
          >
            {successMessage}
          </output>
        ) : null}

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#ccd4cf] bg-[#f5faf7] px-3 text-xs font-bold text-[#315845] hover:border-[#80a995] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={!canSubmit || isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
                ) : (
                  <MessageSquarePlus aria-hidden="true" size={14} />
                )}
                {isSubmitting
                  ? isReply
                    ? 'Adding reply…'
                    : 'Adding comment…'
                  : isReply
                    ? 'Add reply'
                    : 'Add comment'}
              </button>
              {onCancel ? (
                <button
                  className="min-h-9 rounded-lg px-3 text-xs font-bold text-[#68726d] hover:bg-[#f3f2ed]"
                  disabled={isSubmitting}
                  onClick={onCancel}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          )}
        </form.Subscribe>
      </form>
    </section>
  )
}
