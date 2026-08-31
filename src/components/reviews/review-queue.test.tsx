import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReviewQueue } from './review-queue'

import type { DocumentDetail } from '#/types/documents'
import type { ReviewCommentSummary, ReviewItemSummary } from '#/types/reviews'

const blocks: DocumentDetail['blocks'] = [
  {
    id: 'block-opening',
    stableKey: 'opening',
    ordinal: 0,
    blockType: 'paragraph',
    text: 'Document introduction.',
    headingLevel: null,
    contentHash: 'hash-opening',
  },
  {
    id: 'heading-analysis',
    stableKey: 'analysis',
    ordinal: 1,
    blockType: 'heading',
    text: 'Analysis populations',
    headingLevel: 2,
    contentHash: 'hash-analysis-heading',
  },
  {
    id: 'block-analysis',
    stableKey: 'analysis-paragraph',
    ordinal: 2,
    blockType: 'paragraph',
    text: 'Analysis paragraph.',
    headingLevel: null,
    contentHash: 'hash-analysis',
  },
  {
    id: 'heading-safety',
    stableKey: 'safety',
    ordinal: 3,
    blockType: 'heading',
    text: 'Safety reporting',
    headingLevel: 2,
    contentHash: 'hash-safety-heading',
  },
  {
    id: 'block-safety',
    stableKey: 'safety-paragraph',
    ordinal: 4,
    blockType: 'paragraph',
    text: 'Safety paragraph.',
    headingLevel: null,
    contentHash: 'hash-safety',
  },
]

const items: ReviewItemSummary[] = [
  {
    id: 'review-critical',
    documentVersionId: 'version-1',
    reviewRoundId: 'round-1',
    targetBlockId: 'block-analysis',
    targetStableKey: 'analysis-paragraph',
    changeType: 'replace',
    originalContent: 'Original critical text.',
    proposedContent: 'Corrected critical text.',
    category: 'Factual correction',
    priority: 'critical',
    rationale: 'This is factually incorrect.',
    status: 'open',
    revision: 1,
    author: { id: 'user-aisha', name: 'Aisha Rahman' },
    createdAt: '2026-08-31T12:00:00.000Z',
    resolvedAt: null,
  },
  {
    id: 'review-high',
    documentVersionId: 'version-1',
    reviewRoundId: 'round-1',
    targetBlockId: 'block-safety',
    targetStableKey: 'safety-paragraph',
    changeType: 'replace',
    originalContent: 'Original high text.',
    proposedContent: 'Corrected high text.',
    category: 'Grammar',
    priority: 'high',
    rationale: 'This sentence needs clarification.',
    status: 'under_discussion',
    revision: 2,
    author: { id: 'user-aisha', name: 'Aisha Rahman' },
    createdAt: '2026-08-31T11:00:00.000Z',
    resolvedAt: null,
  },
  {
    id: 'review-medium',
    documentVersionId: 'version-1',
    reviewRoundId: 'round-1',
    targetBlockId: 'block-opening',
    targetStableKey: 'opening',
    changeType: 'delete',
    originalContent: 'Obsolete introduction.',
    proposedContent: null,
    category: 'Clarification',
    priority: 'medium',
    rationale: 'The introduction is obsolete.',
    status: 'rejected',
    revision: 2,
    author: { id: 'user-morgan', name: 'Morgan Lee' },
    createdAt: '2026-08-31T10:00:00.000Z',
    resolvedAt: '2026-08-31T10:30:00.000Z',
  },
  {
    id: 'review-low',
    documentVersionId: 'version-1',
    reviewRoundId: 'round-1',
    targetBlockId: 'heading-safety',
    targetStableKey: 'safety',
    changeType: 'replace',
    originalContent: 'Safety',
    proposedContent: 'Safety reporting',
    category: 'Terminology',
    priority: 'low',
    rationale: 'Use consistent terminology.',
    status: 'accepted',
    revision: 2,
    author: { id: 'user-morgan', name: 'Morgan Lee' },
    createdAt: '2026-08-31T09:00:00.000Z',
    resolvedAt: '2026-08-31T09:30:00.000Z',
  },
]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderQueue(input?: {
  onSelect?: (item: ReviewItemSummary) => void
  selectedItemId?: string | null
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({ data: [] satisfies ReviewCommentSummary[] }, { status: 200 }),
    ),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onSelect = input?.onSelect ?? vi.fn<(item: ReviewItemSummary) => void>()
  function queue(queueItems: ReviewItemSummary[]) {
    return (
      <QueryClientProvider client={queryClient}>
        <ReviewQueue
          blocks={blocks}
          canComment={false}
          canResolve={false}
          documentId="document-1"
          items={queueItems}
          onCommentCreated={vi.fn<(comment: ReviewCommentSummary) => void>()}
          onResolve={vi.fn<
            (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
          >()}
          onSelect={onSelect}
          selectedItemId={input?.selectedItemId ?? null}
        />
      </QueryClientProvider>
    )
  }
  const rendered = render(queue(items))
  return {
    onSelect,
    rerenderItems: (queueItems: ReviewItemSummary[]) => rendered.rerender(queue(queueItems)),
  }
}

function proposalButtons() {
  return screen.getAllByRole('button', { name: /^Select / })
}

describe('ReviewQueue', () => {
  it('combines reviewer, category, status, section, and priority filters', async () => {
    const user = userEvent.setup()
    renderQueue()

    expect(screen.getByText('4 of 4 proposals')).toBeVisible()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reviewer' }), 'user-aisha')
    expect(proposalButtons()).toHaveLength(2)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Grammar')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'under_discussion')
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Section' }),
      'section:heading-safety',
    )
    await user.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'high')

    expect(proposalButtons()).toHaveLength(1)
    expect(proposalButtons()[0]).toHaveAccessibleName('Select Grammar proposal by Aisha Rahman')
    expect(screen.getByText('1 of 4 proposals')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Clear filters (5)' })).toBeEnabled()
  })

  it('shows no results and restores the complete queue when filters are cleared', async () => {
    const user = userEvent.setup()
    renderQueue()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Compliance issue')
    expect(screen.getByText('0 of 4 proposals')).toBeVisible()
    expect(screen.getByText(/No proposals match the current filters/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Clear filters (1)' }))
    expect(proposalButtons()).toHaveLength(4)
    expect(screen.getByText('4 of 4 proposals')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled()
  })

  it('preserves active filters when background data refreshes', async () => {
    const user = userEvent.setup()
    const { rerenderItems } = renderQueue()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reviewer' }), 'user-aisha')
    expect(screen.getByText('2 of 4 proposals')).toBeVisible()

    rerenderItems([
      ...items,
      {
        ...items[2]!,
        id: 'review-new-from-morgan',
        createdAt: '2026-08-31T13:00:00.000Z',
      },
    ])

    expect(screen.getByRole('combobox', { name: 'Reviewer' })).toHaveValue('user-aisha')
    expect(screen.getByText('2 of 5 proposals')).toBeVisible()
    expect(proposalButtons()).toHaveLength(2)
  })

  it('sorts by date, priority, and document order', async () => {
    const user = userEvent.setup()
    renderQueue()
    const sort = screen.getByRole('combobox', { name: 'Sort' })

    expect(proposalButtons()[0]).toHaveAccessibleName(
      'Select Factual correction proposal by Aisha Rahman',
    )
    await user.selectOptions(sort, 'oldest')
    expect(proposalButtons()[0]).toHaveAccessibleName('Select Terminology proposal by Morgan Lee')
    await user.selectOptions(sort, 'priority-high')
    expect(proposalButtons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Select Factual correction proposal by Aisha Rahman',
      'Select Grammar proposal by Aisha Rahman',
      'Select Clarification proposal by Morgan Lee',
      'Select Terminology proposal by Morgan Lee',
    ])
    await user.selectOptions(sort, 'document-order')
    expect(proposalButtons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Select Clarification proposal by Morgan Lee',
      'Select Factual correction proposal by Aisha Rahman',
      'Select Terminology proposal by Morgan Lee',
      'Select Grammar proposal by Aisha Rahman',
    ])
  })

  it('keeps a selected proposal open when filters hide its queue row', async () => {
    const user = userEvent.setup()
    renderQueue({ selectedItemId: 'review-critical' })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Grammar')

    expect(screen.getByText(/selected proposal is outside the current filters/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: /Factual correction/ })).toBeVisible()
  })

  it('selects a proposal with the keyboard', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn<(item: ReviewItemSummary) => void>()
    renderQueue({ onSelect })
    const firstProposal = proposalButtons()[0]!

    firstProposal.focus()
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(items[0])
  })

  it('renders section context inside each visible row', () => {
    renderQueue()
    const table = screen.getByRole('table')

    expect(within(table).getByText('Section: Analysis populations')).toBeVisible()
    expect(within(table).getAllByText('Section: Safety reporting')).toHaveLength(2)
  })
})
