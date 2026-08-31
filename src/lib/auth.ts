import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth/minimal'
import { organization } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import * as authSchema from '#/db/auth-schema'
import { db } from '#/db/index'
import { accessControl, organizationRoles } from '#/server/auth/access-control'
import {
  recordInvitationAccepted,
  recordInvitationCreated,
} from '#/server/auth/organization-invitation-audit'
import { sendEmailVerificationEmail } from '#/server/email/send-email-verification-email'
import { sendOrganizationInvitationEmail } from '#/server/email/send-organization-invitation-email'
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
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmailVerificationEmail({ recipient: user.email, verificationUrl: url }).catch(
        (error) => {
          console.error('Email verification delivery failed.', error)
        },
      )
    },
  },
  plugins: [
    organization({
      ac: accessControl,
      roles: organizationRoles,
      creatorRole: 'owner',
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: async ({ id, email, organization: invitedOrganization, inviter }) => {
        const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
        const invitationUrl = new URL('/accept-invitation', baseUrl)
        invitationUrl.searchParams.set('id', id)
        void sendOrganizationInvitationEmail({
          recipient: email,
          organizationName: invitedOrganization.name,
          inviterName: inviter.user.name,
          invitationUrl: invitationUrl.toString(),
        }).catch((error) => {
          console.error('Organisation invitation delivery failed.', error)
        })
      },
      organizationHooks: {
        afterCreateInvitation: async ({ invitation, inviter }) => {
          await recordInvitationCreated({ invitation, actorId: inviter.id })
        },
        afterAcceptInvitation: async ({ invitation, user: acceptingUser }) => {
          await recordInvitationAccepted({ invitation, actorId: acceptingUser.id })
        },
      },
    }),
    tanstackStartCookies(),
  ],
})
