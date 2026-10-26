import { hashRichMediaBlock } from '#/domain/documents/rich-media-block'
import { hashText } from '#/domain/review/selection-anchor'

import type { RichMediaBlockAttributes } from '#/types/rich-media'

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
  | {
      changeType: 'media_insert'
      targetBlockId: string
      insertedBlockId: string
      insertedStableKey: string
      media: RichMediaBlockAttributes
    }
  | {
      changeType: 'media_replace' | 'media_caption' | 'media_alt_text'
      targetBlockId: string
      media: RichMediaBlockAttributes
    }
  | {
      changeType: 'media_delete'
      targetBlockId: string
    }
  | {
      changeType: 'media_reorder'
      targetBlockId: string
      beforeBlockId: string | null
    }

type AcceptedBlockInsertion = Extract<
  AcceptedBlockChange,
  { changeType: 'insert' | 'media_insert' }
>
type AcceptedContentChange = Extract<
  AcceptedBlockChange,
  {
    changeType:
      | 'replace'
      | 'delete'
      | 'media_replace'
      | 'media_delete'
      | 'media_caption'
      | 'media_alt_text'
  }
>

export function applyBlockChanges<TBlock extends ChangeableBlock>(
  blocks: TBlock[],
  changes: AcceptedBlockChange[],
): TBlock[] {
  const contentChangeByBlockId = new Map<string, AcceptedContentChange>()
  const insertionsByBlockId = new Map<string, AcceptedBlockInsertion[]>()
  const reorderings: Extract<AcceptedBlockChange, { changeType: 'media_reorder' }>[] = []
  for (const change of changes) {
    if (change.changeType === 'insert' || change.changeType === 'media_insert') {
      const insertions = insertionsByBlockId.get(change.targetBlockId) ?? []
      insertions.push(change)
      insertionsByBlockId.set(change.targetBlockId, insertions)
    } else if (change.changeType === 'media_reorder') {
      reorderings.push(change)
    } else {
      contentChangeByBlockId.set(change.targetBlockId, change)
    }
  }

  const materialisedBlocks: TBlock[] = []
  for (const block of blocks) {
    const change = contentChangeByBlockId.get(block.id)
    if (change?.changeType !== 'delete' && change?.changeType !== 'media_delete') {
      materialisedBlocks.push(
        change?.changeType === 'replace'
          ? Object.assign({}, block, {
              text: change.finalContent,
              contentHash: hashText(change.finalContent),
            })
          : change &&
              ['media_replace', 'media_caption', 'media_alt_text'].includes(change.changeType)
            ? Object.assign({}, block, {
                blockType: 'rich_media',
                text: change.media.caption ?? '',
                contentHash: hashRichMediaBlock(change.media),
                attributes: change.media,
              })
            : block,
      )
    }

    for (const insertion of insertionsByBlockId.get(block.id) ?? []) {
      if (insertion.changeType === 'media_insert') {
        materialisedBlocks.push(
          Object.assign(
            {},
            block,
            {
              id: insertion.insertedBlockId,
              stableKey: insertion.insertedStableKey,
              blockType: 'rich_media',
              text: insertion.media.caption ?? '',
              headingLevel: null,
              contentHash: hashRichMediaBlock(insertion.media),
            },
            'parentBlockId' in block ? { parentBlockId: null } : {},
            'attributes' in block ? { attributes: insertion.media } : {},
          ) as TBlock,
        )
        continue
      }
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

  for (const reordering of reorderings) {
    const sourceIndex = materialisedBlocks.findIndex(
      (block) => block.id === reordering.targetBlockId,
    )
    if (sourceIndex < 0) continue
    const [moved] = materialisedBlocks.splice(sourceIndex, 1)
    if (!moved) continue
    const destinationIndex =
      reordering.beforeBlockId === null
        ? materialisedBlocks.length
        : materialisedBlocks.findIndex((block) => block.id === reordering.beforeBlockId)
    materialisedBlocks.splice(
      destinationIndex < 0 ? materialisedBlocks.length : destinationIndex,
      0,
      moved,
    )
  }

  return materialisedBlocks.map((block, ordinal) => {
    if (block.ordinal === ordinal) return block
    return Object.assign({}, block, { ordinal })
  })
}
