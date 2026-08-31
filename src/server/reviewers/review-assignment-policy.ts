const assignableOrganizationRoles = new Set(['owner', 'admin', 'editor', 'reviewer'])

export function canBeAssignedToReview(role: string) {
  return assignableOrganizationRoles.has(role)
}

export function buildReviewAssignmentAuditPayload(input: {
  assignmentId: string
  reviewerId: string
}) {
  return {
    assignmentId: input.assignmentId,
    reviewerId: input.reviewerId,
  }
}
