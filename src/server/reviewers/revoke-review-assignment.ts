import { and, eq, isNull, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import { documents, reviewAssignments, reviewRounds } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanAssignReviewers } from '#/server/auth/permissions'

import { ReviewAssignmentNotFoundError, ReviewRoundNotFoundError } from './review-assignment-errors'
import { buildReviewAssignmentAuditPayload } from './review-assignment-policy'

interface AssignmentContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

export async function revokeReviewAssignment(input: {
  context: AssignmentContext
  documentId: string
  reviewRoundId: string
  assignmentId: string
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

    const revokedAt = new Date()
    const [assignment] = await tx
      .update(reviewAssignments)
      .set({ revokedAt, revokedById: input.context.userId })
      .where(
        and(
          eq(reviewAssignments.id, input.assignmentId),
          eq(reviewAssignments.reviewRoundId, reviewRound.id),
          isNull(reviewAssignments.revokedAt),
        ),
      )
      .returning({ id: reviewAssignments.id, reviewerId: reviewAssignments.reviewerId })
    if (!assignment) throw new ReviewAssignmentNotFoundError()

    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: reviewRound.documentVersionId,
      reviewRoundId: reviewRound.id,
      actorId: input.context.userId,
      eventType: 'review_assignment.revoked',
      payload: buildReviewAssignmentAuditPayload({
        assignmentId: assignment.id,
        reviewerId: assignment.reviewerId,
      }),
    })

    return { ...assignment, revokedAt: revokedAt.toISOString() }
  })
}
