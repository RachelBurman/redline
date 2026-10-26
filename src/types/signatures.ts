export type SignatureRequestStatus =
  | 'pending'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'superseded'

export interface SignatureSlotSummary {
  id: string
  signerId: string
  signerName: string
  status: 'pending' | 'signed' | 'declined'
  signedAt: string | null
  declinedAt: string | null
  declineReason: string | null
}

export interface SignatureRequestSummary {
  id: string
  documentVersionId: string
  versionNumber: number
  reviewRoundId: string
  scope: 'individual' | 'everyone'
  purpose: string
  contentSha256: string
  status: SignatureRequestStatus
  requestedBy: { id: string; name: string }
  createdAt: string
  completedAt: string | null
  cancelledAt: string | null
  supersededAt: string | null
  slots: SignatureSlotSummary[]
}

export interface SignatureRequestList {
  requests: SignatureRequestSummary[]
  availableSigners: Array<{ id: string; name: string; email: string }>
}
