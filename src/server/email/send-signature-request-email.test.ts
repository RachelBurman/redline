import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sendSignatureRequestEmail } from './send-signature-request-email'

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn<() => Promise<void>>() }))

vi.mock('./send-email', () => ({ sendEmail }))

beforeEach(() => sendEmail.mockReset())

describe('signature request email', () => {
  it('identifies the exact version, meaning, and baseline assurance level', async () => {
    await sendSignatureRequestEmail({
      recipient: 'signer@example.com',
      documentTitle: 'Agreement',
      versionNumber: 3,
      requesterName: 'Robin Owner',
      purpose: 'Approve for release.',
      requestUrl: 'https://redline.test/app/documents/document-1',
    })

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: 'signer@example.com',
        subject: 'Signature requested: Agreement v3',
        text: expect.stringMatching(/version 3[\s\S]*Approve for release[\s\S]*not an Advanced/),
      }),
    )
  })
})
