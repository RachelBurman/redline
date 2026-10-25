import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DocumentAuditPanel } from './document-audit-panel'

import type { DocumentAuditEvent } from '#/types/audit'
import type { ListDocumentAuditEventsAction } from './document-audit-panel'

const auditEvent: DocumentAuditEvent = {
  id: 'event-1',
  sequence: 42,
  eventType: 'review_item.accepted',
  payload: { changeType: 'replace' },
  actor: { id: 'user-1', name: 'Aisha Rahman' },
  documentVersionId: 'version-1',
  reviewItemId: 'review-1',
  previousHash: 'a'.repeat(64),
  eventHash: 'b'.repeat(64),
  occurredAt: '2026-08-31T10:15:00.000Z',
}

afterEach(cleanup)

describe('DocumentAuditPanel', () => {
  it('loads append-only activity on demand and exposes verification hashes', async () => {
    const listDocumentAuditEvents = vi.fn<ListDocumentAuditEventsAction>(async () => [auditEvent])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <DocumentAuditPanel
          documentId="document-1"
          listDocumentAuditEvents={listDocumentAuditEvents}
        />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()

    expect(listDocumentAuditEvents).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Audit trail/ }))

    expect(await screen.findByText('Proposal accepted')).toBeVisible()
    expect(screen.getByText(/Aisha Rahman/)).toBeVisible()
    await user.click(screen.getByText('Verification details'))
    expect(screen.getByText('b'.repeat(64))).toBeVisible()
    expect(listDocumentAuditEvents).toHaveBeenCalledWith('document-1')
  })
})
