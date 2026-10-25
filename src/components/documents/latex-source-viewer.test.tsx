import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LatexSourceViewer } from './latex-source-viewer'

import type { DocumentBlockDetail } from '#/types/documents'
import type { DocumentInsertionAnchor } from '#/types/documents'

const paragraph: DocumentBlockDetail = {
  id: 'block-1',
  stableKey: 'paragraph-1',
  ordinal: 0,
  blockType: 'paragraph',
  text: 'Original & canonical.',
  headingLevel: null,
  contentHash: 'hash',
}
const paragraphs = [paragraph]
const insertionAnchor = {
  afterBlock: paragraph,
  beforeBlockId: null,
} satisfies DocumentInsertionAnchor
const insertionAnchors = [insertionAnchor]

afterEach(cleanup)

describe('LatexSourceViewer', () => {
  it('parses an edit to canonical text before opening the normal proposal flow', async () => {
    const onPropose = vi.fn<(block: DocumentBlockDetail, proposedContent: string) => void>()
    const user = userEvent.setup()
    render(
      <LatexSourceViewer
        blocks={paragraphs}
        canInsert={false}
        canReview
        insertionAnchors={insertionAnchors}
        onPropose={onPropose}
        onProposeDeletion={vi.fn<(block: DocumentBlockDetail) => void>()}
        onProposeInsertion={vi.fn<() => void>()}
      />,
    )

    const source = screen.getByRole('textbox', { name: 'LaTeX source for block 1' })
    await user.clear(source)
    await user.type(source, 'Revised \\& canonical.')
    await user.click(screen.getByRole('button', { name: 'Propose source edit' }))

    expect(onPropose).toHaveBeenCalledWith(paragraph, 'Revised & canonical.')
  })

  it('rejects an unsafe command without creating a proposal', async () => {
    const onPropose = vi.fn<(block: DocumentBlockDetail, proposedContent: string) => void>()
    const user = userEvent.setup()
    render(
      <LatexSourceViewer
        blocks={paragraphs}
        canInsert={false}
        canReview
        insertionAnchors={insertionAnchors}
        onPropose={onPropose}
        onProposeDeletion={vi.fn<(block: DocumentBlockDetail) => void>()}
        onProposeInsertion={vi.fn<() => void>()}
      />,
    )

    const source = screen.getByRole('textbox', { name: 'LaTeX source for block 1' })
    await user.clear(source)
    await user.type(source, '\\input{{/etc/passwd}}')
    await user.click(screen.getByRole('button', { name: 'Propose source edit' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Unsupported LaTeX command \\input')
    expect(onPropose).not.toHaveBeenCalled()
  })

  it('parses an insertion before opening the anchored insertion proposal', async () => {
    const onProposeInsertion =
      vi.fn<(anchor: DocumentInsertionAnchor, proposedContent: string) => void>()
    const user = userEvent.setup()
    render(
      <LatexSourceViewer
        blocks={paragraphs}
        canInsert
        canReview
        insertionAnchors={insertionAnchors}
        onPropose={vi.fn<() => void>()}
        onProposeDeletion={vi.fn<() => void>()}
        onProposeInsertion={onProposeInsertion}
      />,
    )

    await user.type(
      screen.getByRole('textbox', { name: 'New paragraph LaTeX source' }),
      'New \\& canonical paragraph.',
    )
    await user.click(screen.getByRole('button', { name: 'Propose paragraph at end' }))

    expect(onProposeInsertion).toHaveBeenCalledWith(insertionAnchor, 'New & canonical paragraph.')
  })
})
