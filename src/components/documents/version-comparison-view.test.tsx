import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { VersionComparisonView } from './version-comparison-view'

import type { DocumentVersionComparison } from '#/types/document-versions'

const comparison: DocumentVersionComparison = {
  documentId: 'document-1',
  baseVersion: { id: 'version-1', versionNumber: 1 },
  targetVersion: { id: 'version-2', versionNumber: 2 },
  summary: { added: 0, modified: 1, removed: 1, unchanged: 1, totalChanges: 2 },
  blocks: [
    {
      stableKey: 'changed',
      changeType: 'modified',
      base: {
        stableKey: 'changed',
        ordinal: 0,
        blockType: 'paragraph',
        text: 'Original wording',
        headingLevel: null,
      },
      target: {
        stableKey: 'changed',
        ordinal: 0,
        blockType: 'paragraph',
        text: 'Approved wording',
        headingLevel: null,
      },
    },
    {
      stableKey: 'removed',
      changeType: 'removed',
      base: {
        stableKey: 'removed',
        ordinal: 1,
        blockType: 'paragraph',
        text: 'Content absent from the later version',
        headingLevel: null,
      },
      target: null,
    },
    {
      stableKey: 'same',
      changeType: 'unchanged',
      base: {
        stableKey: 'same',
        ordinal: 2,
        blockType: 'paragraph',
        text: 'Unchanged content',
        headingLevel: null,
      },
      target: {
        stableKey: 'same',
        ordinal: 1,
        blockType: 'paragraph',
        text: 'Unchanged content',
        headingLevel: null,
      },
    },
  ],
}

afterEach(cleanup)

describe('VersionComparisonView', () => {
  it('shows removed content as a neutral record without redline markup', () => {
    const { container } = render(
      <VersionComparisonView comparison={comparison} onClose={vi.fn<() => void>()} />,
    )

    expect(
      screen.getByRole('article', { name: 'Absent from later version document block' }),
    ).toHaveTextContent('Content absent from the later version')
    expect(container.querySelector('del, s, strike')).toBeNull()
    expect(container.querySelector('.line-through')).toBeNull()
    expect(screen.queryByText('Unchanged content')).not.toBeInTheDocument()
  })

  it('can reveal unchanged blocks and return to the document', async () => {
    const onClose = vi.fn<() => void>()
    render(<VersionComparisonView comparison={comparison} onClose={onClose} />)
    const user = userEvent.setup()

    await user.click(screen.getByLabelText('Show unchanged blocks'))
    expect(screen.getByText('Unchanged content')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Return to document' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
