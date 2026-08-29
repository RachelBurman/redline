import { hashText } from '#/domain/review/selection-anchor'

interface ChangeableBlock {
  id: string
  text: string
  contentHash: string
}

export type AcceptedBlockChange =
  | {
      changeType: 'replace'
      targetBlockId: string
      finalContent: string
    }
  | {
      changeType: 'delete'
      targetBlockId: string
      finalContent: null
    }

export function applyBlockChanges<TBlock extends ChangeableBlock>(
  blocks: TBlock[],
  changes: AcceptedBlockChange[],
) {
  const changeByBlockId = new Map(changes.map((change) => [change.targetBlockId, change]))

  return blocks.flatMap((block) => {
    const change = changeByBlockId.get(block.id)
    if (!change) return [block]
    if (change.changeType === 'delete') return []

    return [
      {
        ...block,
        text: change.finalContent,
        contentHash: hashText(change.finalContent),
      },
    ]
  })
}
