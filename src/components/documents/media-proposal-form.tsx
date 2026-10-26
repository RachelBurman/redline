import { LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'

import { reviewCategories, reviewPriorities } from '#/domain/review/review-options'
import { apiRequest } from '#/lib/api-client'

import type { DocumentBlockDetail } from '#/types/documents'
import type { ReviewChangeType } from '#/types/reviews'

type MediaChangeType = Extract<ReviewChangeType, `media_${string}`>

interface MediaProposalFormProps {
  beforeBlockId: string | null
  blocks: DocumentBlockDetail[]
  changeType: MediaChangeType
  documentId: string
  reviewRoundId: string
  targetBlock: DocumentBlockDetail
  versionId: string
  onCancel: () => void
  onCreated: (reviewItemId: string) => void
}

const headings: Record<MediaChangeType, string> = {
  media_insert: 'Add image or static graph',
  media_replace: 'Replace image',
  media_delete: 'Delete image',
  media_caption: 'Change image caption',
  media_alt_text: 'Change accessible description',
  media_reorder: 'Move image',
}

interface SubmitMediaProposalInput {
  altText: string
  beforeBlockId: string | null
  caption: string
  category: (typeof reviewCategories)[number]
  changeType: MediaChangeType
  destination: string
  documentId: string
  file: File | null
  priority: (typeof reviewPriorities)[number]
  rationale: string
  reviewRoundId: string
  source: string
  targetBlockId: string
  versionId: string
}

async function submitMediaProposal(input: SubmitMediaProposalInput) {
  if (input.changeType === 'media_insert' || input.changeType === 'media_replace') {
    if (!input.file) throw new Error('Choose a PNG or JPEG image.')
    const form = new FormData()
    form.set('file', input.file)
    form.set('documentVersionId', input.versionId)
    form.set('reviewRoundId', input.reviewRoundId)
    form.set('targetBlockId', input.targetBlockId)
    form.set('beforeBlockId', input.beforeBlockId ?? '')
    form.set('changeType', input.changeType)
    form.set('altText', input.altText)
    form.set('caption', input.caption)
    form.set('source', input.source)
    form.set('category', input.category)
    form.set('priority', input.priority)
    form.set('rationale', input.rationale)
    const result = await apiRequest<{ reviewItemId: string }>(
      `/api/v1/documents/${input.documentId}/media-proposals`,
      { method: 'POST', body: form },
    )
    return result.reviewItemId
  }

  const proposal = {
    documentVersionId: input.versionId,
    reviewRoundId: input.reviewRoundId,
    targetBlockId: input.targetBlockId,
    changeType: input.changeType,
    category: input.category,
    priority: input.priority,
    rationale: input.rationale,
    ...(input.changeType === 'media_caption' ? { caption: input.caption.trim() || null } : {}),
    ...(input.changeType === 'media_alt_text' ? { altText: input.altText } : {}),
    ...(input.changeType === 'media_reorder' ? { beforeBlockId: input.destination || null } : {}),
  }
  const result = await apiRequest<{ id: string }>(
    `/api/v1/documents/${input.documentId}/media-metadata-proposals`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposal),
    },
  )
  return result.id
}

function MediaContentFields(props: {
  altText: string
  blocks: DocumentBlockDetail[]
  caption: string
  changeType: MediaChangeType
  destination: string
  file: File | null
  needsFile: boolean
  source: string
  targetBlockId: string
  onAltTextChange: (value: string) => void
  onCaptionChange: (value: string) => void
  onDestinationChange: (value: string) => void
  onFileChange: (value: File | null) => void
  onSourceChange: (value: string) => void
}) {
  return (
    <>
      {props.needsFile ? (
        <label className="block text-sm font-bold text-[#46504c]">
          PNG or JPEG image (10 MB maximum)
          <input
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            className="mt-1.5 block w-full rounded-xl border border-[#d5d3cc] p-2 text-sm"
            onChange={(event) => props.onFileChange(event.target.files?.[0] ?? null)}
            required
            type="file"
          />
          {props.file ? (
            <span className="mt-1 block text-xs font-normal text-[#68726d]">
              Selected: {props.file.name}
            </span>
          ) : null}
        </label>
      ) : null}

      {props.needsFile || props.changeType === 'media_alt_text' ? (
        <label className="block text-sm font-bold text-[#46504c]">
          Accessible description
          <textarea
            className="mt-1.5 min-h-20 w-full rounded-xl border border-[#d5d3cc] px-3 py-2 font-normal"
            maxLength={2000}
            onChange={(event) => props.onAltTextChange(event.target.value)}
            required
            value={props.altText}
          />
          <span className="mt-1 block text-xs font-normal text-[#68726d]">
            Describe the information the image communicates, not its filename.
          </span>
        </label>
      ) : null}

      {props.needsFile || props.changeType === 'media_caption' ? (
        <label className="block text-sm font-bold text-[#46504c]">
          Caption (optional)
          <textarea
            className="mt-1.5 min-h-16 w-full rounded-xl border border-[#d5d3cc] px-3 py-2 font-normal"
            maxLength={2000}
            onChange={(event) => props.onCaptionChange(event.target.value)}
            value={props.caption}
          />
        </label>
      ) : null}

      {props.needsFile ? (
        <label className="block text-sm font-bold text-[#46504c]">
          Source or provenance (optional)
          <input
            className="mt-1.5 h-10 w-full rounded-xl border border-[#d5d3cc] px-3 font-normal"
            maxLength={2000}
            onChange={(event) => props.onSourceChange(event.target.value)}
            value={props.source}
          />
        </label>
      ) : null}

      {props.changeType === 'media_reorder' ? (
        <label className="block text-sm font-bold text-[#46504c]">
          Move before
          <select
            className="mt-1.5 h-10 w-full rounded-xl border border-[#d5d3cc] px-3 font-normal"
            onChange={(event) => props.onDestinationChange(event.target.value)}
            value={props.destination}
          >
            <option value="">End of document</option>
            {props.blocks
              .filter((block) => block.id !== props.targetBlockId)
              .map((block) => (
                <option key={block.id} value={block.id}>
                  Before block {block.ordinal + 1}:{' '}
                  {block.media?.caption ?? block.text.slice(0, 60)}
                </option>
              ))}
          </select>
        </label>
      ) : null}
    </>
  )
}

export function MediaProposalForm({
  beforeBlockId,
  blocks,
  changeType,
  documentId,
  reviewRoundId,
  targetBlock,
  versionId,
  onCancel,
  onCreated,
}: MediaProposalFormProps) {
  const media = targetBlock.media
  const [file, setFile] = useState<File | null>(null)
  const [altText, setAltText] = useState(media?.altText ?? '')
  const [caption, setCaption] = useState(media?.caption ?? '')
  const [source, setSource] = useState(media?.source ?? '')
  const [destination, setDestination] = useState('')
  const [category, setCategory] = useState<(typeof reviewCategories)[number]>('Clarification')
  const [priority, setPriority] = useState<(typeof reviewPriorities)[number]>('medium')
  const [rationale, setRationale] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsFile = changeType === 'media_insert' || changeType === 'media_replace'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const reviewItemId = await submitMediaProposal({
        altText,
        beforeBlockId,
        caption,
        category,
        changeType,
        destination,
        documentId,
        file,
        priority,
        rationale,
        reviewRoundId,
        source,
        targetBlockId: targetBlock.id,
        versionId,
      })
      onCreated(reviewItemId)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'The media proposal could not be created.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog
      aria-labelledby="media-proposal-heading"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#17201db3] p-4"
      onCancel={(event) => {
        if (submitting) event.preventDefault()
        else onCancel()
      }}
      open
    >
      <section className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#a64e38] uppercase">
              New media proposal
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#26312d]" id="media-proposal-heading">
              {headings[changeType]}
            </h2>
          </div>
          <button
            aria-label="Cancel media proposal"
            autoFocus
            className="rounded-lg p-2 text-[#68726d] hover:bg-[#f1efea]"
            disabled={submitting}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={(event) => void submit(event)}>
          <MediaContentFields
            altText={altText}
            blocks={blocks}
            caption={caption}
            changeType={changeType}
            destination={destination}
            file={file}
            needsFile={needsFile}
            onAltTextChange={setAltText}
            onCaptionChange={setCaption}
            onDestinationChange={setDestination}
            onFileChange={setFile}
            onSourceChange={setSource}
            source={source}
            targetBlockId={targetBlock.id}
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-[#46504c]">
              Category
              <select
                className="mt-1.5 h-10 w-full rounded-lg border border-[#d5d3cc] px-2 text-xs"
                onChange={(event) =>
                  setCategory(event.target.value as (typeof reviewCategories)[number])
                }
                value={category}
              >
                {reviewCategories.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-[#46504c]">
              Priority
              <select
                className="mt-1.5 h-10 w-full rounded-lg border border-[#d5d3cc] px-2 text-xs capitalize"
                onChange={(event) =>
                  setPriority(event.target.value as (typeof reviewPriorities)[number])
                }
                value={priority}
              >
                {reviewPriorities.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-bold text-[#46504c]">
            Reason for change
            <textarea
              className="mt-1.5 min-h-20 w-full rounded-xl border border-[#d5d3cc] px-3 py-2 font-normal"
              maxLength={5000}
              minLength={3}
              onChange={(event) => setRationale(event.target.value)}
              required
              value={rationale}
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-[#fff0eb] px-3 py-2 text-sm text-[#91452f]" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#18201d] px-4 text-sm font-bold text-white disabled:opacity-55"
            disabled={submitting}
            type="submit"
          >
            {submitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
            ) : null}
            {submitting ? 'Checking and storing image…' : 'Create media proposal'}
          </button>
        </form>
      </section>
    </dialog>
  )
}
