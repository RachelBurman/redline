import { describe, expect, it } from 'vitest'

import { mapReviewCommentRow } from './list-review-comments'

describe('mapReviewCommentRow', () => {
  it('returns the public author and timestamp contract', () => {
    expect(
      mapReviewCommentRow({
        id: 'comment-1',
        reviewItemId: 'review-1',
        parentCommentId: null,
        body: 'Please confirm this value.',
        authorId: 'user-1',
        authorName: 'Aisha Rahman',
        createdAt: new Date('2026-08-31T10:15:00.000Z'),
        editedAt: null,
      }),
    ).toEqual({
      id: 'comment-1',
      reviewItemId: 'review-1',
      parentCommentId: null,
      body: 'Please confirm this value.',
      author: { id: 'user-1', name: 'Aisha Rahman' },
      createdAt: '2026-08-31T10:15:00.000Z',
      editedAt: null,
    })
  })
})
