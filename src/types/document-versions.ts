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

export type VersionComparisonChangeType = 'added' | 'modified' | 'removed' | 'unchanged'

export interface VersionComparisonBlockSnapshot {
  stableKey: string
  ordinal: number
  blockType:
    | 'heading'
    | 'paragraph'
    | 'list_item'
    | 'table'
    | 'table_row'
    | 'table_cell'
    | 'page_break'
    | 'unsupported'
  text: string
  headingLevel: number | null
}

export interface VersionComparisonBlock {
  stableKey: string
  changeType: VersionComparisonChangeType
  base: VersionComparisonBlockSnapshot | null
  target: VersionComparisonBlockSnapshot | null
}

export interface DocumentVersionComparison {
  documentId: string
  baseVersion: { id: string; versionNumber: number }
  targetVersion: { id: string; versionNumber: number }
  summary: Record<VersionComparisonChangeType, number> & { totalChanges: number }
  blocks: VersionComparisonBlock[]
}
