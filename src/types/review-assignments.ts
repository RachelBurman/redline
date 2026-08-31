export interface ReviewAssignmentMember {
  memberId: string
  userId: string
  name: string
  email: string
  role: string
  assignment: {
    id: string
    assignedAt: string
  } | null
}

export interface ReviewRoundAssignmentSummary {
  reviewRoundId: string
  documentVersionId: string
  members: ReviewAssignmentMember[]
}
