import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WorkspaceHeader } from './workspace-header'

afterEach(cleanup)

describe('WorkspaceHeader', () => {
  it('provides a direct link to change the signed-in user password', () => {
    render(
      <WorkspaceHeader
        isSigningOut={false}
        onSignOut={vi.fn<() => void>()}
        organizationName="Example workspace"
        userName="Alex Morgan"
      />,
    )

    expect(screen.getByRole('link', { name: 'Change password' })).toHaveAttribute(
      'href',
      '/app/account',
    )
  })

  it('keeps sign out available beside the password control', async () => {
    const onSignOut = vi.fn<() => void>()
    render(
      <WorkspaceHeader
        isSigningOut={false}
        onSignOut={onSignOut}
        organizationName="Example workspace"
        userName="Alex Morgan"
      />,
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
