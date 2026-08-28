export type DocumentVersionOrigin = 'upload' | 'checkpoint' | 'import' | 'restore'

export interface DocumentVersionSummary {
  id: string
  versionNumber: number
  origin: DocumentVersionOrigin
  note: string | null
  parentVersionId: string | null
  restoredFromVersion: { id: string; versionNumber: number } | null
  createdBy: { id: string; name: string }
  createdAt: string
  publishedAt: string | null
  isCurrent: boolean
  blockCount: number
  acceptedChangeCount: number
  unresolvedReviewItemCount: number
}

export interface VersionActionResult {
  documentId: string
  previousVersionId: string
  documentVersionId: string
  versionNumber: number
  reviewRoundId: string
  acceptedChangeCount: number
  supersededReviewItemCount: number
}
