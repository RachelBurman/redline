import { describe, expect, it } from 'vitest'

import { hashText } from '#/domain/review/selection-anchor'

import { applyBlockChanges } from './apply-block-changes'

describe('applyBlockChanges', () => {
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

    const result = applyBlockChanges(blocks, [
      {
        changeType: 'replace',
        targetBlockId: 'paragraph',
        finalContent: 'Twenty-four participants.',
      },
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

  it('omits accepted deletions from the clean document', () => {
    const blocks = [
      { id: 'keep', text: 'Keep this paragraph.', contentHash: hashText('Keep this paragraph.') },
      {
        id: 'delete',
        text: 'Remove this paragraph.',
        contentHash: hashText('Remove this paragraph.'),
      },
    ]

    expect(
      applyBlockChanges(blocks, [
        { changeType: 'delete', targetBlockId: 'delete', finalContent: null },
      ]),
    ).toEqual([blocks[0]])
  })

  it('leaves immutable version blocks unchanged when there are no accepted changes', () => {
    const blocks = [{ id: 'paragraph', text: 'Original', contentHash: hashText('Original') }]

    expect(applyBlockChanges(blocks, [])).toEqual(blocks)
  })
})
