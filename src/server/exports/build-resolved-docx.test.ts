import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { buildResolvedDocx } from './build-resolved-docx'

describe('buildResolvedDocx', () => {
  it('writes the resolved heading and paragraph text to a valid Word package', async () => {
    const output = await buildResolvedDocx({
      title: 'Resolved plan',
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
  })
})
