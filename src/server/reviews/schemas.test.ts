import { describe, expect, it } from 'vitest'

import {
  createReviewCommentSchema,
  createReviewItemSchema,
  resolveReviewItemSchema,
} from './schemas'

const validProposal = {
  documentVersionId: '7c322e0c-d60a-4d39-b4bc-f21a7685add6',
  reviewRoundId: '18ef785c-eb37-4459-9656-01147d3c0f6e',
  targetBlockId: '5ca113d3-7070-43e3-9c0f-722fa8340417',
  changeType: 'replace',
  proposedContent: 'The endpoint will be assessed at week 16.',
  category: 'Statistical issue',
  priority: 'high',
  rationale: 'The protocol specifies the later assessment time.',
}

describe('review request schemas', () => {
  it('accepts a complete paragraph replacement', () => {
    expect(createReviewItemSchema.parse(validProposal)).toMatchObject(validProposal)
  })

  it('rejects whitespace-only replacement text and rationale', () => {
    expect(() =>
      createReviewItemSchema.parse({ ...validProposal, proposedContent: '   ' }),
    ).toThrow('Replacement text is required.')
    expect(() => createReviewItemSchema.parse({ ...validProposal, rationale: '  ' })).toThrow(
      /Too small/,
    )
  })

  it('accepts deletion proposals without replacement text', () => {
    const deletion = {
      ...validProposal,
      changeType: 'delete' as const,
      proposedContent: null,
    }

    expect(createReviewItemSchema.parse(deletion)).toMatchObject(deletion)
  })

  it('rejects replacement text on deletion proposals', () => {
    expect(() => createReviewItemSchema.parse({ ...validProposal, changeType: 'delete' })).toThrow(
      /Invalid input/,
    )
  })

  it('accepts a non-empty paragraph insertion', () => {
    const insertion = {
      ...validProposal,
      changeType: 'insert' as const,
      beforeBlockId: '0bb68c55-1bd3-49b5-8a2c-53b89c7fbc42',
      proposedContent: 'A newly proposed paragraph.',
    }

    expect(createReviewItemSchema.parse(insertion)).toMatchObject(insertion)
  })

  it('rejects a blank paragraph insertion', () => {
    expect(() =>
      createReviewItemSchema.parse({
        ...validProposal,
        changeType: 'insert',
        beforeBlockId: null,
        proposedContent: '   ',
      }),
    ).toThrow('New paragraph text is required.')
  })

  it('requires optimistic concurrency data for decisions', () => {
    expect(resolveReviewItemSchema.parse({ decision: 'accept', expectedRevision: 2 })).toEqual({
      decision: 'accept',
      expectedRevision: 2,
    })
    expect(() =>
      resolveReviewItemSchema.parse({ decision: 'accept', expectedRevision: 0 }),
    ).toThrow(/Too small/)
  })

  it('trims and accepts a review comment', () => {
    expect(createReviewCommentSchema.parse({ body: '  Please confirm this value.  ' })).toEqual({
      body: 'Please confirm this value.',
    })
  })

  it('accepts a direct reply with a UUID parent', () => {
    expect(
      createReviewCommentSchema.parse({
        body: '  I confirmed it.  ',
        parentCommentId: '7c322e0c-d60a-4d39-b4bc-f21a7685add6',
      }),
    ).toEqual({
      body: 'I confirmed it.',
      parentCommentId: '7c322e0c-d60a-4d39-b4bc-f21a7685add6',
    })
  })

  it('rejects a malformed reply parent', () => {
    expect(() =>
      createReviewCommentSchema.parse({ body: 'Reply', parentCommentId: 'not-a-uuid' }),
    ).toThrow(/Invalid UUID/)
  })

  it('rejects blank and oversized review comments', () => {
    expect(() => createReviewCommentSchema.parse({ body: '   ' })).toThrow(
      'Comment text is required.',
    )
    expect(() => createReviewCommentSchema.parse({ body: 'a'.repeat(5_001) })).toThrow(/Too big/)
  })
})
