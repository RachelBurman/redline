import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { AcceptInvitationContent } from '#/components/auth/accept-invitation-content'
import { AuthRecoveryLayout } from '#/components/auth/auth-recovery-layout'
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
      <AcceptInvitationContent
        acceptError={accept.error?.message}
        invitation={invitation.data}
        invitationError={invitation.error?.message}
        invitationIsPending={invitation.isPending}
        isAccepting={accept.isPending}
        isResendingVerification={resendVerification.isPending}
        onAccept={() => accept.mutate()}
        onResendVerification={() => resendVerification.mutate()}
        redirectTo={redirectTo}
        resendError={resendVerification.error?.message}
        sessionIsPending={session.isPending}
        user={session.data?.user}
        verificationSent={verificationSent}
      />
    </AuthRecoveryLayout>
  )
}
