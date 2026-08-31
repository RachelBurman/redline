import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { Dialog } from './dialog'

function DialogHarness() {
  const [open, setOpen] = useState(false)
  const initialFocusRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open restore dialog
      </button>
      <Dialog
        description="Pending review work on the current version will be superseded."
        initialFocusRef={initialFocusRef}
        onOpenChange={setOpen}
        open={open}
        title="Restore version 1?"
      >
        <label>
          Reason
          <input ref={initialFocusRef} />
        </label>
        <button onClick={() => setOpen(false)} type="button">
          Cancel restore
        </button>
      </Dialog>
    </>
  )
}

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('Dialog', () => {
  it('opens as an accessible native modal, moves focus, and restores it when closed', async () => {
    render(<DialogHarness />)
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Open restore dialog' })

    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Restore version 1?' })
    expect(dialog.tagName).toBe('DIALOG')
    expect(dialog).toHaveAccessibleDescription(
      'Pending review work on the current version will be superseded.',
    )
    expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')

    await user.click(screen.getByRole('button', { name: 'Cancel restore' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<DialogHarness />)
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Open restore dialog' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog')

    fireEvent(dialog, new Event('cancel', { cancelable: true }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('ignores content clicks and closes only when the backdrop surface is clicked', async () => {
    render(<DialogHarness />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Open restore dialog' }))
    const dialog = screen.getByRole('dialog')

    await user.click(screen.getByRole('heading', { name: 'Restore version 1?' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(dialog)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
