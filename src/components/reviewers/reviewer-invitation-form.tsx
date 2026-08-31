import { useForm } from '@tanstack/react-form'
import { LoaderCircle, Send } from 'lucide-react'
import { useState } from 'react'

import { authClient } from '#/lib/auth-client'

export function ReviewerInvitationForm({
  organizationId,
  onInvited,
}: {
  organizationId: string
  onInvited: () => void
}) {
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setSubmissionError(null)
      setConfirmation(null)
      const email = value.email.trim().toLowerCase()
      const result = await authClient.organization.inviteMember({
        email,
        role: 'reviewer',
        organizationId,
      })
      if (result.error) {
        setSubmissionError(result.error.message ?? 'The reviewer could not be invited.')
        return
      }
      setConfirmation(`Invitation sent to ${email}.`)
      form.reset()
      onInvited()
    },
  })

  return (
    <form
      className="mt-5"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field name="email">
        {(field) => (
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-[#47514d]">Reviewer email</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                autoComplete="email"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#d7d5ce] bg-white px-4 text-sm text-[#18201d] focus:border-[#e86648] focus:outline-none"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="reviewer@example.com"
                required
                type="email"
                value={field.state.value}
              />
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#18201d] px-5 text-sm font-bold text-white disabled:opacity-55"
                    disabled={!canSubmit || isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
                    ) : (
                      <Send aria-hidden="true" size={16} />
                    )}
                    Send invitation
                  </button>
                )}
              </form.Subscribe>
            </div>
          </label>
        )}
      </form.Field>
      {submissionError ? (
        <p className="mt-3 text-sm text-[#934530]" role="alert">
          {submissionError}
        </p>
      ) : null}
      {confirmation ? (
        <output className="mt-3 block text-sm font-semibold text-[#315a4e]">{confirmation}</output>
      ) : null}
    </form>
  )
}
