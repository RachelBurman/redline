import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReviewRoundAssignmentsPanel } from './review-round-assignments-panel'

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn<(input: string, init?: RequestInit) => Promise<unknown>>(),
}))

vi.mock('#/lib/api-client', () => ({ apiRequest }))

afterEach(() => {
  cleanup()
  apiRequest.mockReset()
})

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <ReviewRoundAssignmentsPanel
        documentId="document-1"
        reviewRoundId="round-1"
        reviewRoundName="Review round 1"
      />
    </QueryClientProvider>,
  )
}

const assignmentSummary = {
  reviewRoundId: 'round-1',
  documentVersionId: 'version-1',
  members: [
    {
      memberId: 'member-1',
      userId: 'user-1',
      name: 'Alex Reviewer',
      email: 'alex@example.com',
      role: 'reviewer',
      assignment: null,
    },
    {
      memberId: 'member-2',
      userId: 'user-2',
      name: 'Sam Editor',
      email: 'sam@example.com',
      role: 'editor',
      assignment: { id: 'assignment-2', assignedAt: '2026-08-31T12:00:00.000Z' },
    },
  ],
}

describe('ReviewRoundAssignmentsPanel', () => {
  it('assigns an eligible member to the exact review round', async () => {
    apiRequest.mockResolvedValue(assignmentSummary)
    renderPanel()

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Assign Alex Reviewer to Review round 1' }))

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/documents/document-1/review-rounds/round-1/assignments',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ reviewerId: 'user-1' }) }),
      )
    })
  })

  it('revokes an active assignment without deleting it from the audit history', async () => {
    apiRequest.mockResolvedValue(assignmentSummary)
    renderPanel()

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Remove Sam Editor from Review round 1' }))

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/documents/document-1/review-rounds/round-1/assignments/assignment-2',
        { method: 'DELETE' },
      )
    })
  })
})
