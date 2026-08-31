import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReviewProposalForm } from './review-proposal-form'

import type { DocumentDetail } from '#/types/documents'
import type { ReviewChangeType, ReviewItemSummary } from '#/types/reviews'
import type { CreateReviewItemAction } from './review-proposal-form'

const block: DocumentDetail['blocks'][number] = {
  id: '5ca113d3-7070-43e3-9c0f-722fa8340417',
  stableKey: 'paragraph-1',
  ordinal: 1,
  blockType: 'paragraph',
  text: 'Remove this unnecessary paragraph.',
  headingLevel: null,
  contentHash: 'hash',
}

afterEach(cleanup)

function createdItem(changeType: ReviewChangeType, proposedContent: string | null) {
  return {
    id: '7c322e0c-d60a-4d39-b4bc-f21a7685add6',
    documentVersionId: '8d433f1d-e71b-4e40-a5cd-032b8796bee7',
    reviewRoundId: '18ef785c-eb37-4459-9656-01147d3c0f6e',
    targetBlockId: block.id,
    targetStableKey: block.stableKey,
    changeType,
    originalContent: changeType === 'insert' ? '' : block.text,
    proposedContent,
    category: 'Clarification' as const,
    priority: 'medium' as const,
    rationale: 'The paragraph duplicates the preceding requirement.',
    status: 'open' as const,
    revision: 1,
    author: { id: 'user-1', name: 'Reviewer' },
    createdAt: '2026-08-29T10:00:00.000Z',
    resolvedAt: null,
  }
}

describe('ReviewProposalForm', () => {
  it('creates an explicit deletion proposal without replacement text', async () => {
    const user = userEvent.setup()
    const createReviewItem = vi.fn<CreateReviewItemAction>(async (_documentId, input) =>
      createdItem(input.changeType, input.proposedContent),
    )
    const onCreated = vi.fn<(item: ReviewItemSummary) => void>()

    render(
      <ReviewProposalForm
        block={block}
        changeType="delete"
        createReviewItem={createReviewItem}
        documentId="b5e038f0-129b-461c-b30c-d42e4cdfd1bd"
        onCancel={vi.fn<() => void>()}
        onCreated={onCreated}
        reviewRoundId="18ef785c-eb37-4459-9656-01147d3c0f6e"
        versionId="8d433f1d-e71b-4e40-a5cd-032b8796bee7"
      />,
    )

    expect(screen.queryByRole('textbox', { name: 'Replacement text' })).not.toBeInTheDocument()
    expect(screen.getByText(/absent from the clean resolved document/i)).toBeInTheDocument()
    await user.type(
      screen.getByRole('textbox', { name: 'Reason for change' }),
      'The paragraph duplicates the preceding requirement.',
    )
    await user.click(screen.getByRole('button', { name: 'Create deletion proposal' }))

    await waitFor(() =>
      expect(createReviewItem).toHaveBeenCalledWith(
        'b5e038f0-129b-461c-b30c-d42e4cdfd1bd',
        expect.objectContaining({ changeType: 'delete', proposedContent: null }),
      ),
    )
    expect(onCreated).toHaveBeenCalledOnce()
  })

  it('keeps replacement proposals explicit and populated', async () => {
    const user = userEvent.setup()
    const createReviewItem = vi.fn<CreateReviewItemAction>(async (_documentId, input) =>
      createdItem(input.changeType, input.proposedContent),
    )

    render(
      <ReviewProposalForm
        block={block}
        changeType="replace"
        createReviewItem={createReviewItem}
        documentId="b5e038f0-129b-461c-b30c-d42e4cdfd1bd"
        onCancel={vi.fn<() => void>()}
        onCreated={vi.fn<(item: ReviewItemSummary) => void>()}
        reviewRoundId="18ef785c-eb37-4459-9656-01147d3c0f6e"
        versionId="8d433f1d-e71b-4e40-a5cd-032b8796bee7"
      />,
    )

    const replacement = screen.getByRole('textbox', { name: 'Replacement text' })
    await user.clear(replacement)
    await user.type(replacement, 'Use this shorter paragraph.')
    await user.type(
      screen.getByRole('textbox', { name: 'Reason for change' }),
      'The shorter wording is clearer.',
    )
    await user.click(screen.getByRole('button', { name: 'Create replacement proposal' }))

    await waitFor(() =>
      expect(createReviewItem).toHaveBeenCalledWith(
        'b5e038f0-129b-461c-b30c-d42e4cdfd1bd',
        expect.objectContaining({
          changeType: 'replace',
          proposedContent: 'Use this shorter paragraph.',
        }),
      ),
    )
  })

  it('creates a paragraph insertion proposal with required new text', async () => {
    const user = userEvent.setup()
    const createReviewItem = vi.fn<CreateReviewItemAction>(async (_documentId, input) =>
      createdItem(input.changeType, input.proposedContent),
    )

    render(
      <ReviewProposalForm
        block={{ ...block, text: '' }}
        changeType="insert"
        createReviewItem={createReviewItem}
        documentId="b5e038f0-129b-461c-b30c-d42e4cdfd1bd"
        onCancel={vi.fn<() => void>()}
        onCreated={vi.fn<(item: ReviewItemSummary) => void>()}
        reviewRoundId="18ef785c-eb37-4459-9656-01147d3c0f6e"
        versionId="8d433f1d-e71b-4e40-a5cd-032b8796bee7"
      />,
    )

    expect(screen.getByText('Insert at the end of the document')).toBeInTheDocument()
    await user.type(
      screen.getByRole('textbox', { name: 'New paragraph text' }),
      'This is a newly proposed paragraph.',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Reason for change' }),
      'The conclusion needs this qualification.',
    )
    await user.click(screen.getByRole('button', { name: 'Create paragraph proposal' }))

    await waitFor(() =>
      expect(createReviewItem).toHaveBeenCalledWith(
        'b5e038f0-129b-461c-b30c-d42e4cdfd1bd',
        expect.objectContaining({
          beforeBlockId: null,
          changeType: 'insert',
          proposedContent: 'This is a newly proposed paragraph.',
        }),
      ),
    )
  })

  it('sends both immutable block IDs for a between-block insertion', async () => {
    const user = userEvent.setup()
    const createReviewItem = vi.fn<CreateReviewItemAction>(async (_documentId, input) =>
      createdItem(input.changeType, input.proposedContent),
    )
    const beforeBlockId = '0bb68c55-1bd3-49b5-8a2c-53b89c7fbc42'

    render(
      <ReviewProposalForm
        beforeBlockId={beforeBlockId}
        block={block}
        changeType="insert"
        createReviewItem={createReviewItem}
        documentId="b5e038f0-129b-461c-b30c-d42e4cdfd1bd"
        onCancel={vi.fn<() => void>()}
        onCreated={vi.fn<(item: ReviewItemSummary) => void>()}
        reviewRoundId="18ef785c-eb37-4459-9656-01147d3c0f6e"
        versionId="8d433f1d-e71b-4e40-a5cd-032b8796bee7"
      />,
    )

    expect(screen.getByText(`Insert after: ${block.text}`)).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'New paragraph text' }), 'Inserted text.')
    await user.type(
      screen.getByRole('textbox', { name: 'Reason for change' }),
      'This belongs between the existing requirements.',
    )
    await user.click(screen.getByRole('button', { name: 'Create paragraph proposal' }))

    await waitFor(() =>
      expect(createReviewItem).toHaveBeenCalledWith(
        'b5e038f0-129b-461c-b30c-d42e4cdfd1bd',
        expect.objectContaining({ beforeBlockId, targetBlockId: block.id }),
      ),
    )
  })
})
