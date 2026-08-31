import type { DocumentBlockDetail, DocumentInsertionAnchor } from '#/types/documents'

export function buildInsertionAnchors(blocks: DocumentBlockDetail[]): DocumentInsertionAnchor[] {
  return blocks.map((afterBlock, index) => ({
    afterBlock,
    beforeBlockId: blocks[index + 1]?.id ?? null,
  }))
}
