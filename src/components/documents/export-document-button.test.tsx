import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ExportDocumentButton } from './export-document-button'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mockDownloadApis(response: Response) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn<() => string>(() => 'blob:resolved-document'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn<(objectUrl: string) => void>(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
}

describe('ExportDocumentButton', () => {
  it('shows the completed state inside the button without adding visible layout content', async () => {
    mockDownloadApis(new Response('resolved document', { status: 201 }))
    const user = userEvent.setup()

    render(<ExportDocumentButton canExport documentId="document-1" title="Analysis plan" />)

    await user.click(screen.getByRole('button', { name: 'Download resolved .docx' }))

    expect(await screen.findByRole('button', { name: 'DOCX downloaded' })).toBeEnabled()
    expect(screen.getByText('Resolved document downloaded.')).toHaveClass('sr-only')
  })

  it('keeps an export error accessible while offering an in-button retry state', async () => {
    mockDownloadApis(
      Response.json(
        { error: { message: 'The resolved document could not be exported.' } },
        { status: 500 },
      ),
    )
    const user = userEvent.setup()

    render(<ExportDocumentButton canExport documentId="document-1" title="Analysis plan" />)

    await user.click(screen.getByRole('button', { name: 'Download resolved .docx' }))

    expect(await screen.findByRole('button', { name: 'Download failed - try again' })).toBeEnabled()
    expect(screen.getByText('The resolved document could not be exported.')).toHaveClass('sr-only')
  })
})
