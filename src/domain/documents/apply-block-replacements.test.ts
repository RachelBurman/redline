import { describe, expect, it } from 'vitest'

import { hashText } from '#/domain/review/selection-anchor'

import { applyBlockReplacements } from './apply-block-replacements'

describe('applyBlockReplacements', () => {
  it('materialises accepted replacements while preserving block identity and order', () => {
    const blocks = [
      { id: 'heading', ordinal: 0, text: 'Methods', contentHash: hashText('Methods') },
      {
        id: 'paragraph',
        ordinal: 1,
        text: 'Twenty participants.',
        contentHash: hashText('Twenty participants.'),
      },
    ]

    const result = applyBlockReplacements(blocks, [
      { targetBlockId: 'paragraph', finalContent: 'Twenty-four participants.' },
    ])

    expect(result).toEqual([
      blocks[0],
      {
        id: 'paragraph',
        ordinal: 1,
        text: 'Twenty-four participants.',
        contentHash: hashText('Twenty-four participants.'),
      },
    ])
    expect(result[0]).toBe(blocks[0])
  })

  it('leaves immutable version blocks unchanged when there are no accepted replacements', () => {
    const blocks = [{ id: 'paragraph', text: 'Original', contentHash: hashText('Original') }]

    expect(applyBlockReplacements(blocks, [])).toEqual(blocks)
  })
})
