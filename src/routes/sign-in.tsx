import { createFileRoute } from '@tanstack/react-router'

import { AuthPage } from '#/features/auth/auth-page'

export const Route = createFileRoute('/sign-in')({
  component: () => <AuthPage mode="sign-in" />,
})
