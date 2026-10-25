import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DocumentBlockView } from './document-block-view'

import type { DocumentDetail } from '#/types/documents'

const paragraph: DocumentDetail['blocks'][number] = {
  id: 'block-1',
  stableKey: 'paragraph-1',
  ordinal: 0,
  blockType: 'paragraph',
  text: 'A paragraph under review.',
  headingLevel: null,
  contentHash: 'hash',
}
const latexParagraph = {
  ...paragraph,
  text: 'Use $E = mc^2$ and <script>alert(1)</script>.',
}

afterEach(cleanup)

describe('DocumentBlockView', () => {
  it('offers separate replacement and deletion proposal actions', async () => {
    const user = userEvent.setup()
    const onProposeReplacement = vi.fn<() => void>()
    const onProposeDeletion = vi.fn<() => void>()

    render(
      <DocumentBlockView
        block={paragraph}
        onProposeDeletion={onProposeDeletion}
        onProposeReplacement={onProposeReplacement}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Replace' }))
    await user.click(screen.getByRole('button', { name: 'Propose deletion' }))

    expect(onProposeReplacement).toHaveBeenCalledOnce()
    expect(onProposeDeletion).toHaveBeenCalledOnce()
  })

  it('renders mathematical text accessibly without interpreting manuscript HTML', () => {
    const { container } = render(
      <DocumentBlockView block={latexParagraph} presentation="latex-rendered" />,
    )

    expect(screen.getByRole('button', { name: 'Mathematical expression: E = mc^2' })).toBeVisible()
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
  })
})
