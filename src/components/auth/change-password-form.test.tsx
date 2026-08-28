import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ChangePasswordForm } from './change-password-form'

import type { ChangePasswordAction } from './change-password-form'

afterEach(cleanup)

async function completeForm(input?: { confirmation?: string }) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Current password'), 'old-password')
  await user.type(screen.getByLabelText('New password'), 'new-password')
  await user.type(
    screen.getByLabelText('Confirm new password'),
    input?.confirmation ?? 'new-password',
  )
  await user.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('ChangePasswordForm', () => {
  it('changes the password and revokes other sessions', async () => {
    const changePassword = vi.fn<ChangePasswordAction>().mockResolvedValue({ error: null })
    render(<ChangePasswordForm changePassword={changePassword} />)

    await completeForm()

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      revokeOtherSessions: true,
    })
    expect(
      screen.getByText('Password changed. Other signed-in devices have been signed out.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toHaveValue('')
  })

  it('does not submit when the new passwords do not match', async () => {
    const changePassword = vi.fn<ChangePasswordAction>().mockResolvedValue({ error: null })
    render(<ChangePasswordForm changePassword={changePassword} />)

    await completeForm({ confirmation: 'other-password' })

    expect(changePassword).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('The new passwords do not match.')
  })

  it('announces a Better Auth error without clearing the form', async () => {
    const changePassword = vi
      .fn<ChangePasswordAction>()
      .mockResolvedValue({ error: { message: 'The current password is incorrect.' } })
    render(<ChangePasswordForm changePassword={changePassword} />)

    await completeForm()

    expect(screen.getByRole('alert')).toHaveTextContent('The current password is incorrect.')
    expect(screen.getByLabelText('Current password')).toHaveValue('old-password')
  })
})
