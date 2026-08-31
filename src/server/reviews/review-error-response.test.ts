import { describe, expect, it } from 'vitest'

import { reviewErrorResponse } from './review-error-response'
import { ReviewItemNotFoundError } from './review-errors'

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
})
