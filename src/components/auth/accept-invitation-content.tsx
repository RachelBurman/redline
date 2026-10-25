import { CheckCircle2, LoaderCircle, MailCheck } from 'lucide-react'

import { buildAuthHref } from '#/domain/auth/safe-auth-redirect'

interface InvitationSummary {
  inviterEmail: string
  organizationName: string
  role: string
}

interface AcceptInvitationContentProps {
  acceptError?: string
  invitation?: InvitationSummary | null
  invitationError?: string
  invitationIsPending: boolean
  isAccepting: boolean
  isResendingVerification: boolean
  redirectTo: string
  resendError?: string
  sessionIsPending: boolean
  user?: { email: string; emailVerified: boolean }
  verificationSent: boolean
  onAccept: () => void
  onResendVerification: () => void
}

export function AcceptInvitationContent({
  acceptError,
  invitation,
  invitationError,
  invitationIsPending,
  isAccepting,
  isResendingVerification,
  redirectTo,
  resendError,
  sessionIsPending,
  user,
  verificationSent,
  onAccept,
  onResendVerification,
}: AcceptInvitationContentProps) {
  if (sessionIsPending) {
    return (
      <output className="mt-7 flex items-center gap-3 text-sm font-semibold text-[#59635f]">
        <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
        Checking your account…
      </output>
    )
  }

  if (!user) {
    return (
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
    )
  }

  if (!user.emailVerified) {
    return (
      <div className="mt-7 rounded-xl border border-[#d8d5cc] bg-[#faf9f5] p-4">
        <p className="text-sm font-bold text-[#28332f]">Verify {user.email}</p>
        <p className="mt-1 text-sm leading-6 text-[#68726d]">
          Open the verification email we sent, then return to this invitation.
        </p>
        <button
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#315a4e] px-4 text-sm font-bold text-white disabled:opacity-55"
          disabled={isResendingVerification}
          onClick={onResendVerification}
          type="button"
        >
          {isResendingVerification ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
          ) : (
            <MailCheck aria-hidden="true" size={16} />
          )}
          {verificationSent ? 'Verification email sent' : 'Resend verification email'}
        </button>
        {resendError ? (
          <p className="mt-3 text-sm text-[#934530]" role="alert">
            {resendError}
          </p>
        ) : null}
      </div>
    )
  }

  if (invitationIsPending) {
    return (
      <output className="mt-7 flex items-center gap-3 text-sm font-semibold text-[#59635f]">
        <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
        Loading invitation…
      </output>
    )
  }

  if (!invitation) {
    return (
      <p
        className="mt-7 rounded-xl border border-[#e8c9c0] bg-[#fff3ef] px-4 py-3 text-sm text-[#934530]"
        role="alert"
      >
        {invitationError ?? 'This invitation is invalid or has expired.'}
      </p>
    )
  }

  return (
    <div className="mt-7">
      <div className="rounded-xl border border-[#d8d5cc] bg-[#faf9f5] p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-[#28332f]">
          <CheckCircle2 aria-hidden="true" className="text-[#467464]" size={17} />
          {invitation.organizationName}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#68726d]">
          Invited by {invitation.inviterEmail} as a {invitation.role}.
        </p>
      </div>
      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#18201d] px-4 text-sm font-bold text-white disabled:opacity-55"
        disabled={isAccepting}
        onClick={onAccept}
        type="button"
      >
        {isAccepting ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
        ) : null}
        Accept invitation
      </button>
      {acceptError ? (
        <p className="mt-3 text-sm text-[#934530]" role="alert">
          {acceptError}
        </p>
      ) : null}
    </div>
  )
}
