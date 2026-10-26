import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DocumentReviewWorkspace, type ActiveReviewProposal } from './document-review-workspace'

import type { DocumentDetail } from '#/types/documents'
import type { ReviewCommentSummary, ReviewItemSummary } from '#/types/reviews'

vi.mock('./document-viewer', () => ({
  DocumentViewer: () => <div>Document viewer</div>,
}))

vi.mock('#/components/reviews/review-sidebar', () => ({
  ReviewSidebar: () => <div>Review sidebar</div>,
}))

const document: DocumentDetail = {
  capabilities: {
    comment: true,
    exportDocument: true,
    exportReviewQueue: true,
    manageAssignments: true,
    manageVersions: true,
    review: true,
    resolve: true,
    viewAudit: true,
  },
  document: {
    id: 'document-1',
    title: 'Protocol manuscript',
    createdAt: '2026-10-25T10:00:00.000Z',
  },
  version: {
    id: 'version-1',
    versionNumber: 1,
    origin: 'upload',
    note: null,
    isCurrent: true,
    parserWarnings: [],
    createdAt: '2026-10-25T10:00:00.000Z',
  },
  reviewRound: { id: 'round-1', name: 'Round 1' },
  insertionAnchors: [],
  blocks: [],
}
const emptyItems: ReviewItemSummary[] = []

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

function WorkspaceHarness() {
  const [mobilePane, setMobilePane] = useState<'document' | 'reviews'>('document')

  return (
    <DocumentReviewWorkspace
      activeProposal={null}
      document={document}
      documentId={document.document.id}
      isViewingHistoricalVersion={false}
      items={emptyItems}
      mobilePane={mobilePane}
      onCancelProposal={vi.fn<() => void>()}
      onCommentCreated={vi.fn<(comment: ReviewCommentSummary) => void>()}
      onCreated={vi.fn<(item: ReviewItemSummary) => void>()}
      onMobilePaneChange={setMobilePane}
      onResolve={vi.fn<(item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>>()}
      onSelectItem={vi.fn<(item: ReviewItemSummary) => void>()}
      onStartProposal={vi.fn<(proposal: ActiveReviewProposal) => void>()}
      selectedItemId={null}
      userId="user-1"
    />
  )
}

describe('DocumentReviewWorkspace', () => {
  it('switches the compact workspace between document and review panes', async () => {
    render(<WorkspaceHarness />)

    const documentTab = screen.getByRole('tab', { name: 'Document' })
    const reviewsTab = screen.getByRole('tab', { name: 'Reviews (0)' })
    const documentPane = screen.getByRole('tabpanel', { name: 'Document' })
    const reviewPane = screen.getByRole('tabpanel', { name: 'Reviews (0)' })

    expect(documentTab).toHaveAttribute('aria-selected', 'true')
    expect(documentPane).toHaveClass('block')
    expect(reviewPane).toHaveClass('hidden', 'xl:block')

    await userEvent.setup().click(reviewsTab)

    expect(reviewsTab).toHaveAttribute('aria-selected', 'true')
    expect(documentPane).toHaveClass('hidden', 'xl:block')
    expect(reviewPane).toHaveClass('block')
  })

  it('switches display projections without changing the document data', async () => {
    const user = userEvent.setup()
    render(<WorkspaceHarness />)

    await user.click(screen.getByRole('radio', { name: 'LaTeX source' }))

    expect(screen.getByRole('region', { name: 'LaTeX source projection' })).toBeVisible()
    expect(screen.queryByText('Document viewer')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('redline:document-display-mode:user-1')).toBe('latex-source')
    expect(document.version.id).toBe('version-1')

    await user.click(screen.getByRole('radio', { name: 'Rendered LaTeX' }))

    expect(screen.getByText('Document viewer')).toBeVisible()
    expect(window.localStorage.getItem('redline:document-display-mode:user-1')).toBe(
      'latex-rendered',
    )
  })
})
