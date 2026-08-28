import { hashText } from '#/domain/review/selection-anchor'

interface ReplaceableBlock {
  id: string
  text: string
  contentHash: string
}

export interface AcceptedBlockReplacement {
  targetBlockId: string
  finalContent: string
}

export function applyBlockReplacements<TBlock extends ReplaceableBlock>(
  blocks: TBlock[],
  replacements: AcceptedBlockReplacement[],
) {
  const replacementByBlockId = new Map(
    replacements.map((replacement) => [replacement.targetBlockId, replacement.finalContent]),
  )

  return blocks.map((block) => {
    const replacement = replacementByBlockId.get(block.id)
    if (replacement === undefined) return block

    return {
      ...block,
      text: replacement,
      contentHash: hashText(replacement),
    }
  })
}
