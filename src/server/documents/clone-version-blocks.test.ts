import { describe, expect, it } from 'vitest'

import { hashText } from '#/domain/review/selection-anchor'

import { cloneVersionBlocks } from './clone-version-blocks'

describe('cloneVersionBlocks', () => {
  it('preserves stable keys and remaps parent relationships into the new version', () => {
    const ids = ['new-parent', 'new-child']
    const result = cloneVersionBlocks({
      documentVersionId: 'new-version',
      createId: () => ids.shift()!,
      blocks: [
        {
          id: 'old-parent',
          parentBlockId: null,
          stableKey: 'table-1',
          ordinal: 0,
          blockType: 'table',
          text: '',
          headingLevel: null,
          contentHash: hashText(''),
          attributes: {},
        },
        {
          id: 'old-child',
          parentBlockId: 'old-parent',
          stableKey: 'cell-1',
          ordinal: 1,
          blockType: 'table_cell',
          text: 'Original',
          headingLevel: null,
          contentHash: hashText('Original'),
          attributes: {},
        },
      ],
      changes: [{ changeType: 'replace', targetBlockId: 'old-child', finalContent: 'Replacement' }],
    })

    expect(result[0]).toMatchObject({
      id: 'new-parent',
      documentVersionId: 'new-version',
      parentBlockId: null,
      stableKey: 'table-1',
    })
    expect(result[1]).toMatchObject({
      id: 'new-child',
      parentBlockId: 'new-parent',
      text: 'Replacement',
      contentHash: hashText('Replacement'),
    })
  })

  it('omits deleted paragraphs and normalises the remaining block order', () => {
    const ids = ['new-first', 'new-last']
    const result = cloneVersionBlocks({
      documentVersionId: 'new-version',
      createId: () => ids.shift()!,
      blocks: [
        {
          id: 'first',
          parentBlockId: null,
          stableKey: 'paragraph-1',
          ordinal: 0,
          blockType: 'paragraph',
          text: 'First',
          headingLevel: null,
          contentHash: hashText('First'),
          attributes: {},
        },
        {
          id: 'deleted',
          parentBlockId: null,
          stableKey: 'paragraph-2',
          ordinal: 1,
          blockType: 'paragraph',
          text: 'Delete me',
          headingLevel: null,
          contentHash: hashText('Delete me'),
          attributes: {},
        },
        {
          id: 'last',
          parentBlockId: null,
          stableKey: 'paragraph-3',
          ordinal: 2,
          blockType: 'paragraph',
          text: 'Last',
          headingLevel: null,
          contentHash: hashText('Last'),
          attributes: {},
        },
      ],
      changes: [{ changeType: 'delete', targetBlockId: 'deleted', finalContent: null }],
    })

    expect(result.map((block) => block.stableKey)).toEqual(['paragraph-1', 'paragraph-3'])
    expect(result.map((block) => block.ordinal)).toEqual([0, 1])
  })
})
