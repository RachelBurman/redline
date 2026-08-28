import { useForm } from '@tanstack/react-form'
import { LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'

import { reviewCategories, reviewPriorities } from '#/domain/review/review-options'
import { apiRequest } from '#/lib/api-client'

import type { DocumentDetail } from '#/types/documents'
import type { CreateReviewItemInput, ReviewItemSummary } from '#/types/reviews'

interface ReviewProposalFormProps {
  documentId: string
  versionId: string
  reviewRoundId: string
  block: DocumentDetail['blocks'][number]
  onCancel: () => void
  onCreated: (reviewItem: ReviewItemSummary) => void
}

export function ReviewProposalForm({
  documentId,
  versionId,
  reviewRoundId,
  block,
  onCancel,
  onCreated,
}: ReviewProposalFormProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: {
      proposedContent: block.text,
      category: 'Clarification' as CreateReviewItemInput['category'],
      priority: 'medium' as CreateReviewItemInput['priority'],
      rationale: '',
    },
    onSubmit: async ({ value }) => {
      setSubmissionError(null)
      try {
        const item = await apiRequest<ReviewItemSummary>(
          `/api/v1/documents/${documentId}/review-items`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentVersionId: versionId,
              reviewRoundId,
              targetBlockId: block.id,
              proposedContent: value.proposedContent,
              category: value.category,
              priority: value.priority,
              rationale: value.rationale,
            } satisfies CreateReviewItemInput),
          },
        )
        onCreated(item)
      } catch (error) {
        setSubmissionError(
          error instanceof Error ? error.message : 'The proposal could not be created.',
        )
      }
    },
  })

  return (
    <section aria-labelledby="proposal-heading" className="border-b border-[#e0ded7] pb-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#a64e38] uppercase">
            New proposal
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#26312d]" id="proposal-heading">
            Replace paragraph
          </h2>
        </div>
        <button
          aria-label="Cancel proposal"
          className="rounded-md p-1.5 text-[#6e7773] hover:bg-[#f1efea]"
          onClick={onCancel}
          type="button"
        >
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      <p className="mt-3 line-clamp-3 rounded-lg bg-[#f2f1ec] px-3 py-2 text-xs leading-5 text-[#68716d]">
        {block.text}
      </p>

      <form
        className="mt-4 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Field name="proposedContent">
          {(field) => (
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-[#46504c]">
                Replacement text
              </span>
              <textarea
                className="min-h-28 w-full resize-y rounded-xl border border-[#d5d3cc] bg-white px-3 py-2.5 text-sm leading-6 focus:border-[#dc755b] focus:outline-none"
                maxLength={100000}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                required
                value={field.state.value}
              />
            </label>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="category">
            {(field) => (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#46504c]">Category</span>
                <select
                  className="h-10 w-full rounded-lg border border-[#d5d3cc] bg-white px-2 text-xs"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(event.target.value as CreateReviewItemInput['category'])
                  }
                  value={field.state.value}
                >
                  {reviewCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>
          <form.Field name="priority">
            {(field) => (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#46504c]">Priority</span>
                <select
                  className="h-10 w-full rounded-lg border border-[#d5d3cc] bg-white px-2 text-xs capitalize"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(event.target.value as CreateReviewItemInput['priority'])
                  }
                  value={field.state.value}
                >
                  {reviewPriorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>
        </div>

        <form.Field name="rationale">
          {(field) => (
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-[#46504c]">
                Reason for change
              </span>
              <textarea
                className="min-h-20 w-full resize-y rounded-xl border border-[#d5d3cc] bg-white px-3 py-2.5 text-sm leading-5 focus:border-[#dc755b] focus:outline-none"
                maxLength={5000}
                minLength={3}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
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

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#18201d] px-4 text-sm font-bold text-white disabled:opacity-55"
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
              ) : null}
              {isSubmitting ? 'Creating proposal…' : 'Create proposal'}
            </button>
          )}
        </form.Subscribe>
      </form>
    </section>
  )
}
