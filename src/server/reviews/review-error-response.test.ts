import { describe, expect, it } from 'vitest'

import { reviewErrorResponse } from './review-error-response'
import { ReviewCommentParentError, ReviewItemNotFoundError } from './review-errors'

describe('reviewErrorResponse', () => {
  it('does not expose a review item outside the requested organisation', async () => {
    const response = reviewErrorResponse(new ReviewItemNotFoundError())

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'REVIEW_ITEM_NOT_FOUND',
        message: 'The review proposal was not found in this organisation.',
      },
    })
  })

  it('returns a stable conflict contract for an invalid reply target', async () => {
    const response = reviewErrorResponse(new ReviewCommentParentError())

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'REVIEW_COMMENT_PARENT_INVALID',
        message: 'The reply target is not available for this review proposal.',
      },
    })
  })
})
