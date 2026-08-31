import { createTransport } from 'nodemailer'

import { readEmailConfig } from './email-config'

interface EmailMessage {
  recipient: string
  subject: string
  text: string
}

export async function sendEmail(message: EmailMessage) {
  const config = readEmailConfig(process.env)
  const transport = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
  })

  await transport.sendMail({
    from: config.from,
    to: message.recipient,
    subject: message.subject,
    text: message.text,
  })
}
