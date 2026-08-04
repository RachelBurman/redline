import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'

import type { DocumentDetail } from '#/types/documents'

const headingLevels = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
]

export async function buildResolvedDocx(input: {
  title: string
  blocks: DocumentDetail['blocks']
}) {
  const children = input.blocks.map((block) => {
    if (block.blockType === 'heading') {
      const index = Math.min(5, Math.max(0, (block.headingLevel ?? 2) - 1))
      return new Paragraph({ text: block.text, heading: headingLevels[index] })
    }

    if (block.blockType === 'unsupported') {
      return new Paragraph({
        children: [new TextRun({ text: block.text, italics: true, color: '80584C' })],
      })
    }

    return new Paragraph({ text: block.text })
  })
  const document = new Document({
    creator: 'Redline',
    title: input.title,
    description: 'Resolved document exported from Redline.',
    sections: [{ children }],
  })

  return Packer.toBuffer(document)
}
