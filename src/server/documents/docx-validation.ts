const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ALLOWED_MIME_TYPES = new Set([DOCX_MIME, 'application/octet-stream', 'application/zip'])

export const MAX_DOCX_BYTES = 15 * 1024 * 1024

export class InvalidDocxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidDocxError'
  }
}

export function validateDocxFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    throw new InvalidDocxError('Choose a Microsoft Word .docx file.')
  }

  if (file.size === 0) {
    throw new InvalidDocxError('The selected document is empty.')
  }

  if (file.size > MAX_DOCX_BYTES) {
    throw new InvalidDocxError('The document must be 15 MB or smaller.')
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new InvalidDocxError('The selected file does not have a supported Word document type.')
  }
}

export function validateDocxSignature(bytes: Uint8Array) {
  const hasZipSignature =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08))

  if (!hasZipSignature) {
    throw new InvalidDocxError('The selected file is not a valid .docx package.')
  }
}
