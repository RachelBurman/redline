import type {
  DocumentVersionComparison,
  VersionComparisonBlock,
  VersionComparisonBlockSnapshot,
  VersionComparisonChangeType,
} from '#/types/document-versions'

interface ComparableVersion {
  id: string
  versionNumber: number
  blocks: VersionComparisonBlockSnapshot[]
}

function blockChangeType(
  base: VersionComparisonBlockSnapshot,
  target: VersionComparisonBlockSnapshot,
): VersionComparisonChangeType {
  return base.blockType === target.blockType &&
    base.text === target.text &&
    base.headingLevel === target.headingLevel
    ? 'unchanged'
    : 'modified'
}

function assertUniqueStableKeys(version: ComparableVersion) {
  const keys = new Set<string>()
  for (const block of version.blocks) {
    if (keys.has(block.stableKey)) {
      throw new Error(`Version ${version.versionNumber} contains a duplicate stable block key.`)
    }
    keys.add(block.stableKey)
  }
}

export function compareDocumentVersions(input: {
  documentId: string
  baseVersion: ComparableVersion
  targetVersion: ComparableVersion
}): DocumentVersionComparison {
  assertUniqueStableKeys(input.baseVersion)
  assertUniqueStableKeys(input.targetVersion)

  const baseByKey = new Map(input.baseVersion.blocks.map((block) => [block.stableKey, block]))
  const targetByKey = new Map(input.targetVersion.blocks.map((block) => [block.stableKey, block]))
  const removalsBeforeTarget = new Map<string, VersionComparisonBlock[]>()
  const trailingRemovals: VersionComparisonBlock[] = []
  let nextTargetKey: string | null = null

  for (let index = input.baseVersion.blocks.length - 1; index >= 0; index -= 1) {
    const block = input.baseVersion.blocks[index]
    if (!block) continue
    if (targetByKey.has(block.stableKey)) {
      nextTargetKey = block.stableKey
      continue
    }

    const removal: VersionComparisonBlock = {
      stableKey: block.stableKey,
      changeType: 'removed',
      base: block,
      target: null,
    }
    if (nextTargetKey === null) {
      trailingRemovals.unshift(removal)
    } else {
      const removals = removalsBeforeTarget.get(nextTargetKey) ?? []
      removals.unshift(removal)
      removalsBeforeTarget.set(nextTargetKey, removals)
    }
  }

  const blocks: VersionComparisonBlock[] = []
  for (const target of input.targetVersion.blocks) {
    blocks.push(...(removalsBeforeTarget.get(target.stableKey) ?? []))
    const base = baseByKey.get(target.stableKey) ?? null
    blocks.push({
      stableKey: target.stableKey,
      changeType: base === null ? 'added' : blockChangeType(base, target),
      base,
      target,
    })
  }
  blocks.push(...trailingRemovals)

  const summary = { added: 0, modified: 0, removed: 0, unchanged: 0, totalChanges: 0 }
  for (const block of blocks) summary[block.changeType] += 1
  summary.totalChanges = summary.added + summary.modified + summary.removed

  return {
    documentId: input.documentId,
    baseVersion: {
      id: input.baseVersion.id,
      versionNumber: input.baseVersion.versionNumber,
    },
    targetVersion: {
      id: input.targetVersion.id,
      versionNumber: input.targetVersion.versionNumber,
    },
    summary,
    blocks,
  }
}
