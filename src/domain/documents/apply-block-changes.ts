import { hashText } from '#/domain/review/selection-anchor'

interface ChangeableBlock {
  id: string
  stableKey: string
  ordinal: number
  blockType: string
  text: string
  headingLevel: number | null
  contentHash: string
  parentBlockId?: string | null
  attributes?: Record<string, unknown>
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
  | {
      changeType: 'insert'
      targetBlockId: string
      insertedBlockId: string
      insertedStableKey: string
      finalContent: string
    }

type AcceptedBlockInsertion = Extract<AcceptedBlockChange, { changeType: 'insert' }>
type AcceptedContentChange = Exclude<AcceptedBlockChange, { changeType: 'insert' }>

export function applyBlockChanges<TBlock extends ChangeableBlock>(
  blocks: TBlock[],
  changes: AcceptedBlockChange[],
): TBlock[] {
  const contentChangeByBlockId = new Map<string, AcceptedContentChange>()
  const insertionsByBlockId = new Map<string, AcceptedBlockInsertion[]>()
  for (const change of changes) {
    if (change.changeType === 'insert') {
      const insertions = insertionsByBlockId.get(change.targetBlockId) ?? []
      insertions.push(change)
      insertionsByBlockId.set(change.targetBlockId, insertions)
    } else {
      contentChangeByBlockId.set(change.targetBlockId, change)
    }
  }

  const materialisedBlocks: TBlock[] = []
  for (const block of blocks) {
    const change = contentChangeByBlockId.get(block.id)
    if (change?.changeType !== 'delete') {
      materialisedBlocks.push(
        change?.changeType === 'replace'
          ? Object.assign({}, block, {
              text: change.finalContent,
              contentHash: hashText(change.finalContent),
            })
          : block,
      )
    }

    for (const insertion of insertionsByBlockId.get(block.id) ?? []) {
      materialisedBlocks.push(
        Object.assign(
          {},
          block,
          {
            id: insertion.insertedBlockId,
            stableKey: insertion.insertedStableKey,
            blockType: 'paragraph',
            text: insertion.finalContent,
            headingLevel: null,
            contentHash: hashText(insertion.finalContent),
          },
          'parentBlockId' in block ? { parentBlockId: null } : {},
          'attributes' in block ? { attributes: {} } : {},
        ) as TBlock,
      )
    }
  }

  return materialisedBlocks.map((block, ordinal) => {
    if (block.ordinal === ordinal) return block
    return Object.assign({}, block, { ordinal })
  })
}
