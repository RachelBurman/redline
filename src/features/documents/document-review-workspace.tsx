import { DocumentReviewHeader } from '#/components/documents/document-review-header'
import { DocumentVersionComparisonWorkspace } from '#/components/documents/document-version-comparison-workspace'
import { DocumentViewer } from '#/components/documents/document-viewer'
import { ParserWarnings } from '#/components/documents/parser-warnings'
import { VersionHistoryPanel } from '#/components/documents/version-history-panel'
import { ReviewRoundAssignmentsPanel } from '#/components/reviewers/review-round-assignments-panel'
import { ReviewSidebar } from '#/components/reviews/review-sidebar'
import { WorkspaceHeader } from '#/components/workspace/workspace-header'

import type { DocumentVersionSummary, VersionActionResult } from '#/types/document-versions'
import type { DocumentDetail, DocumentInsertionAnchor } from '#/types/documents'
import type { PresenceParticipant } from '#/types/presence'
import type { ReviewCommentSummary, ReviewItemSummary } from '#/types/reviews'
import type { ReviewChangeType } from '#/types/reviews'

export interface ComparisonSelection {
  baseVersionId: string
  targetVersionId: string
}

export interface ActiveProposal {
  block: DocumentDetail['blocks'][number]
  changeType: ReviewChangeType
  beforeBlockId?: string | null
}

export interface WorkspaceSummary {
  organization: { id: string; name: string; slug: string; role: string }
  project: { id: string; name: string }
}

interface DocumentReviewWorkspaceProps {
  activeProposal: ActiveProposal | null
  comparisonSelection: ComparisonSelection | null
  displayedDocument: DocumentDetail
  displayedReviewItems: ReviewItemSummary[]
  document: DocumentDetail
  documentId: string
  isSigningOut: boolean
  presence: PresenceParticipant[]
  selectedItemId: string | null
  selectedStableKey?: string
  user: { id: string; name: string }
  versions: DocumentVersionSummary[]
  viewedVersionId: string | null
  workspace: WorkspaceSummary
  onCancelProposal: () => void
  onCloseComparison: () => void
  onCommentCreated: (comment: ReviewCommentSummary) => void
  onCompareVersions: (baseVersionId: string, targetVersionId: string) => void
  onCreated: (item: ReviewItemSummary) => void
  onPropose: (block: DocumentDetail['blocks'][number], changeType: ReviewChangeType) => void
  onProposeInsertion: (anchor: DocumentInsertionAnchor) => void
  onResolve: (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
  onReturnToCurrentVersion: () => void
  onSelect: (item: ReviewItemSummary) => void
  onSignOut: () => Promise<void>
  onVersionChanged: (result: VersionActionResult) => Promise<void>
  onViewVersion: (versionId: string | null) => void
}

const reviewRoles = new Set(['owner', 'admin', 'editor', 'reviewer'])
const resolveRoles = new Set(['owner', 'admin', 'editor'])
const manageReviewerRoles = new Set(['owner', 'admin'])
const exportQueueRoles = new Set(['owner', 'admin', 'editor', 'reviewer', 'auditor'])

function getViewMode(isComparing: boolean, isHistorical: boolean) {
  if (isComparing) return 'comparison' as const
  if (isHistorical) return 'historical' as const
  return 'current' as const
}

export function DocumentReviewWorkspace({
  activeProposal,
  comparisonSelection,
  displayedDocument,
  displayedReviewItems,
  document,
  documentId,
  isSigningOut,
  presence,
  selectedItemId,
  selectedStableKey,
  user,
  versions,
  viewedVersionId,
  workspace,
  onCancelProposal,
  onCloseComparison,
  onCommentCreated,
  onCompareVersions,
  onCreated,
  onPropose,
  onProposeInsertion,
  onResolve,
  onReturnToCurrentVersion,
  onSelect,
  onSignOut,
  onVersionChanged,
  onViewVersion,
}: DocumentReviewWorkspaceProps) {
  const role = workspace.organization.role
  const canReview = reviewRoles.has(role)
  const canResolve = resolveRoles.has(role)
  const canExportReviewQueue = exportQueueRoles.has(role)
  const isViewingHistoricalVersion = !displayedDocument.version.isCurrent
  const isComparingVersions = comparisonSelection !== null
  const actionsEnabled = !isViewingHistoricalVersion

  return (
    <div className="min-h-screen bg-[#f3f2ed]">
      <WorkspaceHeader
        canManageReviewers={manageReviewerRoles.has(role)}
        isSigningOut={isSigningOut}
        onSignOut={() => void onSignOut()}
        organizationName={workspace.organization.name}
        userName={user.name}
      />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7" id="main-content">
        <DocumentReviewHeader
          documentId={documentId}
          documentTitle={document.document.title}
          exportPermissions={{ document: canResolve, reviewQueue: canExportReviewQueue }}
          participants={presence}
          reviewRoundName={displayedDocument.reviewRound.name}
          userId={user.id}
          viewMode={getViewMode(isComparingVersions, isViewingHistoricalVersion)}
          versionNumber={displayedDocument.version.versionNumber}
        />

        <VersionHistoryPanel
          canManageVersions={canResolve}
          currentVersionId={document.version.id}
          documentId={documentId}
          onCompareVersions={onCompareVersions}
          onVersionChanged={onVersionChanged}
          onViewVersion={onViewVersion}
          versions={versions}
          viewedVersionId={viewedVersionId}
        />

        {canResolve && actionsEnabled && !isComparingVersions ? (
          <ReviewRoundAssignmentsPanel
            documentId={documentId}
            reviewRoundId={displayedDocument.reviewRound.id}
            reviewRoundName={displayedDocument.reviewRound.name}
          />
        ) : null}

        {actionsEnabled || isComparingVersions ? null : (
          <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e0c7bd] bg-[#fff8f5] px-4 py-3">
            <p className="text-xs font-semibold text-[#754b3f]">
              You are viewing immutable version {displayedDocument.version.versionNumber}. Review
              actions are disabled.
            </p>
            <button
              className="min-h-9 rounded-lg bg-[#754b3f] px-3 text-xs font-bold text-white"
              onClick={onReturnToCurrentVersion}
              type="button"
            >
              Return to current version
            </button>
          </section>
        )}

        {comparisonSelection ? (
          <DocumentVersionComparisonWorkspace
            baseVersionId={comparisonSelection.baseVersionId}
            documentId={documentId}
            onClose={onCloseComparison}
            targetVersionId={comparisonSelection.targetVersionId}
          />
        ) : (
          <>
            <ParserWarnings warnings={displayedDocument.version.parserWarnings} />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <DocumentViewer
                blocks={displayedDocument.blocks}
                canInsert={
                  canReview && actionsEnabled && displayedDocument.insertionAnchors.length > 0
                }
                canReview={canReview && actionsEnabled}
                insertionAnchors={displayedDocument.insertionAnchors}
                onPropose={onPropose}
                onProposeInsertion={onProposeInsertion}
                selectedStableKey={selectedStableKey}
              />
              <ReviewSidebar
                activeBlock={activeProposal?.block ?? null}
                activeChangeType={activeProposal?.changeType ?? null}
                blocks={displayedDocument.blocks}
                canComment={canReview && actionsEnabled}
                canResolve={canResolve && actionsEnabled}
                documentId={documentId}
                documentVersionId={displayedDocument.version.id}
                insertionBeforeBlockId={activeProposal?.beforeBlockId}
                items={displayedReviewItems}
                onCancelProposal={onCancelProposal}
                onCommentCreated={onCommentCreated}
                onCreated={onCreated}
                onResolve={onResolve}
                onSelect={onSelect}
                reviewRoundId={displayedDocument.reviewRound.id}
                selectedItemId={selectedItemId}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
