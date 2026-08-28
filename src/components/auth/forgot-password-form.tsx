import { useForm } from '@tanstack/react-form'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

import { authClient } from '#/lib/auth-client'

interface PasswordResetRequestResult {
  error: { message?: string } | null
}

export type PasswordResetRequestAction = (input: {
  email: string
  redirectTo: string
}) => Promise<PasswordResetRequestResult>

const passwordResetRequestSchema = z.object({ email: z.email('Enter a valid email address.') })

async function requestPasswordResetWithBetterAuth(
  input: Parameters<PasswordResetRequestAction>[0],
): Promise<PasswordResetRequestResult> {
  return authClient.requestPasswordReset(input)
}

export function ForgotPasswordForm({
  requestPasswordReset = requestPasswordResetWithBetterAuth,
}: {
  requestPasswordReset?: PasswordResetRequestAction
}) {
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [requestComplete, setRequestComplete] = useState(false)
  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setSubmissionError(null)
      const validated = passwordResetRequestSchema.safeParse(value)
      if (!validated.success) {
        setSubmissionError(validated.error.issues[0]?.message ?? 'Enter a valid email address.')
        return
      }

      const result = await requestPasswordReset({
        email: validated.data.email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (result.error) {
        setSubmissionError('The reset request could not be completed. Please try again.')
        return
      }
      setRequestComplete(true)
    },
  })

  if (requestComplete) {
    return (
      <div className="mt-7">
        <output
          aria-live="polite"
          className="block rounded-xl border border-[#bdd7cd] bg-[#f0f8f5] px-4 py-4 text-sm leading-6 text-[#315a4e]"
        >
          If an account exists for that email address, a one-time reset link has been sent.
        </output>
        {import.meta.env.DEV ? (
          <p className="mt-4 text-xs leading-5 text-[#69736e]">
            In local development, open the Mailpit inbox at{' '}
            <a className="font-bold underline" href="http://localhost:8025">
              localhost:8025
            </a>
            .
          </p>
        ) : null}
        <a
          className="mt-5 inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-bold text-[#934530] underline-offset-4 hover:underline"
          href="/sign-in"
        >
          Return to sign in
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
      <form.Field name="email">
        {(field) => (
          <label className="grid gap-2 text-xs font-bold text-[#47514d]">
            Email address
            <input
              autoComplete="email"
              className="h-12 rounded-xl border border-[#d7d5ce] bg-white px-4 text-sm font-normal text-[#18201d] shadow-sm hover:border-[#b9beb9] focus:border-[#e86648] focus:outline-none"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              required
              type="email"
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
              <ArrowRight aria-hidden="true" size={17} />
            )}
            {isSubmitting ? 'Sending reset link…' : 'Send reset link'}
          </button>
        )}
      </form.Subscribe>
      <a
        className="text-center text-sm font-bold text-[#934530] underline-offset-4 hover:underline"
        href="/sign-in"
      >
        Return to sign in
      </a>
    </form>
  )
}
