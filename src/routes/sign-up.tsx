import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { AuthPage } from '#/features/auth/auth-page'

export const Route = createFileRoute('/sign-up')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: SignUpRoute,
})

function SignUpRoute() {
  const search = Route.useSearch()
  return <AuthPage mode="sign-up" redirectTo={search.redirect} />
}
