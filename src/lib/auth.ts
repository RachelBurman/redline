import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth/minimal'
import { organization } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import * as authSchema from '#/db/auth-schema'
import { db } from '#/db/index'
import { accessControl, organizationRoles } from '#/server/auth/access-control'
import { sendPasswordResetEmail } from '#/server/email/send-password-reset-email'

export const auth = betterAuth({
  appName: 'Redline',
  basePath: '/api/v1/auth',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail({ recipient: user.email, resetUrl: url }).catch((error) => {
        console.error('Password reset email delivery failed.', error)
      })
    },
  },
  plugins: [
    organization({
      ac: accessControl,
      roles: organizationRoles,
      creatorRole: 'owner',
      requireEmailVerificationOnInvitation: true,
    }),
    tanstackStartCookies(),
  ],
})
