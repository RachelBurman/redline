import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { DocumentLoadingState } from '#/components/documents/document-loading-state'
import { DocumentUnavailableState } from '#/components/documents/document-unavailable-state'
import { apiRequest } from '#/lib/api-client'
import { authClient } from '#/lib/auth-client'

import { DocumentReviewPageContent, type ComparisonSelection } from './document-review-page-content'
import { useDocumentPresence } from './use-document-presence'

import type { ActiveReviewProposal } from '#/components/documents/document-review-workspace'
import type { DocumentVersionSummary, VersionActionResult } from '#/types/document-versions'
import type { DocumentDetail } from '#/types/documents'
import type { PresenceParticipant } from '#/types/presence'
import type {
  ResolveReviewItemResult,
  ReviewCommentSummary,
  ReviewItemSummary,
} from '#/types/reviews'
import type { WorkspaceSummary } from '#/types/workspace'

const emptyPresence: PresenceParticipant[] = []
const emptyReviewItems: ReviewItemSummary[] = []

interface LoadingChecks {
  documentIsPending: boolean
  hasDocument: boolean
  hasHistoricalVersion: boolean
  hasReviewItems: boolean
  hasVersions: boolean
  hasWorkspace: boolean
  historicalVersionIsPending: boolean
  reviewItemsIsPending: boolean
  sessionIsPending: boolean
  versionsIsPending: boolean
  viewingHistoricalVersion: boolean
  workspaceIsPending: boolean
}

function isPageLoading(checks: LoadingChecks) {
  return (
    checks.sessionIsPending ||
    (!checks.hasWorkspace && checks.workspaceIsPending) ||
    (!checks.hasDocument && checks.documentIsPending) ||
    (!checks.hasReviewItems && checks.reviewItemsIsPending) ||
    (!checks.hasVersions && checks.versionsIsPending) ||
    (checks.viewingHistoricalVersion &&
      !checks.hasHistoricalVersion &&
      checks.historicalVersionIsPending)
  )
}

interface ErrorChecks {
  document?: DocumentDetail
  documentError?: string
  historicalVersion?: DocumentDetail
  historicalVersionError?: string
  reviewItems?: ReviewItemSummary[]
  reviewItemsError?: string
  versions?: DocumentVersionSummary[]
  versionsError?: string
  viewedVersionId: string | null
  workspace?: WorkspaceSummary
  workspaceError?: string
}

function getPageError(checks: ErrorChecks) {
  const dataIsMissing =
    !checks.workspace ||
    !checks.document ||
    !checks.reviewItems ||
    !checks.versions ||
    (checks.viewedVersionId !== null && !checks.historicalVersion)

  if (!dataIsMissing) return null

  return (
    checks.workspaceError ??
    checks.documentError ??
    checks.reviewItemsError ??
    checks.versionsError ??
    checks.historicalVersionError ??
    'The document could not be loaded.'
  )
}

export function DocumentReviewPage({ documentId }: { documentId: string }) {
  const session = authClient.useSession()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [activeProposal, setActiveProposal] = useState<ActiveReviewProposal | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [mobilePane, setMobilePane] = useState<'document' | 'reviews'>('document')
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
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  })
  const reviewItems = useQuery({
    queryKey: ['review-items', documentId],
    queryFn: () => apiRequest<ReviewItemSummary[]>(`/api/v1/documents/${documentId}/review-items`),
    enabled: Boolean(session.data?.user),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })
  const versions = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => apiRequest<DocumentVersionSummary[]>(`/api/v1/documents/${documentId}/versions`),
    enabled: Boolean(session.data?.user),
    refetchInterval: 30_000,
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
    setMobilePane('reviews')
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

  function handleCompareVersions(baseVersionId: string, targetVersionId: string) {
    setComparisonSelection({ baseVersionId, targetVersionId })
    setViewedVersionId(null)
    setActiveProposal(null)
    setSelectedItemId(null)
  }

  function handleViewVersion(versionId: string | null) {
    setViewedVersionId(versionId)
    setComparisonSelection(null)
    setActiveProposal(null)
    setSelectedItemId(null)
  }

  function handleSelectItem(item: ReviewItemSummary) {
    setActiveProposal(null)
    setSelectedItemId(item.id)
    setMobilePane('reviews')
  }

  function handleStartProposal(proposal: ActiveReviewProposal) {
    setActiveProposal(proposal)
    setSelectedItemId(null)
    setMobilePane('reviews')
  }

  const loading = isPageLoading({
    sessionIsPending: session.isPending,
    hasWorkspace: Boolean(workspace.data),
    workspaceIsPending: workspace.isPending,
    hasDocument: Boolean(document.data),
    documentIsPending: document.isPending,
    hasReviewItems: Boolean(reviewItems.data),
    reviewItemsIsPending: reviewItems.isPending,
    hasVersions: Boolean(versions.data),
    versionsIsPending: versions.isPending,
    viewingHistoricalVersion: viewedVersionId !== null,
    hasHistoricalVersion: Boolean(historicalVersion.data),
    historicalVersionIsPending: historicalVersion.isPending,
  })

  if (loading) return <DocumentLoadingState />
  if (!session.data?.user) return null

  const errorMessage = getPageError({
    workspace: workspace.data,
    workspaceError: workspace.error?.message,
    document: document.data,
    documentError: document.error?.message,
    reviewItems: reviewItems.data,
    reviewItemsError: reviewItems.error?.message,
    versions: versions.data,
    versionsError: versions.error?.message,
    viewedVersionId,
    historicalVersion: historicalVersion.data,
    historicalVersionError: historicalVersion.error?.message,
  })

  if (errorMessage) return <DocumentUnavailableState message={errorMessage} />

  const displayedDocument = viewedVersionId ? historicalVersion.data! : document.data!

  return (
    <DocumentReviewPageContent
      activeProposal={activeProposal}
      comparisonSelection={comparisonSelection}
      displayedDocument={displayedDocument}
      displayedReviewItems={displayedReviewItems}
      document={document.data!}
      documentId={documentId}
      isSigningOut={isSigningOut}
      mobilePane={mobilePane}
      onCancelProposal={() => setActiveProposal(null)}
      onCloseComparison={() => setComparisonSelection(null)}
      onCommentCreated={handleCommentCreated}
      onCompareVersions={handleCompareVersions}
      onCreated={handleCreated}
      onMobilePaneChange={setMobilePane}
      onResolve={handleResolve}
      onReturnToCurrentVersion={() => setViewedVersionId(null)}
      onSelectItem={handleSelectItem}
      onSignOut={handleSignOut}
      onStartProposal={handleStartProposal}
      onVersionChanged={handleVersionChanged}
      onViewVersion={handleViewVersion}
      participants={presence.data ?? emptyPresence}
      selectedItemId={selectedItemId}
      selectedStableKey={selectedStableKey}
      user={session.data.user}
      versions={versions.data!}
      viewedVersionId={viewedVersionId}
      workspace={workspace.data!}
    />
  )
}
