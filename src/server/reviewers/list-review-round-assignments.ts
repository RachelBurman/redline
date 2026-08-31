import { and, asc, eq, inArray, isNull } from 'drizzle-orm'

import { member, user } from '#/db/auth-schema'
import { db } from '#/db/index'
import { documents, reviewAssignments, reviewRounds } from '#/db/schema'

import { ReviewRoundNotFoundError } from './review-assignment-errors'

export async function listReviewRoundAssignments(input: {
  organizationId: string
  documentId: string
  reviewRoundId: string
}) {
  const [reviewRound] = await db
    .select({
      id: reviewRounds.id,
      documentVersionId: reviewRounds.documentVersionId,
    })
    .from(reviewRounds)
    .innerJoin(documents, eq(reviewRounds.documentId, documents.id))
    .where(
      and(
        eq(reviewRounds.id, input.reviewRoundId),
        eq(documents.id, input.documentId),
        eq(documents.organizationId, input.organizationId),
      ),
    )
    .limit(1)
  if (!reviewRound) throw new ReviewRoundNotFoundError()

  const members = await db
    .select({
      memberId: member.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
      assignmentId: reviewAssignments.id,
      assignedAt: reviewAssignments.assignedAt,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .leftJoin(
      reviewAssignments,
      and(
        eq(reviewAssignments.reviewRoundId, reviewRound.id),
        eq(reviewAssignments.reviewerId, user.id),
        isNull(reviewAssignments.revokedAt),
      ),
    )
    .where(
      and(
        eq(member.organizationId, input.organizationId),
        inArray(member.role, ['owner', 'admin', 'editor', 'reviewer']),
      ),
    )
    .orderBy(asc(user.name), asc(user.email))

  return {
    reviewRoundId: reviewRound.id,
    documentVersionId: reviewRound.documentVersionId,
    members: members.map((organizationMember) => ({
      memberId: organizationMember.memberId,
      userId: organizationMember.userId,
      name: organizationMember.name,
      email: organizationMember.email,
      role: organizationMember.role,
      assignment:
        organizationMember.assignmentId && organizationMember.assignedAt
          ? {
              id: organizationMember.assignmentId,
              assignedAt: organizationMember.assignedAt.toISOString(),
            }
          : null,
    })),
  }
}
