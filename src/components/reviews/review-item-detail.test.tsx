import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReviewItemDetail } from './review-item-detail'

import type { ReviewItemSummary } from '#/types/reviews'

const deletion: ReviewItemSummary = {
  id: 'review-1',
  documentVersionId: 'version-1',
  reviewRoundId: 'round-1',
  targetBlockId: 'block-1',
  targetStableKey: 'paragraph-1',
  changeType: 'delete',
  originalContent: 'This paragraph should be removed.',
  proposedContent: null,
  category: 'Required change',
  priority: 'high',
  rationale: 'The paragraph is obsolete.',
  status: 'open',
  revision: 1,
  author: { id: 'user-1', name: 'Reviewer' },
  createdAt: '2026-08-29T10:00:00.000Z',
  resolvedAt: null,
}

afterEach(cleanup)

describe('ReviewItemDetail', () => {
  it('describes a deletion without rendering crossed-out document text', () => {
    const { container } = render(
      <ReviewItemDetail
        canResolve
        item={deletion}
        onResolve={vi.fn<
          (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
        >()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Deletion · Required change' })).toBeInTheDocument()
    expect(
      screen.getByText('Remove this paragraph from the clean resolved document.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept deletion' })).toBeInTheDocument()
    expect(container.querySelector('del, s')).toBeNull()
  })

  it('shows a new paragraph without pretending that it replaces original text', () => {
    render(
      <ReviewItemDetail
        canResolve
        item={{
          ...deletion,
          id: 'review-2',
          changeType: 'insert',
          originalContent: '',
          proposedContent: 'A newly proposed paragraph.',
        }}
        onResolve={vi.fn<
          (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
        >()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'New paragraph · Required change' }),
    ).toBeInTheDocument()
    expect(screen.getByText('End of document')).toBeInTheDocument()
    expect(screen.getByText('A newly proposed paragraph.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept paragraph' })).toBeInTheDocument()
    expect(screen.queryByText('Original')).not.toBeInTheDocument()
  })
})
