import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RichMediaBlockView } from './rich-media-block-view'

import type { DocumentBlockDetail } from '#/types/documents'

const block: DocumentBlockDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  stableKey: 'media-1',
  ordinal: 0,
  blockType: 'rich_media',
  text: 'Quarterly growth',
  headingLevel: null,
  contentHash: 'block-hash',
  media: {
    assetId: '22222222-2222-4222-8222-222222222222',
    altText: 'A line graph rising from ten to twenty.',
    caption: 'Quarterly growth',
    source: 'Internal analysis',
    provenance: {},
    width: 800,
    height: 450,
    byteSize: 1234,
    mimeType: 'image/png',
    contentHash: 'a'.repeat(64),
    processingStatus: 'ready',
    url: '/media/original',
    previewUrl: '/media/preview?variant=preview',
  },
}

afterEach(cleanup)

describe('RichMediaBlockView', () => {
  it('renders accessible media, caption, source, actions, and keyboard-closeable zoom', async () => {
    const user = userEvent.setup()
    const onReplace = vi.fn<() => void>()
    render(<RichMediaBlockView block={block} onReplace={onReplace} />)
    const image = screen.getByAltText('A line graph rising from ten to twenty.')
    fireEvent.load(image)

    expect(screen.getByText('Quarterly growth')).toBeInTheDocument()
    expect(screen.getByText('Source: Internal analysis')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view full-size image/i }))
    expect(screen.getByRole('dialog', { name: 'Full-size image preview' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Replace' }))
    expect(onReplace).toHaveBeenCalledOnce()
  })

  it('shows a recoverable state when the authorised derivative fails', async () => {
    const user = userEvent.setup()
    render(<RichMediaBlockView block={block} />)
    fireEvent.error(screen.getByAltText('A line graph rising from ten to twenty.'))

    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded')
    await user.click(screen.getByRole('button', { name: 'Retry preview' }))
    expect(screen.getByRole('status')).toHaveTextContent('Loading image')
  })

  it('does not render a broken image for failed processing', () => {
    render(
      <RichMediaBlockView
        block={{ ...block, media: { ...block.media!, processingStatus: 'quarantined' } }}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('quarantined')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
