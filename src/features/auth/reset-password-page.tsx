import { AuthRecoveryLayout } from '#/components/auth/auth-recovery-layout'
import { ResetPasswordForm } from '#/components/auth/reset-password-form'

export function ResetPasswordPage({ error, token }: { error?: string; token?: string }) {
  if (!token || error) {
    return (
      <AuthRecoveryLayout
        description="This password reset link is invalid or has expired. Request another one to continue securely."
        title="Request a new link."
      >
        <a
          className="mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#18201d] px-5 text-sm font-bold text-white"
          href="/forgot-password"
        >
          Request another reset link
        </a>
      </AuthRecoveryLayout>
    )
  }

  return (
    <AuthRecoveryLayout
      description="Choose a new password with at least 8 characters. Completing this reset signs out existing sessions."
      title="Choose a new password."
    >
      <ResetPasswordForm token={token} />
    </AuthRecoveryLayout>
  )
}
