import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { DocumentViewer } from '#/components/documents/document-viewer'
import { ExportDocumentButton } from '#/components/documents/export-document-button'
import { ParserWarnings } from '#/components/documents/parser-warnings'
import { ReviewSidebar } from '#/components/reviews/review-sidebar'
import { WorkspaceHeader } from '#/components/workspace/workspace-header'
import { apiRequest } from '#/lib/api-client'
import { authClient } from '#/lib/auth-client'

import type { DocumentDetail } from '#/types/documents'
import type { ResolveReviewItemResult, ReviewItemSummary } from '#/types/reviews'

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
  const workspace = useQuery({
    queryKey: ['workspace'],
    queryFn: () => apiRequest<WorkspaceSummary>('/api/v1/workspace'),
    enabled: Boolean(session.data?.user),
  })
  const document = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => apiRequest<DocumentDetail>(`/api/v1/documents/${documentId}`),
    enabled: Boolean(session.data?.user),
  })
  const reviewItems = useQuery({
    queryKey: ['review-items', documentId],
    queryFn: () => apiRequest<ReviewItemSummary[]>(`/api/v1/documents/${documentId}/review-items`),
    enabled: Boolean(session.data?.user),
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
      queryClient.invalidateQueries({ queryKey: ['documents'] }),
    ])
  }

  if (
    session.isPending ||
    (!workspace.data && workspace.isPending) ||
    (!document.data && document.isPending) ||
    (!reviewItems.data && reviewItems.isPending)
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

  if (!workspace.data || !document.data || !reviewItems.data) {
    const message =
      workspace.error?.message ??
      document.error?.message ??
      reviewItems.error?.message ??
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
  const selectedItem = reviewItems.data.find((item) => item.id === selectedItemId)

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
          <div className="flex items-end gap-4">
            <div className="text-right text-xs text-[#707a75]">
              <p className="font-bold text-[#49534f]">
                Version {document.data.version.versionNumber}
              </p>
              <p>{document.data.reviewRound.name}</p>
            </div>
            <ExportDocumentButton
              canExport={canExport}
              documentId={documentId}
              title={document.data.document.title}
            />
          </div>
        </div>

        <ParserWarnings warnings={document.data.version.parserWarnings} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DocumentViewer
            blocks={document.data.blocks}
            canReview={canReview}
            onPropose={(block) => {
              setActiveBlock(block)
              setSelectedItemId(null)
            }}
            selectedStableKey={activeBlock?.stableKey ?? selectedItem?.targetStableKey}
          />
          <ReviewSidebar
            activeBlock={activeBlock}
            canResolve={canResolve}
            documentId={documentId}
            documentVersionId={document.data.version.id}
            items={reviewItems.data}
            onCancelProposal={() => setActiveBlock(null)}
            onCreated={handleCreated}
            onResolve={handleResolve}
            onSelect={(item) => {
              setActiveBlock(null)
              setSelectedItemId(item.id)
            }}
            reviewRoundId={document.data.reviewRound.id}
            selectedItemId={selectedItemId}
          />
        </div>
      </main>
    </div>
  )
}
