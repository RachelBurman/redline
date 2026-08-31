export interface ReviewerMemberSummary {
  id: string
  userId: string
  name: string
  email: string
  role: string
  joinedAt: string
}

export interface ReviewerInvitationSummary {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
}

export interface ReviewerManagementSummary {
  members: ReviewerMemberSummary[]
  pendingInvitations: ReviewerInvitationSummary[]
}
