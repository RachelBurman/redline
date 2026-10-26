import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SignaturePanel } from './signature-panel'

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
      <SignaturePanel
        canManage
        documentId="document-1"
        documentTitle="Supply agreement"
        documentVersionId="version-4"
        userId="user-1"
        versionNumber={4}
      />
    </QueryClientProvider>,
  )
}

const pendingRequest = {
  id: 'request-1',
  documentVersionId: 'version-4',
  versionNumber: 4,
  reviewRoundId: 'round-4',
  scope: 'everyone',
  purpose: 'Approve for publication.',
  contentSha256: 'abc',
  status: 'pending',
  requestedBy: { id: 'owner-1', name: 'Robin Owner' },
  createdAt: '2026-10-26T12:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
  supersededAt: null,
  slots: [
    {
      id: 'slot-1',
      signerId: 'user-1',
      signerName: 'Alex Signer',
      status: 'pending',
      signedAt: null,
      declinedAt: null,
      declineReason: null,
    },
  ],
}

describe('SignaturePanel', () => {
  it('creates an everyone-sign request for the exact displayed version', async () => {
    apiRequest.mockResolvedValue({
      requests: [],
      availableSigners: [{ id: 'user-1', name: 'Alex Signer', email: 'alex@example.com' }],
    })
    renderPanel()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Everyone sign' }))

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/documents/document-1/signature-requests',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"documentVersionId":"version-4"'),
        }),
      )
    })
  })

  it('requires an explicit version-specific confirmation before signing', async () => {
    apiRequest.mockResolvedValue({ requests: [pendingRequest], availableSigners: [] })
    renderPanel()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Review and sign' }))

    expect(screen.getByRole('heading', { name: 'Sign Supply agreement, version 4' })).toBeVisible()
    expect(screen.getByText(/reviewed “Supply agreement” version 4/)).toBeVisible()

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Confirm electronic signature' }))
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/documents/document-1/signature-requests/request-1/sign',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"confirmed":true'),
        }),
      )
    })
  })

  it('exposes signer status and both evidence downloads', async () => {
    apiRequest.mockResolvedValue({ requests: [pendingRequest], availableSigners: [] })
    renderPanel()

    expect(await screen.findByText('Alex Signer')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Certificate' })).toHaveAttribute(
      'href',
      expect.stringContaining('format=certificate'),
    )
    expect(screen.getByRole('link', { name: 'Manifest' })).toHaveAttribute(
      'href',
      expect.stringContaining('format=json'),
    )
  })
})
