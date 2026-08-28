import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ChangePasswordForm } from '#/components/auth/change-password-form'
import { WorkspaceHeader } from '#/components/workspace/workspace-header'
import { ApiClientError, apiRequest } from '#/lib/api-client'
import { authClient } from '#/lib/auth-client'

interface WorkspaceSummary {
  organization: { id: string; name: string; slug: string; role: string }
  project: { id: string; name: string }
}

export function AccountPage() {
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
    if (!session.isPending && !session.data?.user) window.location.replace('/sign-in')
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
          <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> Loading account…
        </output>
      </main>
    )
  }

  if (!session.data?.user) return null

  if (!workspace.data) {
    return (
      <main className="grid min-h-screen place-items-center px-5" id="main-content">
        <section className="max-w-md rounded-2xl border border-[#e3c7be] bg-white p-7 text-center">
          <h1 className="text-xl font-bold text-[#26312d]">Account unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[#6d7672]">
            {workspace.error?.message ?? 'Your account settings could not be loaded.'}
          </p>
          <button
            className="mt-5 min-h-10 rounded-lg bg-[#18201d] px-4 text-sm font-bold text-white"
            onClick={() => void workspace.refetch()}
            type="button"
          >
            Try again
          </button>
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
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12" id="main-content">
        <a
          className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-bold text-[#69736e] hover:bg-white hover:text-[#26312d]"
          href="/app"
        >
          <ArrowLeft aria-hidden="true" size={14} /> Workspace
        </a>
        <div className="mb-7 mt-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#4c6d62]">
            <ShieldCheck aria-hidden="true" size={15} /> Account security
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.035em] text-[#202b27] sm:text-4xl">
            Protect your account.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68726d]">
            Update your sign-in password without changing your organisation role, documents,
            reviews, or audit history.
          </p>
        </div>
        <ChangePasswordForm />
      </main>
    </div>
  )
}
