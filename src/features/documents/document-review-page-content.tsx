import { DocumentAuditPanel } from '#/components/documents/document-audit-panel'
import { DocumentReviewHeader } from '#/components/documents/document-review-header'
import {
  DocumentReviewWorkspace,
  type ActiveReviewProposal,
} from '#/components/documents/document-review-workspace'
import { DocumentVersionComparisonWorkspace } from '#/components/documents/document-version-comparison-workspace'
import { VersionHistoryPanel } from '#/components/documents/version-history-panel'
import { ReviewRoundAssignmentsPanel } from '#/components/reviewers/review-round-assignments-panel'
import { SignaturePanel } from '#/components/signatures/signature-panel'
import { WorkspaceHeader } from '#/components/workspace/workspace-header'

import type { DocumentVersionSummary, VersionActionResult } from '#/types/document-versions'
import type { DocumentDetail } from '#/types/documents'
import type { PresenceParticipant } from '#/types/presence'
import type { ReviewCommentSummary, ReviewItemSummary } from '#/types/reviews'
import type { WorkspaceSummary } from '#/types/workspace'

export interface ComparisonSelection {
  baseVersionId: string
  targetVersionId: string
}

interface DocumentReviewPageContentProps {
  activeProposal: ActiveReviewProposal | null
  comparisonSelection: ComparisonSelection | null
  displayedDocument: DocumentDetail
  displayedReviewItems: ReviewItemSummary[]
  document: DocumentDetail
  documentId: string
  isSigningOut: boolean
  mobilePane: 'document' | 'reviews'
  onCancelProposal: () => void
  onCloseComparison: () => void
  onCommentCreated: (comment: ReviewCommentSummary) => void
  onCompareVersions: (baseVersionId: string, targetVersionId: string) => void
  onCreated: (item: ReviewItemSummary) => void
  onMobilePaneChange: (pane: 'document' | 'reviews') => void
  onResolve: (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
  onReturnToCurrentVersion: () => void
  onSelectItem: (item: ReviewItemSummary) => void
  onSignOut: () => Promise<void>
  onStartProposal: (proposal: ActiveReviewProposal) => void
  onVersionChanged: (result: VersionActionResult) => Promise<void>
  onViewVersion: (versionId: string | null) => void
  participants: PresenceParticipant[]
  selectedItemId: string | null
  selectedStableKey?: string
  user: { id: string; name: string }
  versions: DocumentVersionSummary[]
  viewedVersionId: string | null
  workspace: WorkspaceSummary
}

function getViewMode(isComparing: boolean, isHistorical: boolean) {
  if (isComparing) return 'comparison' as const
  if (isHistorical) return 'historical' as const
  return 'current' as const
}

export function DocumentReviewPageContent({
  activeProposal,
  comparisonSelection,
  displayedDocument,
  displayedReviewItems,
  document,
  documentId,
  isSigningOut,
  mobilePane,
  onCancelProposal,
  onCloseComparison,
  onCommentCreated,
  onCompareVersions,
  onCreated,
  onMobilePaneChange,
  onResolve,
  onReturnToCurrentVersion,
  onSelectItem,
  onSignOut,
  onStartProposal,
  onVersionChanged,
  onViewVersion,
  participants,
  selectedItemId,
  selectedStableKey,
  user,
  versions,
  viewedVersionId,
  workspace,
}: DocumentReviewPageContentProps) {
  const capabilities = document.capabilities
  const isViewingHistoricalVersion = !displayedDocument.version.isCurrent
  const isComparingVersions = comparisonSelection !== null

  return (
    <div className="min-h-screen bg-[#f3f2ed]">
      <WorkspaceHeader
        canManageReviewers={workspace.capabilities.manageReviewers}
        isSigningOut={isSigningOut}
        onSignOut={() => void onSignOut()}
        organizationName={workspace.organization.name}
        userName={user.name}
      />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7" id="main-content">
        <DocumentReviewHeader
          documentId={documentId}
          documentTitle={document.document.title}
          exportPermissions={{
            document: capabilities.exportDocument,
            reviewQueue: capabilities.exportReviewQueue,
          }}
          participants={participants}
          reviewRoundName={displayedDocument.reviewRound.name}
          userId={user.id}
          viewMode={getViewMode(isComparingVersions, isViewingHistoricalVersion)}
          versionNumber={displayedDocument.version.versionNumber}
        />

        {!isComparingVersions ? (
          <VersionHistoryPanel
            canDownloadVersions={capabilities.exportDocument}
            canManageVersions={capabilities.manageVersions}
            currentVersionId={document.version.id}
            documentId={documentId}
            onCompareVersions={onCompareVersions}
            onVersionChanged={onVersionChanged}
            onViewVersion={onViewVersion}
            versions={versions}
            viewedVersionId={viewedVersionId}
          />
        ) : null}

        {!isComparingVersions ? (
          <SignaturePanel
            canManage={capabilities.manageSignatures}
            documentId={documentId}
            documentTitle={document.document.title}
            documentVersionId={displayedDocument.version.id}
            userId={user.id}
            versionNumber={displayedDocument.version.versionNumber}
          />
        ) : null}

        {capabilities.viewAudit && !isComparingVersions ? (
          <DocumentAuditPanel documentId={documentId} />
        ) : null}

        {capabilities.manageAssignments && !isViewingHistoricalVersion && !isComparingVersions ? (
          <ReviewRoundAssignmentsPanel
            documentId={documentId}
            reviewRoundId={displayedDocument.reviewRound.id}
            reviewRoundName={displayedDocument.reviewRound.name}
          />
        ) : null}

        {!isComparingVersions && isViewingHistoricalVersion ? (
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
        ) : null}

        {comparisonSelection ? (
          <DocumentVersionComparisonWorkspace
            baseVersionId={comparisonSelection.baseVersionId}
            documentId={documentId}
            onClose={onCloseComparison}
            targetVersionId={comparisonSelection.targetVersionId}
            userId={user.id}
          />
        ) : (
          <DocumentReviewWorkspace
            activeProposal={activeProposal}
            document={displayedDocument}
            documentId={documentId}
            isViewingHistoricalVersion={isViewingHistoricalVersion}
            items={displayedReviewItems}
            mobilePane={mobilePane}
            onCancelProposal={onCancelProposal}
            onCommentCreated={onCommentCreated}
            onCreated={onCreated}
            onMobilePaneChange={onMobilePaneChange}
            onResolve={onResolve}
            onSelectItem={onSelectItem}
            onStartProposal={onStartProposal}
            selectedItemId={selectedItemId}
            selectedStableKey={selectedStableKey}
            userId={user.id}
          />
        )}
      </main>
    </div>
  )
}
