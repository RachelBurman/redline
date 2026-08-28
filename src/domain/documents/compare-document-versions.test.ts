import { describe, expect, it } from 'vitest'

import { compareDocumentVersions } from './compare-document-versions'

import type { VersionComparisonBlockSnapshot } from '#/types/document-versions'

function block(stableKey: string, text: string, ordinal: number): VersionComparisonBlockSnapshot {
  return { stableKey, text, ordinal, blockType: 'paragraph', headingLevel: null }
}

function compare(base: VersionComparisonBlockSnapshot[], target: VersionComparisonBlockSnapshot[]) {
  return compareDocumentVersions({
    documentId: 'document-1',
    baseVersion: { id: 'version-1', versionNumber: 1, blocks: base },
    targetVersion: { id: 'version-2', versionNumber: 2, blocks: target },
  })
}

describe('compareDocumentVersions', () => {
  it('classifies stable blocks and counts changes', () => {
    const result = compare(
      [block('a', 'Unchanged', 0), block('b', 'Before', 1)],
      [block('a', 'Unchanged', 0), block('b', 'After', 1), block('c', 'Added', 2)],
    )

    expect(result.blocks.map((item) => item.changeType)).toEqual(['unchanged', 'modified', 'added'])
    expect(result.summary).toEqual({
      added: 1,
      modified: 1,
      removed: 0,
      unchanged: 1,
      totalChanges: 2,
    })
  })

  it('keeps removed content as a plain snapshot near its original location', () => {
    const result = compare(
      [block('a', 'First', 0), block('removed', 'Delete me', 1), block('b', 'Last', 2)],
      [block('a', 'First', 0), block('b', 'Last', 1)],
    )

    expect(result.blocks.map((item) => item.stableKey)).toEqual(['a', 'removed', 'b'])
    expect(result.blocks[1]).toMatchObject({
      changeType: 'removed',
      base: { text: 'Delete me' },
      target: null,
    })
  })

  it('detects block presentation changes even when the text is unchanged', () => {
    const base = block('a', 'Methods', 0)
    const target = { ...base, blockType: 'heading' as const, headingLevel: 2 }

    expect(compare([base], [target]).blocks[0]?.changeType).toBe('modified')
  })

  it('rejects ambiguous duplicate stable keys', () => {
    expect(() => compare([block('a', 'One', 0), block('a', 'Two', 1)], [])).toThrow(
      'duplicate stable block key',
    )
  })
})
