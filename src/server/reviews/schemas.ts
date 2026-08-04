import { z } from 'zod'

import { reviewCategories, reviewPriorities } from '#/domain/review/review-options'

export const createReviewItemSchema = z.object({
  documentVersionId: z.uuid(),
  reviewRoundId: z.uuid(),
  targetBlockId: z.uuid(),
  proposedContent: z
    .string()
    .max(100_000)
    .refine((value) => value.trim().length > 0, 'Replacement text is required.'),
  category: z.enum(reviewCategories),
  priority: z.enum(reviewPriorities),
  rationale: z.string().trim().min(3).max(5_000),
})

export const resolveReviewItemSchema = z.object({
  decision: z.enum(['accept', 'reject']),
  expectedRevision: z.int().positive(),
})
