import { describe, expect, it } from 'vitest'

import { buildReviewQueueModel } from './review-queue-model'

import type { DocumentDetail } from '#/types/documents'
import type { ReviewItemSummary } from '#/types/reviews'

const blocks: DocumentDetail['blocks'] = [
  {
    id: 'block-opening',
    stableKey: 'opening',
    ordinal: 0,
    blockType: 'paragraph',
    text: 'Document introduction.',
    headingLevel: null,
    contentHash: 'hash-opening',
  },
  {
    id: 'heading-analysis',
    stableKey: 'analysis',
    ordinal: 1,
    blockType: 'heading',
    text: 'Analysis populations',
    headingLevel: 2,
    contentHash: 'hash-analysis-heading',
  },
  {
    id: 'block-analysis',
    stableKey: 'analysis-paragraph',
    ordinal: 2,
    blockType: 'paragraph',
    text: 'Analysis paragraph.',
    headingLevel: null,
    contentHash: 'hash-analysis',
  },
  {
    id: 'heading-safety',
    stableKey: 'safety',
    ordinal: 3,
    blockType: 'heading',
    text: 'Safety reporting',
    headingLevel: 2,
    contentHash: 'hash-safety-heading',
  },
]

function reviewItem(id: string, targetBlockId: string): ReviewItemSummary {
  return {
    id,
    documentVersionId: 'version-1',
    reviewRoundId: 'round-1',
    targetBlockId,
    targetStableKey: targetBlockId,
    changeType: 'replace',
    originalContent: 'Original',
    proposedContent: 'Proposed',
    category: 'Required change',
    priority: 'high',
    rationale: 'Required for this test.',
    status: 'open',
    revision: 1,
    author: { id: 'user-1', name: 'Reviewer' },
    createdAt: '2026-08-31T10:00:00.000Z',
    resolvedAt: null,
  }
}

describe('buildReviewQueueModel', () => {
  it('assigns proposals to the nearest preceding immutable heading', () => {
    const model = buildReviewQueueModel(blocks, [
      reviewItem('opening-review', 'block-opening'),
      reviewItem('heading-review', 'heading-analysis'),
      reviewItem('analysis-review', 'block-analysis'),
      reviewItem('safety-review', 'heading-safety'),
    ])

    expect(model.entries.map((entry) => [entry.item.id, entry.sectionLabel])).toEqual([
      ['opening-review', 'Before first heading'],
      ['heading-review', 'Analysis populations'],
      ['analysis-review', 'Analysis populations'],
      ['safety-review', 'Safety reporting'],
    ])
    expect(model.sections.map((section) => section.label)).toEqual([
      'Before first heading',
      'Analysis populations',
      'Safety reporting',
    ])
  })

  it('keeps a proposal visible when its legacy block cannot be matched', () => {
    const model = buildReviewQueueModel(blocks, [reviewItem('legacy-review', 'missing-block')])

    expect(model.entries[0]).toMatchObject({
      sectionLabel: 'Unsectioned',
      documentOrder: Number.MAX_SAFE_INTEGER,
    })
    expect(model.sections).toEqual([{ id: 'section:unsectioned', label: 'Unsectioned' }])
  })
})
