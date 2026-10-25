import { describe, expect, it } from 'vitest'

import {
  buildReviewAssignmentAuditPayload,
  canBeAssignedToReview,
} from './review-assignment-policy'

describe('review assignment policy', () => {
  it.each(['owner', 'admin', 'editor', 'reviewer', 'viewer', 'auditor'])(
    'allows %s to be assigned',
    (role) => {
      expect(canBeAssignedToReview(role)).toBe(true)
    },
  )

  it('does not assign members without a document role', () => {
    const role = 'member'
    expect(canBeAssignedToReview(role)).toBe(false)
  })

  it('keeps assignment audit payloads free of reviewer profile data', () => {
    expect(
      buildReviewAssignmentAuditPayload({
        assignmentId: 'assignment-1',
        reviewerId: 'reviewer-1',
      }),
    ).toEqual({ assignmentId: 'assignment-1', reviewerId: 'reviewer-1' })
  })
})
