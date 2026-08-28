import { describe, expect, it } from 'vitest'

import { buildReviewQueueCsv } from './build-review-queue-csv'

import type { ReviewQueueExportRow } from './build-review-queue-csv'

const row: ReviewQueueExportRow = {
  reviewItemId: 'review-1',
  parentReviewItemId: null,
  documentId: 'document-1',
  documentTitle: 'Analysis plan',
  documentVersionNumber: 3,
  documentVersionId: 'version-3',
  reviewRoundName: 'Review round 3',
  reviewRoundId: 'round-3',
  changeType: 'replace',
  targetBlockStableKey: 'paragraph-4',
  targetBlockId: 'block-4',
  startOffset: 0,
  endOffset: 24,
  originalContent: 'Use the primary endpoint.',
  proposedContent: 'Use the confirmed endpoint.',
  finalContent: null,
  category: 'Factual correction',
  priority: 'high',
  rationale: 'The endpoint was confirmed.',
  status: 'open',
  revision: 1,
  actioned: false,
  authorId: 'user-1',
  authorName: 'Aisha Rahman',
  createdAt: '2026-08-25T10:00:00.000Z',
  updatedAt: '2026-08-25T10:00:00.000Z',
  decision: null,
  resolutionNote: null,
  resolverId: null,
  resolverName: null,
  resolvedAt: null,
  discussionCount: 0,
}

describe('buildReviewQueueCsv', () => {
  it('writes an Excel-compatible header and the complete review record', () => {
    const csv = buildReviewQueueCsv([row])

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"Original Text","Proposed Text","Final Text"')
    expect(csv).toContain('"Factual correction","high","The endpoint was confirmed."')
    expect(csv).toContain('"open","1","No"')
    expect(csv.endsWith('\r\n')).toBe(true)
  })

  it('escapes quotes and preserves line breaks inside a cell', () => {
    const csv = buildReviewQueueCsv([
      {
        ...row,
        rationale: 'Explain "why", then\nrecord the decision.',
      },
    ])

    expect(csv).toContain('"Explain ""why"", then\nrecord the decision."')
  })

  it.each(['=HYPERLINK("https://example.com")', '+cmd', '-2+3', '@SUM(1,2)'])(
    'neutralises spreadsheet formula input beginning with %s',
    (originalContent) => {
      const csv = buildReviewQueueCsv([{ ...row, originalContent }])

      expect(csv).toContain(`"'${originalContent.replaceAll('"', '""')}"`)
    },
  )

  it('exports headers even when the queue is empty', () => {
    const csv = buildReviewQueueCsv([])

    expect(csv).toContain('"Review Item ID"')
    expect(csv.split('\r\n')).toHaveLength(2)
  })
})
