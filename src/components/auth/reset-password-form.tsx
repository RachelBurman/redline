import { useForm } from '@tanstack/react-form'
import { CheckCircle2, KeyRound, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

import { resetPasswordSchema } from '#/domain/auth/reset-password-schema'
import { authClient } from '#/lib/auth-client'

interface ResetPasswordResult {
  error: { message?: string } | null
}

export type ResetPasswordAction = (input: {
  newPassword: string
  token: string
}) => Promise<ResetPasswordResult>

async function resetPasswordWithBetterAuth(
  input: Parameters<ResetPasswordAction>[0],
): Promise<ResetPasswordResult> {
  return authClient.resetPassword(input)
}

export function ResetPasswordForm({
  resetPassword = resetPasswordWithBetterAuth,
  token,
}: {
  resetPassword?: ResetPasswordAction
  token: string
}) {
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [resetComplete, setResetComplete] = useState(false)
  const form = useForm({
    defaultValues: { newPassword: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setSubmissionError(null)
      const validated = resetPasswordSchema.safeParse(value)
      if (!validated.success) {
        setSubmissionError(validated.error.issues[0]?.message ?? 'Check the password details.')
        return
      }

      const result = await resetPassword({ newPassword: validated.data.newPassword, token })
      if (result.error) {
        setSubmissionError('This reset link is invalid or has expired. Request a new link.')
        return
      }
      form.reset()
      setResetComplete(true)
    },
  })

  if (resetComplete) {
    return (
      <div className="mt-7 text-center">
        <CheckCircle2 aria-hidden="true" className="mx-auto text-[#386154]" size={34} />
        <output aria-live="polite" className="mt-3 block text-sm font-semibold text-[#315a4e]">
          Your password has been reset. You can now sign in with the new password.
        </output>
        <a
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#18201d] px-5 text-sm font-bold text-white"
          href="/sign-in"
        >
          Continue to sign in
        </a>
      </div>
    )
  }

  return (
    <form
      className="mt-7 grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field name="newPassword">
        {(field) => (
          <label className="grid gap-2 text-xs font-bold text-[#47514d]">
            New password
            <input
              autoComplete="new-password"
              className="h-12 rounded-xl border border-[#d7d5ce] bg-white px-4 text-sm font-normal text-[#18201d] shadow-sm hover:border-[#b9beb9] focus:border-[#e86648] focus:outline-none"
              maxLength={128}
              minLength={8}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              required
              type="password"
              value={field.state.value}
            />
          </label>
        )}
      </form.Field>

      <form.Field name="confirmPassword">
        {(field) => (
          <label className="grid gap-2 text-xs font-bold text-[#47514d]">
            Confirm new password
            <input
              autoComplete="new-password"
              className="h-12 rounded-xl border border-[#d7d5ce] bg-white px-4 text-sm font-normal text-[#18201d] shadow-sm hover:border-[#b9beb9] focus:border-[#e86648] focus:outline-none"
              maxLength={128}
              minLength={8}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              required
              type="password"
              value={field.state.value}
            />
          </label>
        )}
      </form.Field>

      {submissionError ? (
        <p
          className="rounded-xl border border-[#e8c9c0] bg-[#fff3ef] px-4 py-3 text-sm text-[#934530]"
          role="alert"
        >
          {submissionError}
        </p>
      ) : null}

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#18201d] px-5 text-sm font-bold text-white hover:bg-[#29332f] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!canSubmit || isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
            ) : (
              <KeyRound aria-hidden="true" size={17} />
            )}
            {isSubmitting ? 'Resetting password…' : 'Reset password'}
          </button>
        )}
      </form.Subscribe>
    </form>
  )
}
