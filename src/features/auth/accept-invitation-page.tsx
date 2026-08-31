import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, LoaderCircle, MailCheck } from 'lucide-react'
import { useState } from 'react'

import { AuthRecoveryLayout } from '#/components/auth/auth-recovery-layout'
import { buildAuthHref } from '#/domain/auth/safe-auth-redirect'
import { authClient } from '#/lib/auth-client'

export function AcceptInvitationPage({ invitationId }: { invitationId: string }) {
  const session = authClient.useSession()
  const [verificationSent, setVerificationSent] = useState(false)
  const redirectTo = `/accept-invitation?id=${encodeURIComponent(invitationId)}`
  const invitation = useQuery({
    queryKey: ['organization-invitation', invitationId],
    queryFn: async () => {
      const result = await authClient.organization.getInvitation({ query: { id: invitationId } })
      if (result.error)
        throw new Error(result.error.message ?? 'The invitation could not be loaded.')
      return result.data
    },
    enabled: Boolean(session.data?.user.emailVerified),
    retry: false,
  })
  const accept = useMutation({
    mutationFn: async () => {
      const result = await authClient.organization.acceptInvitation({ invitationId })
      if (result.error)
        throw new Error(result.error.message ?? 'The invitation could not be accepted.')
      return result.data
    },
    onSuccess: () => window.location.assign('/app'),
  })
  const resendVerification = useMutation({
    mutationFn: async () => {
      if (!session.data?.user) throw new Error('Sign in before requesting verification.')
      const result = await authClient.sendVerificationEmail({
        email: session.data.user.email,
        callbackURL: `${window.location.origin}${redirectTo}`,
      })
      if (result.error)
        throw new Error(result.error.message ?? 'The verification email could not be sent.')
    },
    onSuccess: () => setVerificationSent(true),
  })

  return (
    <AuthRecoveryLayout
      description="Invitations are bound to the recipient's verified email address so another account cannot claim them."
      eyebrow="Secure invitation"
      title="Join a Redline review."
    >
      {session.isPending ? (
        <output className="mt-7 flex items-center gap-3 text-sm font-semibold text-[#59635f]">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
          Checking your account…
        </output>
      ) : !session.data?.user ? (
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#18201d] px-4 text-sm font-bold text-white"
            href={buildAuthHref('/sign-in', redirectTo)}
          >
            Sign in
          </a>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d7d5ce] px-4 text-sm font-bold text-[#36413d]"
            href={buildAuthHref('/sign-up', redirectTo)}
          >
            Create account
          </a>
        </div>
      ) : !session.data.user.emailVerified ? (
        <div className="mt-7 rounded-xl border border-[#d8d5cc] bg-[#faf9f5] p-4">
          <p className="text-sm font-bold text-[#28332f]">Verify {session.data.user.email}</p>
          <p className="mt-1 text-sm leading-6 text-[#68726d]">
            Open the verification email we sent, then return to this invitation.
          </p>
          <button
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#315a4e] px-4 text-sm font-bold text-white disabled:opacity-55"
            disabled={resendVerification.isPending}
            onClick={() => resendVerification.mutate()}
            type="button"
          >
            {resendVerification.isPending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <MailCheck aria-hidden="true" size={16} />
            )}
            {verificationSent ? 'Verification email sent' : 'Resend verification email'}
          </button>
          {resendVerification.error ? (
            <p className="mt-3 text-sm text-[#934530]" role="alert">
              {resendVerification.error.message}
            </p>
          ) : null}
        </div>
      ) : invitation.isPending ? (
        <output className="mt-7 flex items-center gap-3 text-sm font-semibold text-[#59635f]">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
          Loading invitation…
        </output>
      ) : invitation.error || !invitation.data ? (
        <p
          className="mt-7 rounded-xl border border-[#e8c9c0] bg-[#fff3ef] px-4 py-3 text-sm text-[#934530]"
          role="alert"
        >
          {invitation.error?.message ?? 'This invitation is invalid or has expired.'}
        </p>
      ) : (
        <div className="mt-7">
          <div className="rounded-xl border border-[#d8d5cc] bg-[#faf9f5] p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-[#28332f]">
              <CheckCircle2 aria-hidden="true" className="text-[#467464]" size={17} />
              {invitation.data.organizationName}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#68726d]">
              Invited by {invitation.data.inviterEmail} as a {invitation.data.role}.
            </p>
          </div>
          <button
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#18201d] px-4 text-sm font-bold text-white disabled:opacity-55"
            disabled={accept.isPending}
            onClick={() => accept.mutate()}
            type="button"
          >
            {accept.isPending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
            ) : null}
            Accept invitation
          </button>
          {accept.error ? (
            <p className="mt-3 text-sm text-[#934530]" role="alert">
              {accept.error.message}
            </p>
          ) : null}
        </div>
      )}
    </AuthRecoveryLayout>
  )
}
