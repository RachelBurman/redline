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
      replacements: [{ targetBlockId: 'old-child', finalContent: 'Replacement' }],
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
})
