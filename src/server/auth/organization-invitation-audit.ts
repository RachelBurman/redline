import { db } from '#/db/index'
import { appendAuditEvent } from '#/server/audit/append-audit-event'

interface InvitationAuditInput {
  invitation: {
    id: string
    email: string
    organizationId: string
    role: string
  }
  actorId: string
}

export function buildInvitationAuditPayload(input: InvitationAuditInput['invitation']) {
  return {
    invitationId: input.id,
    invitedEmail: input.email.toLowerCase(),
    role: input.role,
  }
}

export async function recordInvitationCreated(input: InvitationAuditInput) {
  await db.transaction((tx) =>
    appendAuditEvent(tx, {
      organizationId: input.invitation.organizationId,
      actorId: input.actorId,
      eventType: 'reviewer.invited',
      payload: buildInvitationAuditPayload(input.invitation),
    }),
  )
}

export async function recordInvitationAccepted(input: InvitationAuditInput) {
  await db.transaction((tx) =>
    appendAuditEvent(tx, {
      organizationId: input.invitation.organizationId,
      actorId: input.actorId,
      eventType: 'reviewer.invitation_accepted',
      payload: buildInvitationAuditPayload(input.invitation),
    }),
  )
}
