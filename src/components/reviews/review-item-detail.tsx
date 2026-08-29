import { Check, LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'

import type { ReviewItemSummary } from '#/types/reviews'

interface ReviewItemDetailProps {
  item: ReviewItemSummary
  canResolve: boolean
  onResolve: (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
}

export function ReviewItemDetail({ item, canResolve, onResolve }: ReviewItemDetailProps) {
  const [pendingDecision, setPendingDecision] = useState<'accept' | 'reject' | null>(null)
  const [resolutionError, setResolutionError] = useState<string | null>(null)
  const isOpen = ['open', 'under_discussion'].includes(item.status)

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
        {item.changeType === 'delete'
          ? 'Deletion'
          : item.changeType === 'insert'
            ? 'New paragraph'
            : 'Replacement'}{' '}
        · {item.category}
      </h3>

      <dl className="mt-3 grid gap-3 text-xs">
        {item.changeType === 'insert' ? (
          <div>
            <dt className="font-bold text-[#68716d]">Insertion point</dt>
            <dd className="mt-1 rounded-lg bg-[#f1f0eb] px-3 py-2 leading-5 text-[#5f6964]">
              End of document
            </dd>
          </div>
        ) : (
          <div>
            <dt className="font-bold text-[#68716d]">Original</dt>
            <dd className="mt-1 rounded-lg bg-[#f1f0eb] px-3 py-2 leading-5 text-[#5f6964]">
              {item.originalContent}
            </dd>
          </div>
        )}
        {item.changeType === 'delete' ? (
          <div>
            <dt className="font-bold text-[#68716d]">Proposed action</dt>
            <dd className="mt-1 rounded-lg border border-[#e5d6bd] bg-[#fff9ee] px-3 py-2 leading-5 text-[#6f542b]">
              Remove this paragraph from the clean resolved document.
            </dd>
          </div>
        ) : (
          <div>
            <dt className="font-bold text-[#68716d]">
              {item.changeType === 'insert' ? 'New paragraph' : 'Proposed'}
            </dt>
            <dd className="mt-1 rounded-lg bg-[#edf5f0] px-3 py-2 leading-5 text-[#315845]">
              {item.proposedContent}
            </dd>
          </div>
        )}
        <div>
          <dt className="font-bold text-[#68716d]">Rationale</dt>
          <dd className="mt-1 leading-5 text-[#4e5954]">{item.rationale}</dd>
        </div>
      </dl>

      {resolutionError ? (
        <p className="mt-3 rounded-lg bg-[#fff0eb] px-3 py-2 text-xs text-[#91452f]" role="alert">
          {resolutionError}
        </p>
      ) : null}

      {isOpen && canResolve ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d7d4cc] bg-white text-xs font-bold text-[#59635f] disabled:opacity-55"
            disabled={pendingDecision !== null}
            onClick={() => void handleResolve('reject')}
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
            onClick={() => void handleResolve('accept')}
            type="button"
          >
            {pendingDecision === 'accept' ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
            ) : (
              <Check aria-hidden="true" size={14} />
            )}
            {item.changeType === 'delete'
              ? 'Accept deletion'
              : item.changeType === 'insert'
                ? 'Accept paragraph'
                : 'Accept'}
          </button>
        </div>
      ) : null}

      {isOpen && !canResolve ? (
        <p className="mt-4 rounded-lg bg-[#f3f2ed] px-3 py-2 text-xs text-[#707974]">
          Only an owner, administrator, or editor can resolve this proposal.
        </p>
      ) : null}
    </section>
  )
}
