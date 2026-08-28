import { AuthRecoveryLayout } from '#/components/auth/auth-recovery-layout'
import { ForgotPasswordForm } from '#/components/auth/forgot-password-form'

export function ForgotPasswordPage() {
  return (
    <AuthRecoveryLayout
      description="Enter the email address associated with your Redline account. We will send a one-time link if the account exists."
      title="Reset your password."
    >
      <ForgotPasswordForm />
    </AuthRecoveryLayout>
  )
}
