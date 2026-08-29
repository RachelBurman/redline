import { useForm } from '@tanstack/react-form'
import { LoaderCircle, MessageSquarePlus } from 'lucide-react'
import { useState } from 'react'

import { apiRequest } from '#/lib/api-client'

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
  onCreated: (comment: ReviewCommentSummary) => void
}

export function ReviewCommentForm({
  documentId,
  reviewItemId,
  createReviewComment = createReviewCommentWithApi,
  onCreated,
}: ReviewCommentFormProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { body: '' },
    onSubmit: async ({ value }) => {
      setSubmissionError(null)
      setSuccessMessage(null)
      try {
        const comment = await createReviewComment(documentId, reviewItemId, {
          body: value.body,
        })
        form.reset()
        setSuccessMessage('Comment added.')
        onCreated(comment)
      } catch (error) {
        setSubmissionError(
          error instanceof Error ? error.message : 'The comment could not be added.',
        )
      }
    },
  })

  return (
    <section aria-labelledby={`comment-heading-${reviewItemId}`} className="mt-4">
      <h4 className="text-xs font-bold text-[#4e5954]" id={`comment-heading-${reviewItemId}`}>
        Add to discussion
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
              <span className="sr-only">Comment</span>
              <textarea
                className="min-h-20 w-full resize-y rounded-xl border border-[#d5d3cc] bg-white px-3 py-2.5 text-sm leading-5 text-[#303b36] focus:border-[#dc755b] focus:outline-none"
                maxLength={5_000}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Write a comment"
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
              {isSubmitting ? 'Adding comment…' : 'Add comment'}
            </button>
          )}
        </form.Subscribe>
      </form>
    </section>
  )
}
