import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ForgotPasswordForm } from './forgot-password-form'

import type { PasswordResetRequestAction } from './forgot-password-form'

afterEach(cleanup)

describe('ForgotPasswordForm', () => {
  it('requests a one-time reset link without revealing whether the account exists', async () => {
    const requestPasswordReset = vi
      .fn<PasswordResetRequestAction>()
      .mockResolvedValue({ error: null })
    render(<ForgotPasswordForm requestPasswordReset={requestPasswordReset} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Email address'), 'reviewer@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(requestPasswordReset).toHaveBeenCalledOnce()
    expect(requestPasswordReset.mock.calls[0]?.[0]).toMatchObject({
      email: 'reviewer@example.com',
    })
    expect(requestPasswordReset.mock.calls[0]?.[0].redirectTo).toMatch(/\/reset-password$/)
    expect(screen.getByText(/If an account exists for that email address/)).toBeInTheDocument()
  })

  it('shows a generic failure without exposing provider details', async () => {
    const requestPasswordReset = vi
      .fn<PasswordResetRequestAction>()
      .mockResolvedValue({ error: { message: 'Internal SMTP details' } })
    render(<ForgotPasswordForm requestPasswordReset={requestPasswordReset} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Email address'), 'reviewer@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The reset request could not be completed. Please try again.',
    )
    expect(screen.queryByText('Internal SMTP details')).not.toBeInTheDocument()
  })
})
