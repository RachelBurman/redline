import { describe, expect, it } from 'vitest'

import { buildReviewCommentAuditPayload } from './review-comment-audit'

describe('buildReviewCommentAuditPayload', () => {
  it('attributes a reply to its parent without copying discussion text into the audit payload', () => {
    const payload = buildReviewCommentAuditPayload({
      body: 'I confirmed this value.',
      commentId: 'reply-1',
      parentCommentId: 'comment-1',
    })

    expect(payload).toMatchObject({
      commentId: 'reply-1',
      parentCommentId: 'comment-1',
      bodyLength: 23,
    })
    expect(payload.bodyHash).toMatch(/^[a-f\d]{64}$/)
    expect(payload).not.toHaveProperty('body')
  })
})
