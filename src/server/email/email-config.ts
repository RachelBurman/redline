import { z } from 'zod'

const emailConfigSchema = z
  .object({
    host: z.string().trim().min(1),
    port: z.coerce.number().int().min(1).max(65_535),
    secure: z.enum(['true', 'false']).transform((value) => value === 'true'),
    user: z.string().trim().optional(),
    password: z.string().optional(),
    from: z.string().trim().min(3),
  })
  .refine((config) => Boolean(config.user) === Boolean(config.password), {
    message: 'SMTP_USER and SMTP_PASSWORD must either both be set or both be empty.',
  })

export function readEmailConfig(environment: NodeJS.ProcessEnv) {
  const isProduction = environment.NODE_ENV === 'production'
  return emailConfigSchema.parse({
    host: environment.SMTP_HOST ?? (isProduction ? undefined : '127.0.0.1'),
    port: environment.SMTP_PORT ?? (isProduction ? undefined : '1025'),
    secure: environment.SMTP_SECURE ?? 'false',
    user: environment.SMTP_USER || undefined,
    password: environment.SMTP_PASSWORD || undefined,
    from: environment.SMTP_FROM ?? (isProduction ? undefined : 'Redline <no-reply@redline.local>'),
  })
}
