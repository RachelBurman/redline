import { useForm } from '@tanstack/react-form'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

import { authClient } from '#/lib/auth-client'

export type AuthMode = 'sign-in' | 'sign-up'

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setSubmissionError(null)
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({
              name: value.name.trim(),
              email: value.email.trim(),
              password: value.password,
            })
          : await authClient.signIn.email({
              email: value.email.trim(),
              password: value.password,
            })

      if (result.error) {
        setSubmissionError(result.error.message ?? 'Authentication failed. Please try again.')
        return
      }

      window.location.assign('/app')
    },
  })

  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      {mode === 'sign-up' ? (
        <form.Field name="name">
          {(field) => (
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#47514d]">Your name</span>
              <input
                autoComplete="name"
                className="h-12 w-full rounded-xl border border-[#d7d5ce] bg-white px-4 text-sm text-[#18201d] shadow-sm transition-colors placeholder:text-[#a1a6a3] hover:border-[#b9beb9] focus:border-[#e86648] focus:outline-none"
                minLength={2}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Alex Morgan"
                required
                type="text"
                value={field.state.value}
              />
            </label>
          )}
        </form.Field>
      ) : null}

      <form.Field name="email">
        {(field) => (
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-[#47514d]">Email address</span>
            <input
              autoComplete="email"
              className="h-12 w-full rounded-xl border border-[#d7d5ce] bg-white px-4 text-sm text-[#18201d] shadow-sm transition-colors placeholder:text-[#a1a6a3] hover:border-[#b9beb9] focus:border-[#e86648] focus:outline-none"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="alex@example.com"
              required
              type="email"
              value={field.state.value}
            />
          </label>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-[#47514d]">Password</span>
            <input
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              className="h-12 w-full rounded-xl border border-[#d7d5ce] bg-white px-4 text-sm text-[#18201d] shadow-sm transition-colors placeholder:text-[#a1a6a3] hover:border-[#b9beb9] focus:border-[#e86648] focus:outline-none"
              minLength={8}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="At least 8 characters"
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
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#18201d] px-5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(24,32,29,0.18)] transition-colors hover:bg-[#29332f] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!canSubmit || isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
            ) : (
              <ArrowRight aria-hidden="true" size={17} />
            )}
            {mode === 'sign-up' ? 'Create your workspace' : 'Sign in to Redline'}
          </button>
        )}
      </form.Subscribe>
    </form>
  )
}
