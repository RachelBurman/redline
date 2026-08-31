import { and, asc, eq } from 'drizzle-orm'

import { invitation, member, user } from '#/db/auth-schema'
import { db } from '#/db/index'

export async function listReviewerManagement(organizationId: string) {
  const [members, pendingInvitations] = await Promise.all([
    db
      .select({
        id: member.id,
        userId: member.userId,
        name: user.name,
        email: user.email,
        role: member.role,
        joinedAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId))
      .orderBy(asc(user.name), asc(user.email)),
    db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      })
      .from(invitation)
      .where(and(eq(invitation.organizationId, organizationId), eq(invitation.status, 'pending')))
      .orderBy(asc(invitation.createdAt)),
  ])

  return {
    members: members.map((organizationMember) => ({
      id: organizationMember.id,
      userId: organizationMember.userId,
      name: organizationMember.name,
      email: organizationMember.email,
      role: organizationMember.role,
      joinedAt: organizationMember.joinedAt.toISOString(),
    })),
    pendingInvitations: pendingInvitations.map((pendingInvitation) => ({
      id: pendingInvitation.id,
      email: pendingInvitation.email,
      role: pendingInvitation.role ?? 'reviewer',
      status: pendingInvitation.status,
      expiresAt: pendingInvitation.expiresAt.toISOString(),
      createdAt: pendingInvitation.createdAt.toISOString(),
    })),
  }
}
