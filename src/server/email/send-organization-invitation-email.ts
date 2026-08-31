import { sendEmail } from './send-email'

export async function sendOrganizationInvitationEmail(input: {
  recipient: string
  organizationName: string
  inviterName: string
  invitationUrl: string
}) {
  await sendEmail({
    recipient: input.recipient,
    subject: `Join ${input.organizationName} on Redline`,
    text: [
      `${input.inviterName} invited you to review documents for ${input.organizationName} on Redline.`,
      '',
      `Review the invitation: ${input.invitationUrl}`,
      '',
      'The invitation is tied to this email address. Sign in or create an account with the same address to accept it.',
    ].join('\n'),
  })
}
