import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { AuthPage } from '#/features/auth/auth-page'

export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: SignInRoute,
})

function SignInRoute() {
  const search = Route.useSearch()
  return <AuthPage mode="sign-in" redirectTo={search.redirect} />
}
