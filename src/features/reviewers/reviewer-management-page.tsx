import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, Mail, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ReviewerInvitationForm } from '#/components/reviewers/reviewer-invitation-form'
import { WorkspaceHeader } from '#/components/workspace/workspace-header'
import { apiRequest } from '#/lib/api-client'
import { authClient } from '#/lib/auth-client'

import type { ReviewerManagementSummary } from '#/types/reviewers'

interface WorkspaceSummary {
  organization: { id: string; name: string; slug: string; role: string }
  project: { id: string; name: string }
}

export function ReviewerManagementPage() {
  const session = authClient.useSession()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const workspace = useQuery({
    queryKey: ['workspace'],
    queryFn: () => apiRequest<WorkspaceSummary>('/api/v1/workspace'),
    enabled: Boolean(session.data?.user),
  })
  const reviewers = useQuery({
    queryKey: ['reviewer-management'],
    queryFn: () => apiRequest<ReviewerManagementSummary>('/api/v1/reviewers'),
    enabled: Boolean(session.data?.user && workspace.data),
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
    (!reviewers.data && reviewers.isPending)
  ) {
    return (
      <main className="grid min-h-screen place-items-center" id="main-content">
        <output className="flex items-center gap-3 text-sm font-semibold text-[#59635f]">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
          Loading reviewers…
        </output>
      </main>
    )
  }

  if (!session.data?.user) return null

  if (!workspace.data || !reviewers.data) {
    return (
      <main className="grid min-h-screen place-items-center px-5" id="main-content">
        <p
          className="rounded-xl border border-[#e8c9c0] bg-[#fff3ef] px-4 py-3 text-sm text-[#934530]"
          role="alert"
        >
          {workspace.error?.message ??
            reviewers.error?.message ??
            'Reviewer access is unavailable.'}
        </p>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f2ed]">
      <WorkspaceHeader
        canManageReviewers
        isSigningOut={isSigningOut}
        onSignOut={() => void handleSignOut()}
        organizationName={workspace.data.organization.name}
        userName={session.data.user.name}
      />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8" id="main-content">
        <a
          className="text-sm font-bold text-[#934530] underline-offset-4 hover:underline"
          href="/app"
        >
          ← Back to documents
        </a>
        <section className="mt-5 rounded-2xl border border-[#dcd9d1] bg-white p-6 shadow-sm sm:p-8">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#4c6d62]">
            <Users aria-hidden="true" size={15} /> Review team
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.035em] text-[#202b27]">
            Invite reviewers.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68726d]">
            Invitations grant the reviewer role for this organisation. A recipient must sign in
            with, and verify, the invited email address before joining.
          </p>
          <ReviewerInvitationForm
            onInvited={() =>
              void queryClient.invalidateQueries({ queryKey: ['reviewer-management'] })
            }
            organizationId={workspace.data.organization.id}
          />
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#dcd9d1] bg-white p-6">
            <h2 className="font-serif text-xl font-semibold text-[#202b27]">
              Organisation members
            </h2>
            <ul className="mt-4 divide-y divide-[#ece9e1]">
              {reviewers.data.members.map((organizationMember) => (
                <li
                  className="flex items-start justify-between gap-4 py-4"
                  key={organizationMember.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#28332f]">
                      {organizationMember.name}
                    </p>
                    <p className="truncate text-xs text-[#68726d]">{organizationMember.email}</p>
                  </div>
                  <span className="rounded-full bg-[#edf2ef] px-2.5 py-1 text-[11px] font-bold text-[#466057] capitalize">
                    {organizationMember.role}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#dcd9d1] bg-white p-6">
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#202b27]">
              <Mail aria-hidden="true" size={18} /> Pending invitations
            </h2>
            {reviewers.data.pendingInvitations.length === 0 ? (
              <p className="mt-4 text-sm text-[#68726d]">
                No invitations are waiting for acceptance.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[#ece9e1]">
                {reviewers.data.pendingInvitations.map((pendingInvitation) => (
                  <li className="py-4" key={pendingInvitation.id}>
                    <p className="truncate text-sm font-bold text-[#28332f]">
                      {pendingInvitation.email}
                    </p>
                    <p className="mt-1 text-xs text-[#68726d]">
                      Reviewer invitation · expires{' '}
                      {new Date(pendingInvitation.expiresAt).toLocaleDateString('en-GB', {
                        timeZone: 'UTC',
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
