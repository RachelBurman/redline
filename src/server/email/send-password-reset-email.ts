import { sendEmail } from './send-email'

export async function sendPasswordResetEmail(input: { recipient: string; resetUrl: string }) {
  await sendEmail({
    recipient: input.recipient,
    subject: 'Reset your Redline password',
    text: [
      'A password reset was requested for your Redline account.',
      '',
      `Reset your password: ${input.resetUrl}`,
      '',
      'This link expires in one hour. If you did not request this, you can ignore this email.',
    ].join('\n'),
  })
}
