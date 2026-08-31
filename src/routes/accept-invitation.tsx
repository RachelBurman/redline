import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { AcceptInvitationPage } from '#/features/auth/accept-invitation-page'

export const Route = createFileRoute('/accept-invitation')({
  validateSearch: z.object({ id: z.string().min(1) }),
  component: AcceptInvitationRoute,
})

function AcceptInvitationRoute() {
  const { id } = Route.useSearch()
  return <AcceptInvitationPage invitationId={id} />
}
