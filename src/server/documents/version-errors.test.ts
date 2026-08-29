import { describe, expect, it } from 'vitest'

import { assertDocumentVersionHasBlocks } from './version-errors'

describe('assertDocumentVersionHasBlocks', () => {
  it('allows a version with materialised content', () => {
    expect(() => assertDocumentVersionHasBlocks([{ id: 'block-1' }])).not.toThrow()
  })

  it('prevents an empty immutable version from losing its insertion anchor', () => {
    expect(() => assertDocumentVersionHasBlocks([])).toThrow(
      'The next version cannot be empty. Propose and accept a new paragraph before creating it.',
    )
  })
})
