import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { DocxParseError, parseDocx } from './parse-docx'

function createDocx(documentBody: string, styles = '') {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
      xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
      <w:body>${documentBody}<w:sectPr /></w:body>
    </w:document>`
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<Types />'),
    'word/document.xml': strToU8(documentXml),
  }

  if (styles) files['word/styles.xml'] = strToU8(styles)
  return zipSync(files)
}

describe('parseDocx', () => {
  it('extracts styled headings and paragraphs in document order', () => {
    const styles = `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style w:type="paragraph" w:styleId="TitleOne"><w:name w:val="Heading 1" /></w:style>
    </w:styles>`
    const bytes = createDocx(
      `<w:p w14:paraId="A1B2C3D4"><w:pPr><w:pStyle w:val="TitleOne" /></w:pPr><w:r><w:t>Study plan</w:t></w:r></w:p>
       <w:p><w:r><w:t>The primary endpoint is response.</w:t></w:r></w:p>`,
      styles,
    )

    const parsed = parseDocx(bytes)

    expect(parsed.blocks).toMatchObject([
      { stableKey: 'para-a1b2c3d4', blockType: 'heading', headingLevel: 1, text: 'Study plan' },
      { blockType: 'paragraph', headingLevel: null, text: 'The primary endpoint is response.' },
    ])
  })

  it('uses inserted text, omits deleted text, and reports flattening', () => {
    const bytes = createDocx(
      `<w:p><w:r><w:t>Use </w:t></w:r><w:del><w:r><w:delText>ten</w:delText></w:r></w:del><w:ins><w:r><w:t>twelve</w:t></w:r></w:ins><w:r><w:t> participants.</w:t></w:r></w:p>`,
    )

    const parsed = parseDocx(bytes)

    expect(parsed.blocks[0]?.text).toBe('Use twelve participants.')
    expect(parsed.warnings).toContain(
      'Tracked revisions were flattened to the current visible text during import.',
    )
  })

  it('skips empty layout paragraphs and exposes table placeholders', () => {
    const bytes = createDocx(
      '<w:p><w:r><w:t> </w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Value</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
    )

    const parsed = parseDocx(bytes)

    expect(parsed.blocks).toHaveLength(1)
    expect(parsed.blocks[0]).toMatchObject({
      blockType: 'unsupported',
      attributes: { sourceType: 'table' },
    })
    expect(parsed.warnings).toContain('1 empty layout paragraph(s) were omitted.')
  })

  it('rejects ZIP files that are not Word packages', () => {
    expect(() => parseDocx(zipSync({ 'notes.txt': strToU8('hello') }))).toThrow(DocxParseError)
  })
})
