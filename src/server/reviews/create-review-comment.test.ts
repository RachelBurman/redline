import { describe, expect, it } from 'vitest'

import { assertValidReplyParent } from './create-review-comment'
import { ReviewCommentParentError } from './review-errors'

describe('assertValidReplyParent', () => {
  it('allows a top-level comment without a parent', () => {
    expect(assertValidReplyParent(undefined, undefined)).toBeNull()
  })

  it('allows a direct reply to a top-level comment', () => {
    expect(
      assertValidReplyParent('comment-1', {
        id: 'comment-1',
        parentCommentId: null,
      }),
    ).toBe('comment-1')
  })

  it('rejects a missing or differently scoped parent without exposing it', () => {
    expect(() => assertValidReplyParent('comment-1', undefined)).toThrow(ReviewCommentParentError)
    expect(() =>
      assertValidReplyParent('comment-1', {
        id: 'comment-from-another-review-item',
        parentCommentId: null,
      }),
    ).toThrow('The reply target is not available for this review proposal.')
  })

  it('rejects replies to replies', () => {
    expect(() =>
      assertValidReplyParent('reply-1', {
        id: 'reply-1',
        parentCommentId: 'comment-1',
      }),
    ).toThrow('Replies can only be added to top-level comments.')
  })
})
