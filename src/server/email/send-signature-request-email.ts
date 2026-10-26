import { sendEmail } from './send-email'

export async function sendSignatureRequestEmail(input: {
  recipient: string
  documentTitle: string
  versionNumber: number
  requesterName: string
  purpose: string
  requestUrl: string
}) {
  await sendEmail({
    recipient: input.recipient,
    subject: `Signature requested: ${input.documentTitle} v${input.versionNumber}`,
    text: [
      `${input.requesterName} asked you to electronically sign “${input.documentTitle}” version ${input.versionNumber}.`,
      '',
      `Meaning of signing: ${input.purpose}`,
      '',
      `Review the exact version and respond: ${input.requestUrl}`,
      '',
      'Redline records this as a baseline electronic sign-off. It is not an Advanced or Qualified Electronic Signature.',
    ].join('\n'),
  })
}
