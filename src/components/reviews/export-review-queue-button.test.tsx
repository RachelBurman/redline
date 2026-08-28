import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ExportReviewQueueButton } from './export-review-queue-button'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mockDownloadApis(response: Response) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn<() => string>(() => 'blob:review-queue'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn<(objectUrl: string) => void>(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
}

describe('ExportReviewQueueButton', () => {
  it('shows the completed state inside the button without adding visible layout content', async () => {
    mockDownloadApis(new Response('review queue', { status: 201 }))
    const user = userEvent.setup()

    render(<ExportReviewQueueButton canExport documentId="document-1" title="Analysis plan" />)

    await user.click(screen.getByRole('button', { name: 'Download review queue CSV' }))

    expect(await screen.findByRole('button', { name: 'CSV downloaded' })).toBeEnabled()
    expect(screen.getByText('Review queue CSV downloaded.')).toHaveClass('sr-only')
  })

  it('keeps an export error accessible while offering an in-button retry state', async () => {
    mockDownloadApis(
      Response.json(
        { error: { message: 'The review queue could not be exported.' } },
        { status: 500 },
      ),
    )
    const user = userEvent.setup()

    render(<ExportReviewQueueButton canExport documentId="document-1" title="Analysis plan" />)

    await user.click(screen.getByRole('button', { name: 'Download review queue CSV' }))

    expect(await screen.findByRole('button', { name: 'Download failed - try again' })).toBeEnabled()
    expect(screen.getByText('The review queue could not be exported.')).toHaveClass('sr-only')
  })
})
