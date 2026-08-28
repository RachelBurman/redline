import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ResetPasswordForm } from './reset-password-form'

import type { ResetPasswordAction } from './reset-password-form'

afterEach(cleanup)

async function submitNewPassword(confirmation = 'replacement-password') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('New password'), 'replacement-password')
  await user.type(screen.getByLabelText('Confirm new password'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Reset password' }))
}

describe('ResetPasswordForm', () => {
  it('submits the matching password with the one-time token', async () => {
    const resetPassword = vi.fn<ResetPasswordAction>().mockResolvedValue({ error: null })
    render(<ResetPasswordForm resetPassword={resetPassword} token="one-time-token" />)

    await submitNewPassword()

    expect(resetPassword).toHaveBeenCalledWith({
      newPassword: 'replacement-password',
      token: 'one-time-token',
    })
    expect(screen.getByText(/Your password has been reset/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue to sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    )
  })

  it('rejects a mismatched confirmation before calling Better Auth', async () => {
    const resetPassword = vi.fn<ResetPasswordAction>().mockResolvedValue({ error: null })
    render(<ResetPasswordForm resetPassword={resetPassword} token="one-time-token" />)

    await submitNewPassword('different-password')

    expect(resetPassword).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('The new passwords do not match.')
  })

  it('treats provider failures as invalid or expired reset links', async () => {
    const resetPassword = vi
      .fn<ResetPasswordAction>()
      .mockResolvedValue({ error: { message: 'Token lookup failed' } })
    render(<ResetPasswordForm resetPassword={resetPassword} token="one-time-token" />)

    await submitNewPassword()

    expect(screen.getByRole('alert')).toHaveTextContent('invalid or has expired')
    expect(screen.queryByText('Token lookup failed')).not.toBeInTheDocument()
  })
})
