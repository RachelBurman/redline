import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WordLevelVersionComparisonBlock } from './word-level-version-comparison-block'

import type { VersionComparisonBlock } from '#/types/document-versions'

const block: VersionComparisonBlock = {
  stableKey: 'paragraph-1',
  changeType: 'modified',
  base: {
    stableKey: 'paragraph-1',
    ordinal: 0,
    blockType: 'paragraph',
    text: 'A long manuscript sentence with the original wording.',
    headingLevel: null,
  },
  target: {
    stableKey: 'paragraph-1',
    ordinal: 0,
    blockType: 'paragraph',
    text: 'A long manuscript sentence with the revised wording.',
    headingLevel: null,
  },
}

afterEach(cleanup)

describe('WordLevelVersionComparisonBlock', () => {
  it('renders labelled old and new regions with semantic word changes', () => {
    const { container } = render(
      <WordLevelVersionComparisonBlock
        baseVersion={{ id: 'version-1', versionNumber: 1 }}
        block={block}
        layout="split"
        targetVersion={{ id: 'version-2', versionNumber: 2 }}
      />,
    )

    const changedRegion = screen.getByRole('article', { name: 'Changed paragraph' })
    expect(changedRegion).toHaveAccessibleDescription(
      'Changed paragraph. Version 1 is the old version and version 2 is the new version.',
    )
    expect(changedRegion).toHaveAttribute('data-comparison-layout', 'split')
    expect(screen.getByRole('region', { name: 'Old version 1' })).toHaveTextContent(
      'Removed: original',
    )
    expect(screen.getByRole('region', { name: 'New version 2' })).toHaveTextContent(
      'Added: revised',
    )
    expect(container.querySelector('del')).toHaveTextContent('original')
    expect(container.querySelector('ins')).toHaveTextContent('revised')
  })

  it('falls back to the structured comparison for unsupported content', () => {
    render(
      <WordLevelVersionComparisonBlock
        baseVersion={{ id: 'version-1', versionNumber: 1 }}
        block={{ ...block, target: { ...block.target!, blockType: 'unsupported' } }}
        layout="unified"
        targetVersion={{ id: 'version-2', versionNumber: 2 }}
      />,
    )

    expect(screen.getByRole('article', { name: 'Changed document block' })).toBeInTheDocument()
  })

  it('identifies additions, removals, and headings without relying on colour', () => {
    const view = render(
      <WordLevelVersionComparisonBlock
        baseVersion={{ id: 'version-1', versionNumber: 1 }}
        block={{ ...block, changeType: 'added', base: null }}
        layout="unified"
        targetVersion={{ id: 'version-2', versionNumber: 2 }}
      />,
    )

    expect(screen.getByRole('article', { name: 'Added paragraph' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Old version 1' })).toHaveTextContent(
      'Not present in this version.',
    )
    expect(view.container.querySelector('ins')).toHaveTextContent('Added: A long manuscript')

    view.rerender(
      <WordLevelVersionComparisonBlock
        baseVersion={{ id: 'version-1', versionNumber: 1 }}
        block={{ ...block, changeType: 'removed', target: null }}
        layout="unified"
        targetVersion={{ id: 'version-2', versionNumber: 2 }}
      />,
    )
    expect(
      screen.getByRole('article', { name: 'Absent from later version paragraph' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'New version 2' })).toHaveTextContent(
      'Not present in this version.',
    )
    expect(view.container.querySelector('del')).toHaveTextContent('Removed: A long manuscript')

    view.rerender(
      <WordLevelVersionComparisonBlock
        baseVersion={{ id: 'version-1', versionNumber: 1 }}
        block={{
          ...block,
          base: { ...block.base!, blockType: 'heading', headingLevel: 2 },
          target: { ...block.target!, blockType: 'heading', headingLevel: 2 },
        }}
        layout="unified"
        targetVersion={{ id: 'version-2', versionNumber: 2 }}
      />,
    )
    expect(screen.getByRole('article', { name: 'Changed heading level 2' })).toBeInTheDocument()
  })
})
