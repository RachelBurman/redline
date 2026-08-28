import { z } from 'zod'

export const presenceHeartbeatSchema = z.object({
  documentVersionId: z.uuid(),
  clientId: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/),
  selectedBlockStableKey: z.string().min(1).max(120).nullable().optional(),
})
