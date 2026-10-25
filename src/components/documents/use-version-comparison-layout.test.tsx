import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useVersionComparisonLayout } from './use-version-comparison-layout'

function LayoutPreferenceProbe({ userId }: { userId: string }) {
  const [layout, setLayout] = useVersionComparisonLayout(userId)
  return (
    <div>
      <output aria-label="Selected layout">{layout}</output>
      <button onClick={() => setLayout('split')} type="button">
        Select split
      </button>
    </div>
  )
}

beforeEach(() => window.localStorage.clear())

describe('useVersionComparisonLayout', () => {
  it('isolates the saved layout by user', async () => {
    const user = userEvent.setup()
    const view = render(<LayoutPreferenceProbe userId="user-a" />)

    await user.click(screen.getByRole('button', { name: 'Select split' }))
    expect(screen.getByLabelText('Selected layout')).toHaveTextContent('split')

    view.rerender(<LayoutPreferenceProbe userId="user-b" />)
    expect(screen.getByLabelText('Selected layout')).toHaveTextContent('unified')

    view.rerender(<LayoutPreferenceProbe userId="user-a" />)
    expect(screen.getByLabelText('Selected layout')).toHaveTextContent('split')
  })
})
