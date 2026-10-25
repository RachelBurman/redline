import type {
  VersionComparisonBlock,
  VersionComparisonBlockSnapshot,
} from '#/types/document-versions'

export interface VersionComparisonRendererInput {
  accessibleDescription: string
  blockDescription: string
  changeLabel: 'Added' | 'Changed' | 'Absent from later version'
  newText: string
  oldText: string
}

export const wordLevelBlockCharacterBudget = 50_000

function blockDescription(snapshot: VersionComparisonBlockSnapshot) {
  if (snapshot.blockType === 'heading') return `heading level ${snapshot.headingLevel ?? 1}`
  return snapshot.blockType.replaceAll('_', ' ')
}

function isSupported(snapshot: VersionComparisonBlockSnapshot | null) {
  return snapshot === null || !['page_break', 'unsupported'].includes(snapshot.blockType)
}

export function mapVersionComparisonBlockToRenderer(input: {
  baseVersionNumber: number
  block: VersionComparisonBlock
  targetVersionNumber: number
}): VersionComparisonRendererInput | null {
  const { block } = input
  if (block.changeType === 'unchanged' || !isSupported(block.base) || !isSupported(block.target)) {
    return null
  }
  if (
    (block.base?.text.length ?? 0) + (block.target?.text.length ?? 0) >
    wordLevelBlockCharacterBudget
  ) {
    return null
  }

  const snapshot = block.target ?? block.base
  if (!snapshot) return null

  const changeLabel =
    block.changeType === 'added'
      ? 'Added'
      : block.changeType === 'removed'
        ? 'Absent from later version'
        : 'Changed'
  const description = blockDescription(snapshot)

  return {
    accessibleDescription: `${changeLabel} ${description}. Version ${input.baseVersionNumber} is the old version and version ${input.targetVersionNumber} is the new version.`,
    blockDescription: description,
    changeLabel,
    oldText: block.base?.text ?? '',
    newText: block.target?.text ?? '',
  }
}
