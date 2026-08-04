import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { DocumentViewer } from '#/components/documents/document-viewer'
import { ParserWarnings } from '#/components/documents/parser-warnings'
import { WorkspaceHeader } from '#/components/workspace/workspace-header'
import { apiRequest } from '#/lib/api-client'
import { authClient } from '#/lib/auth-client'

import type { DocumentDetail } from '#/types/documents'

interface WorkspaceSummary {
  organization: { id: string; name: string; slug: string; role: string }
  project: { id: string; name: string }
}

export function DocumentReviewPage({ documentId }: { documentId: string }) {
  const session = authClient.useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
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

  useEffect(() => {
    if (!session.isPending && !session.data?.user) window.location.replace('/sign-in')
  }, [session.data?.user, session.isPending])

  async function handleSignOut() {
    setIsSigningOut(true)
    await authClient.signOut()
    window.location.assign('/')
  }

  if (
    session.isPending ||
    (!workspace.data && workspace.isPending) ||
    (!document.data && document.isPending)
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

  if (!workspace.data || !document.data) {
    const message =
      workspace.error?.message ?? document.error?.message ?? 'The document could not be loaded.'
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
          <div className="text-right text-xs text-[#707a75]">
            <p className="font-bold text-[#49534f]">
              Version {document.data.version.versionNumber}
            </p>
            <p>{document.data.reviewRound.name}</p>
          </div>
        </div>

        <ParserWarnings warnings={document.data.version.parserWarnings} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DocumentViewer blocks={document.data.blocks} />
          <aside
            className="h-fit rounded-2xl border border-[#dedbd3] bg-white p-5"
            aria-labelledby="review-queue-heading"
          >
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#a64e38] uppercase">
              Review queue
            </p>
            <h2 className="mt-2 text-lg font-bold text-[#26312d]" id="review-queue-heading">
              No proposals yet
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6e7873]">
              Paragraph replacement proposals will appear here, separate from the readable document.
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}
