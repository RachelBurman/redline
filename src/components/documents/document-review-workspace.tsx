import { DocumentDisplayModeControl } from '#/components/documents/document-display-mode-control'
import { DocumentViewer } from '#/components/documents/document-viewer'
import { LatexSourceViewer } from '#/components/documents/latex-source-viewer'
import { ParserWarnings } from '#/components/documents/parser-warnings'
import { useDocumentDisplayMode } from '#/components/documents/use-document-display-mode'
import { ReviewSidebar } from '#/components/reviews/review-sidebar'

import type { DocumentBlockDetail, DocumentDetail } from '#/types/documents'
import type { ReviewCommentSummary, ReviewItemSummary, TextReviewChangeType } from '#/types/reviews'

export interface ActiveReviewProposal {
  block: DocumentBlockDetail
  changeType: TextReviewChangeType
  beforeBlockId?: string | null
  initialProposedContent?: string
}

interface DocumentReviewWorkspaceProps {
  activeProposal: ActiveReviewProposal | null
  document: DocumentDetail
  documentId: string
  isViewingHistoricalVersion: boolean
  items: ReviewItemSummary[]
  mobilePane: 'document' | 'reviews'
  onCancelProposal: () => void
  onCommentCreated: (comment: ReviewCommentSummary) => void
  onCreated: (item: ReviewItemSummary) => void
  onMobilePaneChange: (pane: 'document' | 'reviews') => void
  onMediaProposalCreated?: (reviewItemId: string) => void
  onResolve: (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
  onSelectItem: (item: ReviewItemSummary) => void
  onStartProposal: (proposal: ActiveReviewProposal) => void
  selectedItemId: string | null
  selectedStableKey?: string
  userId: string
}

const ignoreMediaProposal = () => undefined

export function DocumentReviewWorkspace({
  activeProposal,
  document,
  documentId,
  isViewingHistoricalVersion,
  items,
  mobilePane,
  onCancelProposal,
  onCommentCreated,
  onCreated,
  onMobilePaneChange,
  onMediaProposalCreated = ignoreMediaProposal,
  onResolve,
  onSelectItem,
  onStartProposal,
  selectedItemId,
  selectedStableKey,
  userId,
}: DocumentReviewWorkspaceProps) {
  const { capabilities } = document
  const [displayMode, setDisplayMode] = useDocumentDisplayMode(userId)
  const canReview = capabilities.review && !isViewingHistoricalVersion

  return (
    <>
      <ParserWarnings warnings={document.version.parserWarnings} />

      <DocumentDisplayModeControl mode={displayMode} onChange={setDisplayMode} />

      <div
        aria-label="Review workspace view"
        className="mb-4 grid grid-cols-2 rounded-xl border border-[#d9d6ce] bg-white p-1 xl:hidden"
        role="tablist"
      >
        <button
          aria-controls="document-workspace-pane"
          aria-selected={mobilePane === 'document'}
          className={`min-h-10 rounded-lg text-sm font-bold ${
            mobilePane === 'document'
              ? 'bg-[#26312d] text-white'
              : 'text-[#64706a] hover:bg-[#f5f3ed]'
          }`}
          id="document-workspace-tab"
          onClick={() => onMobilePaneChange('document')}
          role="tab"
          type="button"
        >
          Document
        </button>
        <button
          aria-controls="review-workspace-pane"
          aria-selected={mobilePane === 'reviews'}
          className={`min-h-10 rounded-lg text-sm font-bold ${
            mobilePane === 'reviews'
              ? 'bg-[#26312d] text-white'
              : 'text-[#64706a] hover:bg-[#f5f3ed]'
          }`}
          id="review-workspace-tab"
          onClick={() => onMobilePaneChange('reviews')}
          role="tab"
          type="button"
        >
          Reviews ({items.length})
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div
          aria-labelledby="document-workspace-tab"
          className={mobilePane === 'document' ? 'block' : 'hidden xl:block'}
          id="document-workspace-pane"
          role="tabpanel"
        >
          {displayMode === 'latex-source' ? (
            <LatexSourceViewer
              blocks={document.blocks}
              canInsert={canReview && document.insertionAnchors.length > 0}
              canReview={canReview}
              insertionAnchors={document.insertionAnchors}
              onPropose={(block, proposedContent) =>
                onStartProposal({
                  block,
                  changeType: 'replace',
                  initialProposedContent: proposedContent,
                })
              }
              onProposeDeletion={(block) => onStartProposal({ block, changeType: 'delete' })}
              onProposeInsertion={(anchor, proposedContent) =>
                onStartProposal({
                  block: anchor.afterBlock,
                  beforeBlockId: anchor.beforeBlockId,
                  changeType: 'insert',
                  initialProposedContent: proposedContent,
                })
              }
              selectedStableKey={selectedStableKey}
            />
          ) : (
            <DocumentViewer
              blocks={document.blocks}
              canInsert={canReview && document.insertionAnchors.length > 0}
              canReview={canReview}
              insertionAnchors={document.insertionAnchors}
              documentId={documentId}
              documentVersionId={document.version.id}
              reviewRoundId={document.reviewRound.id}
              onMediaProposalCreated={onMediaProposalCreated}
              onPropose={(block, changeType) => onStartProposal({ block, changeType })}
              onProposeInsertion={(anchor) =>
                onStartProposal({
                  changeType: 'insert',
                  block: anchor.afterBlock,
                  beforeBlockId: anchor.beforeBlockId,
                })
              }
              presentation={displayMode === 'latex-rendered' ? 'latex-rendered' : 'normal'}
              selectedStableKey={selectedStableKey}
            />
          )}
        </div>
        <div
          aria-labelledby="review-workspace-tab"
          className={mobilePane === 'reviews' ? 'block' : 'hidden xl:block'}
          id="review-workspace-pane"
          role="tabpanel"
        >
          <ReviewSidebar
            activeBlock={activeProposal?.block ?? null}
            activeChangeType={activeProposal?.changeType ?? null}
            blocks={document.blocks}
            canComment={capabilities.comment && !isViewingHistoricalVersion}
            canResolve={capabilities.resolve && !isViewingHistoricalVersion}
            documentId={documentId}
            documentVersionId={document.version.id}
            insertionBeforeBlockId={activeProposal?.beforeBlockId}
            initialProposedContent={activeProposal?.initialProposedContent}
            items={items}
            onCancelProposal={onCancelProposal}
            onCommentCreated={onCommentCreated}
            onCreated={onCreated}
            onResolve={onResolve}
            onSelect={onSelectItem}
            reviewRoundId={document.reviewRound.id}
            selectedItemId={selectedItemId}
          />
        </div>
      </div>
    </>
  )
}
