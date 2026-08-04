import { describe, expect, it } from 'vitest'

import { InvalidDocxError, validateDocxFile, validateDocxSignature } from './docx-validation'

describe('docx upload validation', () => {
  it('accepts a Word document with a ZIP signature', () => {
    const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'review.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    expect(() => validateDocxFile(file)).not.toThrow()
    expect(() => validateDocxSignature(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).not.toThrow()
  })

  it('rejects renamed non-Word content', () => {
    expect(() => validateDocxSignature(new TextEncoder().encode('not a zip'))).toThrow(
      InvalidDocxError,
    )
  })

  it('rejects the legacy .doc format', () => {
    const file = new File(['content'], 'review.doc', { type: 'application/msword' })
    expect(() => validateDocxFile(file)).toThrow('Choose a Microsoft Word .docx file.')
  })
})
