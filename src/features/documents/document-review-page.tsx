import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { DocumentLoadingState } from '#/components/documents/document-loading-state'
import { DocumentReviewHeader } from '#/components/documents/document-review-header'
import { DocumentUnavailableState } from '#/components/documents/document-unavailable-state'
import { DocumentVersionComparisonWorkspace } from '#/components/documents/document-version-comparison-workspace'
import { DocumentViewer } from '#/components/documents/document-viewer'
import { ParserWarnings } from '#/components/documents/parser-warnings'
import { VersionHistoryPanel } from '#/components/documents/version-history-panel'
import { ReviewSidebar } from '#/components/reviews/review-sidebar'
import { WorkspaceHeader } from '#/components/workspace/workspace-header'
import { apiRequest } from '#/lib/api-client'
import { authClient } from '#/lib/auth-client'

import { useDocumentPresence } from './use-document-presence'

import type { DocumentVersionSummary, VersionActionResult } from '#/types/document-versions'
import type { DocumentDetail } from '#/types/documents'
import type { PresenceParticipant } from '#/types/presence'
import type {
  ResolveReviewItemResult,
  ReviewCommentSummary,
  ReviewItemSummary,
} from '#/types/reviews'
import type { ReviewChangeType } from '#/types/reviews'

const emptyPresence: PresenceParticipant[] = []
const emptyReviewItems: ReviewItemSummary[] = []

interface ComparisonSelection {
  baseVersionId: string
  targetVersionId: string
}

interface ActiveProposal {
  block: DocumentDetail['blocks'][number]
  changeType: ReviewChangeType
}

interface WorkspaceSummary {
  organization: { id: string; name: string; slug: string; role: string }
  project: { id: string; name: string }
}

export function DocumentReviewPage({ documentId }: { documentId: string }) {
  const session = authClient.useSession()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [activeProposal, setActiveProposal] = useState<ActiveProposal | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [viewedVersionId, setViewedVersionId] = useState<string | null>(null)
  const [comparisonSelection, setComparisonSelection] = useState<ComparisonSelection | null>(null)
  const workspace = useQuery({
    queryKey: ['workspace'],
    queryFn: () => apiRequest<WorkspaceSummary>('/api/v1/workspace'),
    enabled: Boolean(session.data?.user),
  })
  const document = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => apiRequest<DocumentDetail>(`/api/v1/documents/${documentId}`),
    enabled: Boolean(session.data?.user),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  })
  const reviewItems = useQuery({
    queryKey: ['review-items', documentId],
    queryFn: () => apiRequest<ReviewItemSummary[]>(`/api/v1/documents/${documentId}/review-items`),
    enabled: Boolean(session.data?.user),
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
  })
  const versions = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => apiRequest<DocumentVersionSummary[]>(`/api/v1/documents/${documentId}/versions`),
    enabled: Boolean(session.data?.user),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  })
  const historicalVersion = useQuery({
    queryKey: ['document-version', documentId, viewedVersionId],
    queryFn: () =>
      apiRequest<DocumentDetail>(
        `/api/v1/documents/${documentId}/versions/${viewedVersionId ?? ''}`,
      ),
    enabled: Boolean(session.data?.user && viewedVersionId),
  })
  const displayedVersionId = viewedVersionId ?? document.data?.version.id
  const displayedReviewItems = useMemo(
    () =>
      displayedVersionId
        ? (reviewItems.data?.filter((item) => item.documentVersionId === displayedVersionId) ??
          emptyReviewItems)
        : emptyReviewItems,
    [displayedVersionId, reviewItems.data],
  )
  const selectedStableKey =
    activeProposal?.block.stableKey ??
    reviewItems.data?.find((item) => item.id === selectedItemId)?.targetStableKey
  const presence = useDocumentPresence({
    documentId,
    documentVersionId: document.data?.version.id,
    selectedBlockStableKey: selectedStableKey,
    enabled: Boolean(session.data?.user && document.data),
  })

  useEffect(() => {
    if (!session.isPending && !session.data?.user) window.location.replace('/sign-in')
  }, [session.data?.user, session.isPending])

  async function handleSignOut() {
    setIsSigningOut(true)
    await authClient.signOut()
    window.location.assign('/')
  }

  function handleCreated(item: ReviewItemSummary) {
    setActiveProposal(null)
    setSelectedItemId(item.id)
    void queryClient.invalidateQueries({ queryKey: ['review-items', documentId] })
  }

  function handleCommentCreated(_comment: ReviewCommentSummary) {
    void queryClient.invalidateQueries({ queryKey: ['review-items', documentId] })
  }

  async function handleResolve(item: ReviewItemSummary, decision: 'accept' | 'reject') {
    await apiRequest<ResolveReviewItemResult>(
      `/api/v1/documents/${documentId}/review-items/${item.id}/resolve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, expectedRevision: item.revision }),
      },
    )
    setActiveProposal(null)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['review-items', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['documents'] }),
    ])
  }

  async function handleVersionChanged(_result: VersionActionResult) {
    setViewedVersionId(null)
    setComparisonSelection(null)
    setActiveProposal(null)
    setSelectedItemId(null)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['review-items', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['documents'] }),
    ])
  }

  if (
    session.isPending ||
    (!workspace.data && workspace.isPending) ||
    (!document.data && document.isPending) ||
    (!reviewItems.data && reviewItems.isPending) ||
    (!versions.data && versions.isPending) ||
    (viewedVersionId !== null && !historicalVersion.data && historicalVersion.isPending)
  ) {
    return <DocumentLoadingState />
  }

  if (!session.data?.user) return null

  if (
    !workspace.data ||
    !document.data ||
    !reviewItems.data ||
    !versions.data ||
    (viewedVersionId !== null && !historicalVersion.data)
  ) {
    const message =
      workspace.error?.message ??
      document.error?.message ??
      reviewItems.error?.message ??
      versions.error?.message ??
      historicalVersion.error?.message ??
      'The document could not be loaded.'
    return <DocumentUnavailableState message={message} />
  }

  const canReview = ['owner', 'admin', 'editor', 'reviewer'].includes(
    workspace.data.organization.role,
  )
  const canResolve = ['owner', 'admin', 'editor'].includes(workspace.data.organization.role)
  const canExport = canResolve
  const canManageVersions = canResolve
  const canExportReviewQueue = ['owner', 'admin', 'editor', 'reviewer', 'auditor'].includes(
    workspace.data.organization.role,
  )
  const displayedDocument = viewedVersionId ? historicalVersion.data! : document.data
  const isViewingHistoricalVersion = !displayedDocument.version.isCurrent
  const isComparingVersions = comparisonSelection !== null

  return (
    <div className="min-h-screen bg-[#f3f2ed]">
      <WorkspaceHeader
        isSigningOut={isSigningOut}
        onSignOut={() => void handleSignOut()}
        organizationName={workspace.data.organization.name}
        userName={session.data.user.name}
      />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7" id="main-content">
        <DocumentReviewHeader
          documentId={documentId}
          documentTitle={document.data.document.title}
          exportPermissions={{ document: canExport, reviewQueue: canExportReviewQueue }}
          participants={presence.data ?? emptyPresence}
          reviewRoundName={displayedDocument.reviewRound.name}
          userId={session.data.user.id}
          viewMode={
            isComparingVersions
              ? 'comparison'
              : isViewingHistoricalVersion
                ? 'historical'
                : 'current'
          }
          versionNumber={displayedDocument.version.versionNumber}
        />

        <VersionHistoryPanel
          canManageVersions={canManageVersions}
          currentVersionId={document.data.version.id}
          documentId={documentId}
          onCompareVersions={(baseVersionId, targetVersionId) => {
            setComparisonSelection({ baseVersionId, targetVersionId })
            setViewedVersionId(null)
            setActiveProposal(null)
            setSelectedItemId(null)
          }}
          onVersionChanged={handleVersionChanged}
          onViewVersion={(versionId) => {
            setViewedVersionId(versionId)
            setComparisonSelection(null)
            setActiveProposal(null)
            setSelectedItemId(null)
          }}
          versions={versions.data}
          viewedVersionId={viewedVersionId}
        />

        {!isComparingVersions && isViewingHistoricalVersion ? (
          <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e0c7bd] bg-[#fff8f5] px-4 py-3">
            <p className="text-xs font-semibold text-[#754b3f]">
              You are viewing immutable version {displayedDocument.version.versionNumber}. Review
              actions are disabled.
            </p>
            <button
              className="min-h-9 rounded-lg bg-[#754b3f] px-3 text-xs font-bold text-white"
              onClick={() => setViewedVersionId(null)}
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
            onClose={() => setComparisonSelection(null)}
            targetVersionId={comparisonSelection.targetVersionId}
          />
        ) : (
          <>
            <ParserWarnings warnings={displayedDocument.version.parserWarnings} />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <DocumentViewer
                blocks={displayedDocument.blocks}
                canInsert={
                  canReview &&
                  !isViewingHistoricalVersion &&
                  displayedDocument.insertionAnchor !== null
                }
                canReview={canReview && !isViewingHistoricalVersion}
                onPropose={(block, changeType) => {
                  setActiveProposal({ block, changeType })
                  setSelectedItemId(null)
                }}
                onProposeInsertion={() => {
                  const anchor = displayedDocument.insertionAnchor
                  if (!anchor) return
                  setActiveProposal({
                    changeType: 'insert',
                    block: {
                      id: anchor.blockId,
                      stableKey: anchor.stableKey,
                      ordinal: displayedDocument.blocks.length,
                      blockType: 'paragraph',
                      text: '',
                      headingLevel: null,
                      contentHash: '',
                    },
                  })
                  setSelectedItemId(null)
                }}
                selectedStableKey={selectedStableKey}
              />
              <ReviewSidebar
                activeBlock={activeProposal?.block ?? null}
                activeChangeType={activeProposal?.changeType ?? null}
                canComment={canReview && !isViewingHistoricalVersion}
                canResolve={canResolve && !isViewingHistoricalVersion}
                documentId={documentId}
                documentVersionId={displayedDocument.version.id}
                items={displayedReviewItems}
                onCancelProposal={() => setActiveProposal(null)}
                onCreated={handleCreated}
                onCommentCreated={handleCommentCreated}
                onResolve={handleResolve}
                onSelect={(item) => {
                  setActiveProposal(null)
                  setSelectedItemId(item.id)
                }}
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
