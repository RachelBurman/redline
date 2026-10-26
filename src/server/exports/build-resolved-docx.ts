import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx'

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
  signatureStatus?: string
  loadMedia?: (assetId: string) => Promise<Uint8Array>
}) {
  const mediaAssets = input.blocks.flatMap((block) =>
    block.blockType === 'rich_media' && block.media?.processingStatus === 'ready'
      ? [block.media]
      : [],
  )
  const mediaBytes = new Map(
    input.loadMedia
      ? await Promise.all(
          mediaAssets.map(
            async (media) => [media.assetId, await input.loadMedia!(media.assetId)] as const,
          ),
        )
      : [],
  )
  const content: Paragraph[] = []
  for (const block of input.blocks) {
    if (block.blockType === 'heading') {
      const index = Math.min(5, Math.max(0, (block.headingLevel ?? 2) - 1))
      content.push(new Paragraph({ text: block.text, heading: headingLevels[index] }))
      continue
    }

    if (block.blockType === 'unsupported') {
      content.push(
        new Paragraph({
          children: [new TextRun({ text: block.text, italics: true, color: '80584C' })],
        }),
      )
      continue
    }

    if (block.blockType === 'rich_media') {
      const media = block.media
      const bytes = media ? mediaBytes.get(media.assetId) : undefined
      if (!media || media.processingStatus !== 'ready' || !bytes) {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Image unavailable: ${media?.altText ?? 'missing media metadata'}]`,
                italics: true,
                color: '80584C',
              }),
            ],
          }),
        )
        continue
      }
      const scale = Math.min(1, 624 / media.width, 720 / media.height)
      content.push(
        new Paragraph({
          children: [
            new ImageRun({
              type: media.mimeType === 'image/png' ? 'png' : 'jpg',
              data: bytes,
              transformation: {
                width: Math.max(1, Math.round(media.width * scale)),
                height: Math.max(1, Math.round(media.height * scale)),
              },
              altText: {
                name: `media-${media.assetId}`,
                title: media.caption ?? 'Document image',
                description: media.altText,
              },
            }),
          ],
        }),
      )
      if (media.caption) {
        content.push(
          new Paragraph({
            children: [new TextRun({ text: media.caption, italics: true, color: '46514C' })],
          }),
        )
      }
      if (media.source) {
        content.push(
          new Paragraph({
            children: [new TextRun({ text: `Source: ${media.source}`, size: 18, color: '68726D' })],
          }),
        )
      }
      continue
    }

    content.push(new Paragraph({ text: block.text }))
  }
  const children = input.signatureStatus
    ? [
        new Paragraph({
          children: [
            new TextRun({
              text: `Electronic sign-off status: ${input.signatureStatus}`,
              bold: true,
              color: '315A4E',
            }),
          ],
        }),
        ...content,
      ]
    : content
  const document = new Document({
    creator: 'Redline',
    title: input.title,
    description: `Resolved document exported from Redline.${input.signatureStatus ? ` Electronic sign-off status: ${input.signatureStatus}.` : ''}`,
    sections: [{ children }],
  })

  return Packer.toBuffer(document)
}
