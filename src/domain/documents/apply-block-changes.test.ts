import { describe, expect, it } from 'vitest'

import { hashText } from '#/domain/review/selection-anchor'

import { applyBlockChanges } from './apply-block-changes'

function paragraph(id: string, ordinal: number, text: string, stableKey = id) {
  return {
    id,
    stableKey,
    ordinal,
    blockType: 'paragraph',
    text,
    headingLevel: null,
    contentHash: hashText(text),
  }
}

describe('applyBlockChanges', () => {
  it('materialises accepted replacements while preserving block identity and order', () => {
    const blocks = [
      paragraph('heading', 0, 'Methods'),
      paragraph('paragraph', 1, 'Twenty participants.'),
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
        ...blocks[1],
        text: 'Twenty-four participants.',
        contentHash: hashText('Twenty-four participants.'),
      },
    ])
    expect(result[0]).toBe(blocks[0])
  })

  it('omits accepted deletions from the clean document', () => {
    const blocks = [
      paragraph('keep', 0, 'Keep this paragraph.'),
      paragraph('delete', 1, 'Remove this paragraph.'),
    ]

    expect(
      applyBlockChanges(blocks, [
        { changeType: 'delete', targetBlockId: 'delete', finalContent: null },
      ]),
    ).toEqual([blocks[0]])
  })

  it('inserts accepted paragraphs after their immutable anchor', () => {
    const blocks = [paragraph('anchor', 0, 'Existing paragraph.')]

    expect(
      applyBlockChanges(blocks, [
        {
          changeType: 'insert',
          targetBlockId: 'anchor',
          insertedBlockId: 'review-1',
          insertedStableKey: 'insert-review-1',
          finalContent: 'First added paragraph.',
        },
        {
          changeType: 'insert',
          targetBlockId: 'anchor',
          insertedBlockId: 'review-2',
          insertedStableKey: 'insert-review-2',
          finalContent: 'Second added paragraph.',
        },
      ]),
    ).toEqual([
      blocks[0],
      paragraph('review-1', 1, 'First added paragraph.', 'insert-review-1'),
      paragraph('review-2', 2, 'Second added paragraph.', 'insert-review-2'),
    ])
  })

  it('keeps an insertion when its anchor paragraph is also deleted', () => {
    const blocks = [paragraph('anchor', 0, 'Delete the only paragraph.')]

    expect(
      applyBlockChanges(blocks, [
        { changeType: 'delete', targetBlockId: 'anchor', finalContent: null },
        {
          changeType: 'insert',
          targetBlockId: 'anchor',
          insertedBlockId: 'review-1',
          insertedStableKey: 'insert-review-1',
          finalContent: 'The replacement paragraph.',
        },
      ]),
    ).toEqual([paragraph('review-1', 0, 'The replacement paragraph.', 'insert-review-1')])
  })

  it('leaves immutable version blocks unchanged when there are no accepted changes', () => {
    const blocks = [paragraph('paragraph', 0, 'Original')]

    expect(applyBlockChanges(blocks, [])).toEqual(blocks)
  })
})
