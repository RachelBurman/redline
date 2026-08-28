import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { ResetPasswordPage } from '#/features/auth/reset-password-page'

const resetPasswordSearchSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
  error: z.string().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/reset-password')({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  const search = Route.useSearch()
  return <ResetPasswordPage error={search.error} token={search.token} />
}
