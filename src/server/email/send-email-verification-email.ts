import { sendEmail } from './send-email'

export async function sendEmailVerificationEmail(input: {
  recipient: string
  verificationUrl: string
}) {
  await sendEmail({
    recipient: input.recipient,
    subject: 'Verify your Redline email address',
    text: [
      'Verify your email address to accept invitations securely.',
      '',
      `Verify your email: ${input.verificationUrl}`,
      '',
      'If you did not create a Redline account, you can ignore this email.',
    ].join('\n'),
  })
}
