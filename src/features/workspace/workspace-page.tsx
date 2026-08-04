import { useQuery } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { EmptyProject } from '#/components/workspace/empty-project'
import { WorkspaceHeader } from '#/components/workspace/workspace-header'
import { ApiClientError, apiRequest } from '#/lib/api-client'
import { authClient } from '#/lib/auth-client'

interface WorkspaceSummary {
  organization: { id: string; name: string; slug: string; role: string }
  project: { id: string; name: string }
}

export function WorkspacePage() {
  const session = authClient.useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const workspace = useQuery({
    queryKey: ['workspace'],
    queryFn: () => apiRequest<WorkspaceSummary>('/api/v1/workspace'),
    enabled: Boolean(session.data?.user),
    retry: (failureCount, error) =>
      !(error instanceof ApiClientError && error.status === 401) && failureCount < 2,
  })

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      window.location.replace('/sign-in')
    }
  }, [session.data?.user, session.isPending])

  async function handleSignOut() {
    setIsSigningOut(true)
    await authClient.signOut()
    window.location.assign('/')
  }

  if (session.isPending || (!workspace.data && workspace.isPending)) {
    return (
      <main className="grid min-h-screen place-items-center" id="main-content">
        <output className="flex items-center gap-3 text-sm font-semibold text-[#59635f]">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
          Preparing your workspace…
        </output>
      </main>
    )
  }

  if (!session.data?.user) {
    return null
  }

  if (workspace.isError) {
    return (
      <main className="grid min-h-screen place-items-center px-5" id="main-content">
        <section className="max-w-md rounded-2xl border border-[#e3c7be] bg-white p-7 text-center">
          <h1 className="text-xl font-bold text-[#26312d]">We could not load your workspace.</h1>
          <p className="mt-2 text-sm leading-6 text-[#6d7672]">{workspace.error.message}</p>
          <button
            className="mt-5 rounded-lg bg-[#18201d] px-4 py-2.5 text-sm font-bold text-white"
            onClick={() => void workspace.refetch()}
            type="button"
          >
            Try again
          </button>
        </section>
      </main>
    )
  }

  if (!workspace.data) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <WorkspaceHeader
        isSigningOut={isSigningOut}
        onSignOut={() => void handleSignOut()}
        organizationName={workspace.data.organization.name}
        userName={session.data.user.name}
      />
      <main id="main-content">
        <EmptyProject projectName={workspace.data.project.name} />
      </main>
    </div>
  )
}
