import { describe, expect, it } from 'vitest'

import { buildInsertionAnchors } from './build-insertion-anchors'

const blocks = [
  {
    id: 'block-1',
    stableKey: 'heading-1',
    ordinal: 0,
    blockType: 'heading' as const,
    text: 'Introduction',
    headingLevel: 1,
    contentHash: 'hash-1',
  },
  {
    id: 'block-2',
    stableKey: 'paragraph-1',
    ordinal: 1,
    blockType: 'paragraph' as const,
    text: 'First paragraph.',
    headingLevel: null,
    contentHash: 'hash-2',
  },
]

describe('buildInsertionAnchors', () => {
  it('binds each insertion to immutable blocks on both sides', () => {
    expect(buildInsertionAnchors(blocks)).toEqual([
      { afterBlock: blocks[0], beforeBlockId: 'block-2' },
      { afterBlock: blocks[1], beforeBlockId: null },
    ])
  })
})
