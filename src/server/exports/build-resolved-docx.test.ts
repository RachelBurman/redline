import { strFromU8, unzipSync } from 'fflate'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'

import { buildResolvedDocx } from './build-resolved-docx'

describe('buildResolvedDocx', () => {
  it('writes the resolved heading and paragraph text to a valid Word package', async () => {
    const output = await buildResolvedDocx({
      title: 'Resolved plan',
      signatureStatus: 'Partially signed',
      blocks: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          stableKey: 'heading-1',
          ordinal: 0,
          blockType: 'heading',
          text: 'Analysis populations',
          headingLevel: 1,
          contentHash: 'hash-1',
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          stableKey: 'paragraph-1',
          ordinal: 1,
          blockType: 'paragraph',
          text: 'The endpoint will be assessed at week 16.',
          headingLevel: null,
          contentHash: 'hash-2',
        },
      ],
    })

    const packageFiles = unzipSync(output)
    expect(packageFiles['[Content_Types].xml']).toBeDefined()
    const documentXml = strFromU8(packageFiles['word/document.xml']!)
    expect(documentXml).toContain('Analysis populations')
    expect(documentXml).toContain('The endpoint will be assessed at week 16.')
    expect(documentXml).toContain('Electronic sign-off status: Partially signed')
  })

  it('embeds the exact historical image with caption and alt text', async () => {
    const image = new PNG({ width: 2, height: 2 })
    image.data.fill(255)
    const output = await buildResolvedDocx({
      title: 'Media export',
      blocks: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          stableKey: 'media-1',
          ordinal: 0,
          blockType: 'rich_media',
          text: 'Study outcomes',
          headingLevel: null,
          contentHash: 'block-hash',
          media: {
            assetId: '22222222-2222-4222-8222-222222222222',
            altText: 'A bar graph comparing study outcomes.',
            caption: 'Study outcomes',
            source: 'Trial report',
            provenance: {},
            width: 2,
            height: 2,
            byteSize: 100,
            mimeType: 'image/png',
            contentHash: 'a'.repeat(64),
            processingStatus: 'ready',
            url: '/original',
            previewUrl: '/preview',
          },
        },
      ],
      loadMedia: async (assetId) => {
        expect(assetId).toBe('22222222-2222-4222-8222-222222222222')
        return new Uint8Array(PNG.sync.write(image))
      },
    })

    const packageFiles = unzipSync(output)
    expect(Object.keys(packageFiles).some((name) => name.startsWith('word/media/'))).toBe(true)
    const documentXml = strFromU8(packageFiles['word/document.xml']!)
    expect(documentXml).toContain('A bar graph comparing study outcomes.')
    expect(documentXml).toContain('Study outcomes')
    expect(documentXml).toContain('Source: Trial report')
  })
})
