import { z } from 'zod'

export const createDocumentVersionSchema = z.object({
  expectedCurrentVersionId: z.uuid(),
  note: z.string().trim().min(3).max(500).optional(),
})

export const restoreDocumentVersionSchema = z.object({
  expectedCurrentVersionId: z.uuid(),
  reason: z.string().trim().min(3).max(500),
})

export const compareDocumentVersionsSchema = z
  .object({
    baseVersionId: z.uuid(),
    targetVersionId: z.uuid(),
  })
  .refine((versions) => versions.baseVersionId !== versions.targetVersionId, {
    message: 'Choose two different document versions to compare.',
    path: ['targetVersionId'],
  })
