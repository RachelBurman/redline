import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReviewCommentForm } from './review-comment-form'

import type { ReviewCommentSummary } from '#/types/reviews'
import type { CreateReviewCommentAction } from './review-comment-form'

const createdComment: ReviewCommentSummary = {
  id: 'comment-1',
  reviewItemId: 'review-1',
  parentCommentId: null,
  body: 'Please confirm this value.',
  author: { id: 'user-1', name: 'Reviewer' },
  createdAt: '2026-08-29T20:00:00.000Z',
  editedAt: null,
}

afterEach(cleanup)

describe('ReviewCommentForm', () => {
  it('adds a top-level comment and clears the form', async () => {
    const user = userEvent.setup()
    const createReviewComment = vi.fn<CreateReviewCommentAction>(async () => createdComment)
    const onCreated = vi.fn<(comment: ReviewCommentSummary) => void>()

    render(
      <ReviewCommentForm
        createReviewComment={createReviewComment}
        documentId="document-1"
        onCreated={onCreated}
        reviewItemId="review-1"
      />,
    )

    const comment = screen.getByRole('textbox', { name: 'Comment' })
    await user.type(comment, 'Please confirm this value.')
    await user.click(screen.getByRole('button', { name: 'Add comment' }))

    await waitFor(() =>
      expect(createReviewComment).toHaveBeenCalledWith('document-1', 'review-1', {
        body: 'Please confirm this value.',
      }),
    )
    expect(onCreated).toHaveBeenCalledWith(createdComment)
    expect(screen.getByText('Comment added.')).toBeInTheDocument()
    expect(comment).toHaveValue('')
  })

  it('keeps the comment text available after a failed request', async () => {
    const user = userEvent.setup()
    const createReviewComment = vi.fn<CreateReviewCommentAction>(async () => {
      throw new Error('The proposal is no longer available.')
    })

    render(
      <ReviewCommentForm
        createReviewComment={createReviewComment}
        documentId="document-1"
        onCreated={vi.fn<(comment: ReviewCommentSummary) => void>()}
        reviewItemId="review-1"
      />,
    )

    const comment = screen.getByRole('textbox', { name: 'Comment' })
    await user.type(comment, 'Please confirm this value.')
    await user.click(screen.getByRole('button', { name: 'Add comment' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The proposal is no longer available.',
    )
    expect(comment).toHaveValue('Please confirm this value.')
  })

  it('submits an attributable direct reply to its parent comment', async () => {
    const user = userEvent.setup()
    const reply: ReviewCommentSummary = {
      ...createdComment,
      id: 'reply-1',
      parentCommentId: 'comment-1',
      body: 'I confirmed the value.',
    }
    const createReviewComment = vi.fn<CreateReviewCommentAction>(async () => reply)

    render(
      <ReviewCommentForm
        createReviewComment={createReviewComment}
        documentId="document-1"
        onCancel={vi.fn<() => void>()}
        onCreated={vi.fn<(comment: ReviewCommentSummary) => void>()}
        parentCommentAuthor="Aisha Rahman"
        parentCommentId="comment-1"
        reviewItemId="review-1"
      />,
    )

    const replyField = screen.getByRole('textbox', { name: 'Reply to Aisha Rahman' })
    expect(replyField).toHaveFocus()
    await user.type(replyField, 'I confirmed the value.')
    await user.click(screen.getByRole('button', { name: 'Add reply' }))

    await waitFor(() =>
      expect(createReviewComment).toHaveBeenCalledWith('document-1', 'review-1', {
        body: 'I confirmed the value.',
        parentCommentId: 'comment-1',
      }),
    )
  })
})
