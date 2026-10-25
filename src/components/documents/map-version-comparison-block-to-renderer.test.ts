import { describe, expect, it } from 'vitest'

import { mapVersionComparisonBlockToRenderer } from './map-version-comparison-block-to-renderer'

import type { VersionComparisonBlock } from '#/types/document-versions'

function modifiedBlock(index = 0): VersionComparisonBlock {
  return {
    stableKey: `paragraph-${index}`,
    changeType: 'modified',
    base: {
      stableKey: `paragraph-${index}`,
      ordinal: index,
      blockType: 'paragraph',
      text: `The original manuscript wording for paragraph ${index}.`,
      headingLevel: null,
    },
    target: {
      stableKey: `paragraph-${index}`,
      ordinal: index,
      blockType: 'paragraph',
      text: `The revised manuscript wording for paragraph ${index}.`,
      headingLevel: null,
    },
  }
}

function mapBlock(block: VersionComparisonBlock) {
  return mapVersionComparisonBlockToRenderer({
    baseVersionNumber: 1,
    block,
    targetVersionNumber: 2,
  })
}

describe('mapVersionComparisonBlockToRenderer', () => {
  it('maps immutable block snapshots to local plain-text renderer inputs', () => {
    const block = modifiedBlock()
    const before = structuredClone(block)

    const result = mapBlock(block)

    expect(result).toMatchObject({
      accessibleDescription:
        'Changed paragraph. Version 1 is the old version and version 2 is the new version.',
      blockDescription: 'paragraph',
      changeLabel: 'Changed',
      oldText: 'The original manuscript wording for paragraph 0.',
      newText: 'The revised manuscript wording for paragraph 0.',
    })
    expect(block).toEqual(before)
  })

  it('keeps unchanged and unsupported blocks on the structured fallback', () => {
    expect(mapBlock({ ...modifiedBlock(), changeType: 'unchanged' })).toBeNull()
    expect(
      mapBlock({
        ...modifiedBlock(),
        target: { ...modifiedBlock().target!, blockType: 'unsupported' },
      }),
    ).toBeNull()
  })

  it('keeps unusually large individual blocks on the structured fallback', () => {
    const block = modifiedBlock()
    expect(
      mapBlock({
        ...block,
        target: { ...block.target!, text: 'word '.repeat(10_001) },
      }),
    ).toBeNull()
  })

  it('maps a representative very long manuscript within the interaction budget', () => {
    const fixture = Array.from({ length: 5_000 }, (_, index) => modifiedBlock(index))
    const startedAt = performance.now()
    let mappedBlocks = 0

    for (let pass = 0; pass < 3; pass += 1) {
      for (const block of fixture) {
        if (mapBlock(block)) mappedBlocks += 1
      }
    }

    expect(mappedBlocks).toBe(15_000)
    expect(performance.now() - startedAt).toBeLessThan(1_000)
  })
})
