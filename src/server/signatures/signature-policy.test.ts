import { describe, expect, it } from 'vitest'

import { buildConsentStatement, signatureStatusLabel } from './signature-policy'

describe('signature policy copy', () => {
  it('identifies the exact title, version, and meaning in consent', () => {
    expect(
      buildConsentStatement({
        documentTitle: 'Supply agreement',
        versionNumber: 4,
        purpose: 'Approve for publication.',
      }),
    ).toBe(
      'I confirm that I reviewed “Supply agreement” version 4 and electronically sign it to mean: Approve for publication.',
    )
  })

  it.each([
    ['completed', 'Fully signed'],
    ['pending', 'Partially signed'],
    ['declined', 'Declined'],
    ['cancelled', 'Cancelled'],
    ['superseded', 'Superseded'],
    ['missing', 'Unsigned'],
  ])('maps %s to export-safe copy', (status, label) => {
    expect(signatureStatusLabel(status)).toBe(label)
  })
})
