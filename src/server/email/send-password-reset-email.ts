import { createTransport } from 'nodemailer'

import { readEmailConfig } from './email-config'

export async function sendPasswordResetEmail(input: { recipient: string; resetUrl: string }) {
  const config = readEmailConfig(process.env)
  const transport = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
  })

  await transport.sendMail({
    from: config.from,
    to: input.recipient,
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
