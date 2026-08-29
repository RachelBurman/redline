import { ReviewProposalForm } from './review-proposal-form'
import { ReviewQueue } from './review-queue'

import type { DocumentDetail } from '#/types/documents'
import type { ReviewItemSummary } from '#/types/reviews'
import type { ReviewChangeType } from '#/types/reviews'

interface ReviewSidebarProps {
  documentId: string
  documentVersionId: string
  reviewRoundId: string
  activeBlock: DocumentDetail['blocks'][number] | null
  activeChangeType: ReviewChangeType | null
  items: ReviewItemSummary[]
  selectedItemId: string | null
  canResolve: boolean
  onCancelProposal: () => void
  onCreated: (item: ReviewItemSummary) => void
  onSelect: (item: ReviewItemSummary) => void
  onResolve: (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
}

export function ReviewSidebar({
  documentId,
  documentVersionId,
  reviewRoundId,
  activeBlock,
  activeChangeType,
  items,
  selectedItemId,
  canResolve,
  onCancelProposal,
  onCreated,
  onSelect,
  onResolve,
}: ReviewSidebarProps) {
  return (
    <aside className="h-fit max-h-[calc(100vh-12rem)] overflow-auto rounded-2xl border border-[#dedbd3] bg-white p-5">
      {activeBlock && activeChangeType ? (
        <ReviewProposalForm
          block={activeBlock}
          changeType={activeChangeType}
          documentId={documentId}
          key={`${activeBlock.id}:${activeChangeType}`}
          onCancel={onCancelProposal}
          onCreated={onCreated}
          reviewRoundId={reviewRoundId}
          versionId={documentVersionId}
        />
      ) : null}
      <div className={activeBlock && activeChangeType ? 'pt-5' : ''}>
        <ReviewQueue
          canResolve={canResolve}
          items={items}
          onResolve={onResolve}
          onSelect={onSelect}
          selectedItemId={selectedItemId}
        />
      </div>
    </aside>
  )
}
