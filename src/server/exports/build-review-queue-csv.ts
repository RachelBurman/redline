export interface ReviewQueueExportRow {
  reviewItemId: string
  parentReviewItemId: string | null
  documentId: string
  documentTitle: string
  documentVersionNumber: number
  documentVersionId: string
  reviewRoundName: string
  reviewRoundId: string
  changeType: string
  targetBlockStableKey: string
  targetBlockId: string
  startOffset: number | null
  endOffset: number | null
  originalContent: string
  proposedContent: string | null
  finalContent: string | null
  category: string
  priority: string
  rationale: string
  status: string
  revision: number
  actioned: boolean
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
  decision: string | null
  resolutionNote: string | null
  resolverId: string | null
  resolverName: string | null
  resolvedAt: string | null
  discussionCount: number
}

interface CsvColumn {
  heading: string
  value: (row: ReviewQueueExportRow) => boolean | number | string | null
}

const columns: CsvColumn[] = [
  { heading: 'Review Item ID', value: (row) => row.reviewItemId },
  { heading: 'Parent Review Item ID', value: (row) => row.parentReviewItemId },
  { heading: 'Document ID', value: (row) => row.documentId },
  { heading: 'Document Title', value: (row) => row.documentTitle },
  { heading: 'Document Version', value: (row) => row.documentVersionNumber },
  { heading: 'Document Version ID', value: (row) => row.documentVersionId },
  { heading: 'Review Round', value: (row) => row.reviewRoundName },
  { heading: 'Review Round ID', value: (row) => row.reviewRoundId },
  { heading: 'Change Type', value: (row) => row.changeType },
  { heading: 'Target Block Key', value: (row) => row.targetBlockStableKey },
  { heading: 'Target Block ID', value: (row) => row.targetBlockId },
  { heading: 'Start Offset', value: (row) => row.startOffset },
  { heading: 'End Offset', value: (row) => row.endOffset },
  { heading: 'Original Text', value: (row) => row.originalContent },
  { heading: 'Proposed Text', value: (row) => row.proposedContent },
  { heading: 'Final Text', value: (row) => row.finalContent },
  { heading: 'Category', value: (row) => row.category },
  { heading: 'Priority', value: (row) => row.priority },
  { heading: 'Reason', value: (row) => row.rationale },
  { heading: 'Status', value: (row) => row.status },
  { heading: 'Revision', value: (row) => row.revision },
  { heading: 'Actioned', value: (row) => (row.actioned ? 'Yes' : 'No') },
  { heading: 'Reviewer ID', value: (row) => row.authorId },
  { heading: 'Reviewer', value: (row) => row.authorName },
  { heading: 'Created At', value: (row) => row.createdAt },
  { heading: 'Updated At', value: (row) => row.updatedAt },
  { heading: 'Decision', value: (row) => row.decision },
  { heading: 'Resolution Note', value: (row) => row.resolutionNote },
  { heading: 'Resolver ID', value: (row) => row.resolverId },
  { heading: 'Resolver', value: (row) => row.resolverName },
  { heading: 'Resolved At', value: (row) => row.resolvedAt },
  { heading: 'Discussion Count', value: (row) => row.discussionCount },
]

function spreadsheetSafeValue(value: boolean | number | string | null) {
  if (value === null) return ''

  const text = String(value)
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) return `'${text}`
  return text
}

function csvCell(value: boolean | number | string | null) {
  const safeValue = spreadsheetSafeValue(value)
  return `"${safeValue.replaceAll('"', '""')}"`
}

export function buildReviewQueueCsv(rows: ReviewQueueExportRow[]) {
  const header = columns.map((column) => csvCell(column.heading)).join(',')
  const body = rows.map((row) => columns.map((column) => csvCell(column.value(row))).join(','))
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`
}
