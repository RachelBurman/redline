import { describe, expect, it } from 'vitest'

import {
  buildReviewAssignmentAuditPayload,
  canBeAssignedToReview,
} from './review-assignment-policy'

describe('review assignment policy', () => {
  it.each(['owner', 'admin', 'editor', 'reviewer'])('allows %s to be assigned', (role) => {
    expect(canBeAssignedToReview(role)).toBe(true)
  })

  it.each(['viewer', 'auditor', 'member'])('does not assign %s review work', (role) => {
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
