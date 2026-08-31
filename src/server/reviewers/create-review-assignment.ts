import { and, eq, isNull, sql } from 'drizzle-orm'

import { member } from '#/db/auth-schema'
import { db } from '#/db/index'
import { documents, reviewAssignments, reviewRounds } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanAssignReviewers } from '#/server/auth/permissions'

import {
  ReviewAssigneeNotFoundError,
  ReviewAssignmentConflictError,
  ReviewRoundNotFoundError,
} from './review-assignment-errors'
import {
  buildReviewAssignmentAuditPayload,
  canBeAssignedToReview,
} from './review-assignment-policy'

interface AssignmentContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

export async function createReviewAssignment(input: {
  context: AssignmentContext
  documentId: string
  reviewRoundId: string
  reviewerId: string
}) {
  assertCanAssignReviewers(input.context.role)

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.reviewRoundId}))`)
    const [reviewRound] = await tx
      .select({
        id: reviewRounds.id,
        documentVersionId: reviewRounds.documentVersionId,
      })
      .from(reviewRounds)
      .innerJoin(documents, eq(reviewRounds.documentId, documents.id))
      .where(
        and(
          eq(reviewRounds.id, input.reviewRoundId),
          eq(reviewRounds.status, 'open'),
          eq(documents.id, input.documentId),
          eq(documents.organizationId, input.context.organizationId),
          eq(documents.currentVersionId, reviewRounds.documentVersionId),
        ),
      )
      .limit(1)
      .for('update')
    if (!reviewRound) throw new ReviewRoundNotFoundError()

    const [reviewer] = await tx
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, input.context.organizationId),
          eq(member.userId, input.reviewerId),
        ),
      )
      .limit(1)
    if (!reviewer || !canBeAssignedToReview(reviewer.role)) {
      throw new ReviewAssigneeNotFoundError()
    }

    const [existingAssignment] = await tx
      .select({ id: reviewAssignments.id })
      .from(reviewAssignments)
      .where(
        and(
          eq(reviewAssignments.reviewRoundId, reviewRound.id),
          eq(reviewAssignments.reviewerId, input.reviewerId),
          isNull(reviewAssignments.revokedAt),
        ),
      )
      .limit(1)
    if (existingAssignment) throw new ReviewAssignmentConflictError()

    const [assignment] = await tx
      .insert(reviewAssignments)
      .values({
        reviewRoundId: reviewRound.id,
        reviewerId: input.reviewerId,
        assignedById: input.context.userId,
      })
      .returning()
    if (!assignment) throw new Error('The review assignment could not be created.')

    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: reviewRound.documentVersionId,
      reviewRoundId: reviewRound.id,
      actorId: input.context.userId,
      eventType: 'review_assignment.created',
      payload: buildReviewAssignmentAuditPayload({
        assignmentId: assignment.id,
        reviewerId: assignment.reviewerId,
      }),
    })

    return {
      id: assignment.id,
      reviewerId: assignment.reviewerId,
      assignedAt: assignment.assignedAt.toISOString(),
    }
  })
}
