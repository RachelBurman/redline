import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReviewDiscussion } from './review-discussion'

import type { ReviewCommentSummary } from '#/types/reviews'
import type { CreateReviewCommentAction } from './review-comment-form'
import type { ListReviewCommentsAction } from './review-discussion'

const comments: ReviewCommentSummary[] = [
  {
    id: 'comment-1',
    reviewItemId: 'review-1',
    parentCommentId: null,
    body: 'Please confirm this value.',
    author: { id: 'user-1', name: 'Aisha Rahman' },
    createdAt: '2026-08-31T10:15:00.000Z',
    editedAt: null,
  },
  {
    id: 'comment-2',
    reviewItemId: 'review-1',
    parentCommentId: null,
    body: 'Confirmed against the source table.',
    author: { id: 'user-2', name: 'Morgan Lee' },
    createdAt: '2026-08-31T10:20:00.000Z',
    editedAt: null,
  },
]

afterEach(cleanup)

function renderDiscussion(input: {
  canComment?: boolean
  createReviewComment?: CreateReviewCommentAction
  listReviewComments: ListReviewCommentsAction
  onCommentCreated?: (comment: ReviewCommentSummary) => void
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const onCommentCreated =
    input.onCommentCreated ?? vi.fn<(comment: ReviewCommentSummary) => void>()
  return render(
    <QueryClientProvider client={queryClient}>
      <ReviewDiscussion
        canComment={input.canComment ?? false}
        createReviewComment={input.createReviewComment}
        documentId="document-1"
        listReviewComments={input.listReviewComments}
        onCommentCreated={onCommentCreated}
        reviewItemId="review-1"
      />
    </QueryClientProvider>,
  )
}

describe('ReviewDiscussion', () => {
  it('renders chronological comments with authors and machine-readable timestamps', async () => {
    renderDiscussion({ listReviewComments: async () => comments })

    expect(screen.getByRole('status')).toHaveTextContent('Loading discussion')
    const list = await screen.findByRole('list', { name: 'Review comments' })
    const articles = within(list).getAllByRole('article')

    expect(articles).toHaveLength(2)
    expect(articles[0]).toHaveTextContent('Aisha Rahman')
    expect(articles[0]).toHaveTextContent('Please confirm this value.')
    expect(articles[1]).toHaveTextContent('Morgan Lee')
    expect(articles[1]).toHaveTextContent('Confirmed against the source table.')
    expect(articles[0]!.querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-08-31T10:15:00.000Z',
    )
    expect(screen.queryByRole('button', { name: 'Reply to Aisha Rahman' })).not.toBeInTheDocument()
  })

  it('renders chronological replies beneath their parent comment', async () => {
    const reply: ReviewCommentSummary = {
      ...comments[1]!,
      id: 'reply-1',
      parentCommentId: 'comment-1',
      body: 'This is the direct reply.',
    }
    renderDiscussion({ listReviewComments: async () => [reply, comments[0]!] })

    const replies = await screen.findByRole('list', {
      name: "Replies to Aisha Rahman's comment",
    })
    expect(within(replies).getByRole('article')).toHaveTextContent('This is the direct reply.')
  })

  it('shows an accessible empty discussion state', async () => {
    renderDiscussion({ listReviewComments: async () => [] })

    expect(await screen.findByText('No comments yet. Start the discussion below.')).toBeVisible()
  })

  it('offers a retry after the discussion query fails', async () => {
    const user = userEvent.setup()
    const listReviewComments = vi
      .fn<ListReviewCommentsAction>()
      .mockRejectedValueOnce(new Error('The discussion is temporarily unavailable.'))
      .mockResolvedValueOnce(comments)
    renderDiscussion({ listReviewComments })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The discussion is temporarily unavailable.',
    )
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('list', { name: 'Review comments' })).toBeVisible()
    expect(listReviewComments).toHaveBeenCalledTimes(2)
  })

  it('adds a newly created comment to the visible history immediately', async () => {
    const user = userEvent.setup()
    const onCommentCreated = vi.fn<(comment: ReviewCommentSummary) => void>()
    const createdComment: ReviewCommentSummary = {
      ...comments[0]!,
      id: 'comment-3',
      body: 'This comment should appear immediately.',
    }
    const createReviewComment = vi.fn<CreateReviewCommentAction>(async () => createdComment)
    renderDiscussion({
      canComment: true,
      createReviewComment,
      listReviewComments: async () => [],
      onCommentCreated,
    })

    await screen.findByText('No comments yet. Start the discussion below.')
    await user.type(
      screen.getByRole('textbox', { name: 'Comment' }),
      'This comment should appear immediately.',
    )
    await user.click(screen.getByRole('button', { name: 'Add comment' }))

    await waitFor(() => expect(onCommentCreated).toHaveBeenCalledWith(createdComment))
    expect(screen.getByText('This comment should appear immediately.')).toBeVisible()
  })

  it('opens, submits, and immediately displays an accessible direct reply', async () => {
    const user = userEvent.setup()
    const createdReply: ReviewCommentSummary = {
      ...comments[1]!,
      id: 'reply-1',
      parentCommentId: 'comment-1',
      body: 'This reply should appear immediately.',
    }
    const createReviewComment = vi.fn<CreateReviewCommentAction>(async () => createdReply)
    renderDiscussion({
      canComment: true,
      createReviewComment,
      listReviewComments: async () => [comments[0]!],
    })

    await user.click(await screen.findByRole('button', { name: 'Reply to Aisha Rahman' }))
    const replyField = screen.getByRole('textbox', { name: 'Reply to Aisha Rahman' })
    expect(replyField).toHaveFocus()
    await user.type(replyField, 'This reply should appear immediately.')
    await user.click(screen.getByRole('button', { name: 'Add reply' }))

    await waitFor(() =>
      expect(createReviewComment).toHaveBeenCalledWith('document-1', 'review-1', {
        body: 'This reply should appear immediately.',
        parentCommentId: 'comment-1',
      }),
    )
    const replies = screen.getByRole('list', { name: "Replies to Aisha Rahman's comment" })
    expect(within(replies).getByText('This reply should appear immediately.')).toBeVisible()
    expect(screen.getByText('Reply added to the discussion.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Reply to Aisha Rahman' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reply to Aisha Rahman' })).toHaveFocus()
  })

  it('cancels an inline reply without changing the discussion', async () => {
    const user = userEvent.setup()
    renderDiscussion({
      canComment: true,
      listReviewComments: async () => [comments[0]!],
    })

    await user.click(await screen.findByRole('button', { name: 'Reply to Aisha Rahman' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('textbox', { name: 'Reply to Aisha Rahman' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reply to Aisha Rahman' })).toHaveFocus()
  })
})
