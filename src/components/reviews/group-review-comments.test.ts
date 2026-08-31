import { describe, expect, it } from 'vitest'

import { groupReviewComments } from './group-review-comments'

import type { ReviewCommentSummary } from '#/types/reviews'

function comment(input: {
  id: string
  parentCommentId?: string | null
  createdAt: string
}): ReviewCommentSummary {
  return {
    id: input.id,
    reviewItemId: 'review-1',
    parentCommentId: input.parentCommentId ?? null,
    body: input.id,
    author: { id: 'user-1', name: 'Reviewer' },
    createdAt: input.createdAt,
    editedAt: null,
  }
}

describe('groupReviewComments', () => {
  it('groups direct replies beneath chronological top-level comments', () => {
    const threads = groupReviewComments([
      comment({
        id: 'reply-2',
        parentCommentId: 'comment-1',
        createdAt: '2026-08-31T10:04:00.000Z',
      }),
      comment({ id: 'comment-2', createdAt: '2026-08-31T10:02:00.000Z' }),
      comment({
        id: 'reply-1',
        parentCommentId: 'comment-1',
        createdAt: '2026-08-31T10:03:00.000Z',
      }),
      comment({ id: 'comment-1', createdAt: '2026-08-31T10:01:00.000Z' }),
    ])

    expect(threads.map((thread) => thread.comment.id)).toEqual(['comment-1', 'comment-2'])
    expect(threads[0]?.replies.map((reply) => reply.id)).toEqual(['reply-1', 'reply-2'])
  })

  it('keeps an unlinked legacy reply visible', () => {
    const threads = groupReviewComments([
      comment({
        id: 'orphan-reply',
        parentCommentId: 'missing-comment',
        createdAt: '2026-08-31T10:01:00.000Z',
      }),
    ])

    expect(threads[0]?.comment.id).toBe('orphan-reply')
  })
})
