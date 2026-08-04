import { describe, expect, it } from 'vitest'

import {
  StaleSelectionError,
  assertSelectionAnchorMatches,
  createTextSelectionAnchor,
} from './selection-anchor'

describe('text selection anchors', () => {
  it('captures UTF-16 offsets, exact text, context, and the source hash', () => {
    const blockText = 'The primary endpoint is overall survival at 12 months.'
    const startOffset = blockText.indexOf('overall survival')
    const endOffset = startOffset + 'overall survival'.length
    const anchor = createTextSelectionAnchor({
      documentVersionId: 'version-1',
      blockId: 'block-4',
      blockText,
      startOffset,
      endOffset,
    })

    expect(anchor.quote).toBe('overall survival')
    expect(anchor.prefix).toContain('primary endpoint')
    expect(anchor.suffix).toContain('12 months')
    expect(anchor.contentHash).toHaveLength(64)
  })

  it('accepts an unchanged target in the same version', () => {
    const blockText = 'Participants will be followed for 24 weeks.'
    const anchor = createTextSelectionAnchor({
      documentVersionId: 'version-2',
      blockId: 'block-8',
      blockText,
      startOffset: 0,
      endOffset: blockText.length,
    })

    expect(() =>
      assertSelectionAnchorMatches({
        anchor,
        documentVersionId: 'version-2',
        blockId: 'block-8',
        blockText,
      }),
    ).not.toThrow()
  })

  it('rejects silently moving a target to another version', () => {
    const blockText = 'Use a two-sided significance level of 0.05.'
    const anchor = createTextSelectionAnchor({
      documentVersionId: 'version-2',
      blockId: 'block-9',
      blockText,
      startOffset: 6,
      endOffset: 15,
    })

    expect(() =>
      assertSelectionAnchorMatches({
        anchor,
        documentVersionId: 'version-3',
        blockId: 'block-9',
        blockText,
      }),
    ).toThrow(StaleSelectionError)
  })

  it('rejects a changed source block even when its identifier is unchanged', () => {
    const anchor = createTextSelectionAnchor({
      documentVersionId: 'version-1',
      blockId: 'block-1',
      blockText: 'The sample size is 120 participants.',
      startOffset: 19,
      endOffset: 22,
    })

    expect(() =>
      assertSelectionAnchorMatches({
        anchor,
        documentVersionId: 'version-1',
        blockId: 'block-1',
        blockText: 'The sample size is 150 participants.',
      }),
    ).toThrow(StaleSelectionError)
  })
})
