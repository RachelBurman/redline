import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReviewerInvitationForm } from './reviewer-invitation-form'

const { inviteMember } = vi.hoisted(() => ({
  inviteMember: vi.fn<(input: unknown) => Promise<unknown>>(),
}))

vi.mock('#/lib/auth-client', () => ({
  authClient: { organization: { inviteMember } },
}))

afterEach(() => {
  cleanup()
  inviteMember.mockReset()
})

describe('ReviewerInvitationForm', () => {
  it('normalises an email and grants the reviewer role', async () => {
    inviteMember.mockResolvedValue({ data: { id: 'invitation-1' }, error: null })
    const onInvited = vi.fn<() => void>()
    render(<ReviewerInvitationForm onInvited={onInvited} organizationId="organization-1" />)

    await userEvent.setup().type(screen.getByLabelText('Reviewer email'), ' REVIEWER@Example.com ')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Send invitation' }))

    await waitFor(() => {
      expect(inviteMember).toHaveBeenCalledWith({
        email: 'reviewer@example.com',
        role: 'reviewer',
        organizationId: 'organization-1',
      })
    })
    expect(onInvited).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent('Invitation sent')
  })

  it('keeps an API failure visible without reporting success', async () => {
    inviteMember.mockResolvedValue({ data: null, error: { message: 'Already invited.' } })
    const onInvited = vi.fn<() => void>()
    render(<ReviewerInvitationForm onInvited={onInvited} organizationId="organization-1" />)

    await userEvent.setup().type(screen.getByLabelText('Reviewer email'), 'reviewer@example.com')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Already invited.')
    expect(onInvited).not.toHaveBeenCalled()
  })
})
