import { randomUUID } from 'node:crypto'

import { applyBlockReplacements } from '#/domain/documents/apply-block-replacements'

import type { AcceptedBlockReplacement } from '#/domain/documents/apply-block-replacements'

export interface VersionSourceBlock {
  id: string
  parentBlockId: string | null
  stableKey: string
  ordinal: number
  blockType:
    | 'heading'
    | 'paragraph'
    | 'list_item'
    | 'table'
    | 'table_row'
    | 'table_cell'
    | 'page_break'
    | 'unsupported'
  text: string
  headingLevel: number | null
  contentHash: string
  attributes: Record<string, unknown>
}

export function cloneVersionBlocks(input: {
  blocks: VersionSourceBlock[]
  documentVersionId: string
  replacements?: AcceptedBlockReplacement[]
  createId?: () => string
}) {
  const createId = input.createId ?? randomUUID
  const materialisedBlocks = applyBlockReplacements(input.blocks, input.replacements ?? [])
  const clonedIdBySourceId = new Map(materialisedBlocks.map((block) => [block.id, createId()]))

  return materialisedBlocks.map((block) => ({
    id: clonedIdBySourceId.get(block.id)!,
    documentVersionId: input.documentVersionId,
    parentBlockId:
      block.parentBlockId === null ? null : (clonedIdBySourceId.get(block.parentBlockId) ?? null),
    stableKey: block.stableKey,
    ordinal: block.ordinal,
    blockType: block.blockType,
    text: block.text,
    headingLevel: block.headingLevel,
    contentHash: block.contentHash,
    attributes: block.attributes,
  }))
}
