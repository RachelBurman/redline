export const DEFAULT_SIGNATURE_PURPOSE =
  'I approve this exact document version as the final reviewed version.'

export function buildConsentStatement(input: {
  documentTitle: string
  versionNumber: number
  purpose: string
}) {
  return `I confirm that I reviewed “${input.documentTitle}” version ${input.versionNumber} and electronically sign it to mean: ${input.purpose}`
}

export function signatureStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return 'Fully signed'
    case 'pending':
      return 'Partially signed'
    case 'declined':
      return 'Declined'
    case 'cancelled':
      return 'Cancelled'
    case 'superseded':
      return 'Superseded'
    default:
      return 'Unsigned'
  }
}
