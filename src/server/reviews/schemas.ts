import { z } from 'zod'

import { reviewCategories, reviewPriorities } from '#/domain/review/review-options'

const createReviewItemBaseSchema = z.object({
  documentVersionId: z.uuid(),
  reviewRoundId: z.uuid(),
  targetBlockId: z.uuid(),
  category: z.enum(reviewCategories),
  priority: z.enum(reviewPriorities),
  rationale: z.string().trim().min(3).max(5_000),
})

export const createReviewItemSchema = z.discriminatedUnion('changeType', [
  createReviewItemBaseSchema.extend({
    changeType: z.literal('replace'),
    proposedContent: z
      .string()
      .max(100_000)
      .refine((value) => value.trim().length > 0, 'Replacement text is required.'),
  }),
  createReviewItemBaseSchema.extend({
    changeType: z.literal('delete'),
    proposedContent: z.null(),
  }),
  createReviewItemBaseSchema.extend({
    changeType: z.literal('insert'),
    proposedContent: z
      .string()
      .max(100_000)
      .refine((value) => value.trim().length > 0, 'New paragraph text is required.'),
  }),
])

export const resolveReviewItemSchema = z.object({
  decision: z.enum(['accept', 'reject']),
  expectedRevision: z.int().positive(),
})

export const createReviewCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment text is required.').max(5_000),
  parentCommentId: z.uuid().optional(),
})
