import { describe, expect, it } from 'vitest'

import { hashRichMediaBlock, parseRichMediaBlockAttributes } from './rich-media-block'

const media = {
  assetId: '11111111-1111-4111-8111-111111111111',
  altText: 'A line graph rising from 10 to 20.',
  caption: 'Quarterly growth',
  source: 'Internal analysis',
  provenance: { creator: 'Research team', tool: 'Static export' },
  width: 800,
  height: 450,
  byteSize: 12_345,
  mimeType: 'image/png' as const,
  contentHash: 'a'.repeat(64),
  processingStatus: 'ready' as const,
}

describe('rich media block metadata', () => {
  it('validates immutable accessible metadata and hashes it deterministically', () => {
    const parsed = parseRichMediaBlockAttributes(media)
    expect(hashRichMediaBlock(parsed)).toBe(
      hashRichMediaBlock({
        ...parsed,
        provenance: { tool: 'Static export', creator: 'Research team' },
      }),
    )
  })

  it('requires a useful accessible description', () => {
    expect(() => parseRichMediaBlockAttributes({ ...media, altText: ' ' })).toThrow('Too small')
  })
})
