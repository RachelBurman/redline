import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DocumentViewer } from './document-viewer'

import type { DocumentDetail } from '#/types/documents'

const emptyBlocks: DocumentDetail['blocks'] = []

describe('DocumentViewer', () => {
  it('keeps the add-paragraph action available when the resolved document is empty', async () => {
    const user = userEvent.setup()
    const onProposeInsertion = vi.fn<() => void>()

    render(
      <DocumentViewer
        blocks={emptyBlocks}
        canInsert
        canReview
        onPropose={vi.fn<() => void>()}
        onProposeInsertion={onProposeInsertion}
      />,
    )

    expect(screen.getByText(/resolved document is empty/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add paragraph at end' }))
    expect(onProposeInsertion).toHaveBeenCalledOnce()
  })
})
