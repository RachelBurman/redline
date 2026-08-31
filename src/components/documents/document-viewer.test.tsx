import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DocumentViewer } from './document-viewer'

import type { DocumentDetail, DocumentInsertionAnchor } from '#/types/documents'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 78,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        size: 78,
        start: index * 78,
      })),
    measureElement: () => undefined,
    scrollToIndex: () => undefined,
  }),
}))

const emptyBlocks: DocumentDetail['blocks'] = []
const immutableAnchor = {
  afterBlock: {
    id: '5ca113d3-7070-43e3-9c0f-722fa8340417',
    stableKey: 'paragraph-1',
    ordinal: 0,
    blockType: 'paragraph' as const,
    text: 'Original paragraph.',
    headingLevel: null,
    contentHash: 'hash',
  },
  beforeBlockId: null,
} satisfies DocumentInsertionAnchor
const immutableAnchors = [immutableAnchor]
const immutableBlocks = [immutableAnchor.afterBlock]
const betweenBlockId = '0bb68c55-1bd3-49b5-8a2c-53b89c7fbc42'
const betweenAnchor = {
  ...immutableAnchor,
  beforeBlockId: betweenBlockId,
} satisfies DocumentInsertionAnchor
const betweenAnchors = [betweenAnchor]

describe('DocumentViewer', () => {
  it('keeps the add-paragraph action available when the resolved document is empty', async () => {
    const user = userEvent.setup()
    const onProposeInsertion = vi.fn<(anchor: DocumentInsertionAnchor) => void>()

    render(
      <DocumentViewer
        blocks={emptyBlocks}
        canInsert
        canReview
        insertionAnchors={immutableAnchors}
        onPropose={vi.fn<() => void>()}
        onProposeInsertion={onProposeInsertion}
      />,
    )

    expect(screen.getByText(/resolved document is empty/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add paragraph at end' }))
    expect(onProposeInsertion).toHaveBeenCalledWith(immutableAnchor)
  })

  it('offers an insertion at a visible immutable block boundary', async () => {
    const onProposeInsertion = vi.fn<(anchor: DocumentInsertionAnchor) => void>()

    render(
      <DocumentViewer
        blocks={immutableBlocks}
        canInsert
        canReview
        insertionAnchors={betweenAnchors}
        onPropose={vi.fn<() => void>()}
        onProposeInsertion={onProposeInsertion}
      />,
    )

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Add paragraph after block 1' }))
    expect(onProposeInsertion).toHaveBeenCalledWith(betweenAnchor)
  })
})
