import { parseRichMediaBlockAttributes } from '#/domain/documents/rich-media-block'

import type { DocumentBlockDetail } from '#/types/documents'

interface StoredDocumentBlock {
  id: string
  stableKey: string
  ordinal: number
  blockType: DocumentBlockDetail['blockType']
  text: string
  headingLevel: number | null
  contentHash: string
  attributes: Record<string, unknown>
}

export function mapDocumentBlock(
  documentId: string,
  block: StoredDocumentBlock,
): DocumentBlockDetail {
  if (block.blockType !== 'rich_media') return { ...block, media: null }
  const media = parseRichMediaBlockAttributes(block.attributes)
  const baseUrl = `/api/v1/documents/${documentId}/media/${media.assetId}`
  return {
    ...block,
    media: {
      ...media,
      url: baseUrl,
      previewUrl: `${baseUrl}?variant=preview`,
    },
  }
}
