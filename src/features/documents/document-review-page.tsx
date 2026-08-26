import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { DocumentViewer } from '#/components/documents/document-viewer'
import { ExportDocumentButton } from '#/components/documents/export-document-button'
import { ParserWarnings } from '#/components/documents/parser-warnings'
import { VersionHistoryPanel } from '#/components/documents/version-history-panel'
import { ExportReviewQueueButton } from '#/components/reviews/export-review-queue-button'
import { PresenceBar } from '#/components/reviews/presence-bar'
import { ReviewSidebar } from '#/components/reviews/review-sidebar'
import { WorkspaceHeader } from '#/components/workspace/workspace-header'
import { apiRequest } from '#/lib/api-client'
import { authClient } from '#/lib/auth-client'

import { useDocumentPresence } from './use-document-presence'

import type { DocumentVersionSummary, VersionActionResult } from '#/types/document-versions'
import type { DocumentDetail } from '#/types/documents'
import type { PresenceParticipant } from '#/types/presence'
import type { ResolveReviewItemResult, ReviewItemSummary } from '#/types/reviews'

const emptyPresence: PresenceParticipant[] = []
const emptyReviewItems: ReviewItemSummary[] = []

interface WorkspaceSummary {
  organization: { id: string; name: string; slug: string; role: string }
  project: { id: string; name: string }
}

export function DocumentReviewPage({ documentId }: { documentId: string }) {
  const session = authClient.useSession()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [activeBlock, setActiveBlock] = useState<DocumentDetail['blocks'][number] | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [viewedVersionId, setViewedVersionId] = useState<string | null>(null)
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
    activeBlock?.stableKey ??
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
    setActiveBlock(null)
    setSelectedItemId(item.id)
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
    setActiveBlock(null)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['review-items', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['documents'] }),
    ])
  }

  async function handleVersionChanged(_result: VersionActionResult) {
    setViewedVersionId(null)
    setActiveBlock(null)
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
    return (
      <main className="grid min-h-screen place-items-center" id="main-content">
        <output className="flex items-center gap-3 text-sm font-semibold text-[#59635f]">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> Loading document…
        </output>
      </main>
    )
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
    return (
      <main className="grid min-h-screen place-items-center px-5" id="main-content">
        <section className="max-w-md rounded-2xl border border-[#e3c7be] bg-white p-7 text-center">
          <h1 className="text-xl font-bold text-[#26312d]">Document unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[#6d7672]">{message}</p>
          <Link
            className="mt-5 inline-flex rounded-lg bg-[#18201d] px-4 py-2.5 text-sm font-bold text-white"
            to="/app"
          >
            Return to workspace
          </Link>
        </section>
      </main>
    )
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

  return (
    <div className="min-h-screen bg-[#f3f2ed]">
      <WorkspaceHeader
        isSigningOut={isSigningOut}
        onSignOut={() => void handleSignOut()}
        organizationName={workspace.data.organization.name}
        userName={session.data.user.name}
      />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7" id="main-content">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              className="inline-flex items-center gap-2 text-xs font-bold text-[#69736e] hover:text-[#26312d]"
              to="/app"
            >
              <ArrowLeft aria-hidden="true" size={14} /> Workspace
            </Link>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.035em] text-[#202b27]">
              {document.data.document.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-end justify-end gap-4">
            {!isViewingHistoricalVersion ? (
              <PresenceBar
                currentUserId={session.data.user.id}
                participants={presence.data ?? emptyPresence}
              />
            ) : null}
            <div className="text-right text-xs text-[#707a75]">
              <p className="font-bold text-[#49534f]">
                Version {displayedDocument.version.versionNumber}
              </p>
              <p>
                {isViewingHistoricalVersion
                  ? 'Historical — read only'
                  : displayedDocument.reviewRound.name}
              </p>
            </div>
            {!isViewingHistoricalVersion ? (
              <ExportDocumentButton
                canExport={canExport}
                documentId={documentId}
                title={document.data.document.title}
              />
            ) : null}
            <ExportReviewQueueButton
              canExport={canExportReviewQueue}
              documentId={documentId}
              title={document.data.document.title}
            />
          </div>
        </div>

        <VersionHistoryPanel
          canManageVersions={canManageVersions}
          currentVersionId={document.data.version.id}
          documentId={documentId}
          onVersionChanged={handleVersionChanged}
          onViewVersion={(versionId) => {
            setViewedVersionId(versionId)
            setActiveBlock(null)
            setSelectedItemId(null)
          }}
          versions={versions.data}
          viewedVersionId={viewedVersionId}
        />

        {isViewingHistoricalVersion ? (
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

        <ParserWarnings warnings={displayedDocument.version.parserWarnings} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DocumentViewer
            blocks={displayedDocument.blocks}
            canReview={canReview && !isViewingHistoricalVersion}
            onPropose={(block) => {
              setActiveBlock(block)
              setSelectedItemId(null)
            }}
            selectedStableKey={selectedStableKey}
          />
          <ReviewSidebar
            activeBlock={activeBlock}
            canResolve={canResolve && !isViewingHistoricalVersion}
            documentId={documentId}
            documentVersionId={displayedDocument.version.id}
            items={displayedReviewItems}
            onCancelProposal={() => setActiveBlock(null)}
            onCreated={handleCreated}
            onResolve={handleResolve}
            onSelect={(item) => {
              setActiveBlock(null)
              setSelectedItemId(item.id)
            }}
            reviewRoundId={displayedDocument.reviewRound.id}
            selectedItemId={selectedItemId}
          />
        </div>
      </main>
    </div>
  )
}
