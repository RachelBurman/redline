import { describe, expect, it } from 'vitest'

import { assertInsertionBoundary } from './insertion-boundary'
import { ReviewTargetError } from './review-errors'

describe('assertInsertionBoundary', () => {
  it('accepts adjacent immutable blocks', () => {
    expect(() =>
      assertInsertionBoundary({ beforeBlockId: 'block-2', followingBlockId: 'block-2' }),
    ).not.toThrow()
  })

  it('accepts the end boundary only when no following block exists', () => {
    expect(() =>
      assertInsertionBoundary({ beforeBlockId: null, followingBlockId: null }),
    ).not.toThrow()
  })

  it('rejects a stale or fabricated adjacency', () => {
    expect(() =>
      assertInsertionBoundary({ beforeBlockId: 'block-3', followingBlockId: 'block-2' }),
    ).toThrow(ReviewTargetError)
  })
})
