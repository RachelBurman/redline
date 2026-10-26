import { Check, LoaderCircle, X } from 'lucide-react'

import type { ReviewItemSummary } from '#/types/reviews'

interface ReviewResolutionControlsProps {
  canResolve: boolean
  item: ReviewItemSummary
  pendingDecision: 'accept' | 'reject' | null
  onResolve: (decision: 'accept' | 'reject') => void
}

const acceptLabels = {
  delete: 'Accept deletion',
  insert: 'Accept paragraph',
  replace: 'Accept',
  media_insert: 'Accept image',
  media_replace: 'Accept replacement',
  media_delete: 'Accept deletion',
  media_caption: 'Accept caption',
  media_alt_text: 'Accept description',
  media_reorder: 'Accept move',
} as const

export function ReviewResolutionControls({
  canResolve,
  item,
  pendingDecision,
  onResolve,
}: ReviewResolutionControlsProps) {
  const isOpen = ['open', 'under_discussion'].includes(item.status)

  if (!isOpen) return null

  if (!canResolve) {
    return (
      <p className="mt-4 rounded-lg bg-[#f3f2ed] px-3 py-2 text-xs text-[#707974]">
        Only an owner, administrator, or editor can resolve this proposal.
      </p>
    )
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d7d4cc] bg-white text-xs font-bold text-[#59635f] disabled:opacity-55"
        disabled={pendingDecision !== null}
        onClick={() => onResolve('reject')}
        type="button"
      >
        {pendingDecision === 'reject' ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
        ) : (
          <X aria-hidden="true" size={14} />
        )}
        Reject
      </button>
      <button
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1f684b] text-xs font-bold text-white disabled:opacity-55"
        disabled={pendingDecision !== null}
        onClick={() => onResolve('accept')}
        type="button"
      >
        {pendingDecision === 'accept' ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
        ) : (
          <Check aria-hidden="true" size={14} />
        )}
        {acceptLabels[item.changeType]}
      </button>
    </div>
  )
}
