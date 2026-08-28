import { useForm } from '@tanstack/react-form'
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { changePasswordSchema } from '#/domain/auth/change-password-schema'
import { authClient } from '#/lib/auth-client'

interface ChangePasswordResult {
  error: { message?: string } | null
}

export type ChangePasswordAction = (input: {
  currentPassword: string
  newPassword: string
  revokeOtherSessions: true
}) => Promise<ChangePasswordResult>

async function changePasswordWithBetterAuth(
  input: Parameters<ChangePasswordAction>[0],
): Promise<ChangePasswordResult> {
  return authClient.changePassword(input)
}

export function ChangePasswordForm({
  changePassword = changePasswordWithBetterAuth,
}: {
  changePassword?: ChangePasswordAction
}) {
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setSubmissionError(null)
      setSuccessMessage(null)
      const validated = changePasswordSchema.safeParse(value)
      if (!validated.success) {
        setSubmissionError(validated.error.issues[0]?.message ?? 'Check the password details.')
        return
      }

      const result = await changePassword({
        currentPassword: validated.data.currentPassword,
        newPassword: validated.data.newPassword,
        revokeOtherSessions: true,
      })
      if (result.error) {
        setSubmissionError(result.error.message ?? 'The password could not be changed.')
        return
      }

      form.reset()
      setSuccessMessage('Password changed. Other signed-in devices have been signed out.')
    },
  })

  return (
    <section
      aria-labelledby="change-password-heading"
      className="rounded-2xl border border-[#dcd9d1] bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f0ec] text-[#315a4e]">
          <KeyRound aria-hidden="true" size={19} />
        </span>
        <div>
          <h2
            className="font-serif text-2xl font-semibold text-[#26312d]"
            id="change-password-heading"
          >
            Change password
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#68726d]">
            Confirm your current password, then choose a new password with at least 8 characters.
          </p>
        </div>
      </div>

      <form
        className="mt-7 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Field name="currentPassword">
          {(field) => (
            <label className="grid gap-2 text-xs font-bold text-[#47514d]">
              Current password
              <input
                autoComplete="current-password"
                className="h-12 rounded-xl border border-[#d7d5ce] bg-white px-4 text-sm font-normal text-[#18201d] shadow-sm hover:border-[#b9beb9] focus:border-[#e86648] focus:outline-none"
                maxLength={128}
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

        <p className="flex items-start gap-2 rounded-xl bg-[#f4f6f3] px-4 py-3 text-xs leading-5 text-[#5d6863]">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[#386154]" size={16} />
          Changing your password signs out every other active device. This device stays signed in.
        </p>

        {submissionError ? (
          <p
            className="rounded-xl border border-[#e8c9c0] bg-[#fff3ef] px-4 py-3 text-sm text-[#934530]"
            role="alert"
          >
            {submissionError}
          </p>
        ) : null}
        {successMessage ? (
          <output
            aria-live="polite"
            className="rounded-xl border border-[#bdd7cd] bg-[#f0f8f5] px-4 py-3 text-sm font-semibold text-[#315a4e]"
          >
            {successMessage}
          </output>
        ) : null}

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#18201d] px-5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(24,32,29,0.16)] hover:bg-[#29332f] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
              ) : (
                <KeyRound aria-hidden="true" size={17} />
              )}
              {isSubmitting ? 'Changing password…' : 'Change password'}
            </button>
          )}
        </form.Subscribe>
      </form>
    </section>
  )
}
