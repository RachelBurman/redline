import { z } from 'zod'

const environmentSchema = z
  .object({
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_URL: z.url().default('http://localhost:3000'),
    DATABASE_URL: z.string().min(1),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    TRUSTED_ORIGINS: z.string().optional(),
    TRUSTED_PROXY_IPS: z.string().optional(),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production' && !environment.BETTER_AUTH_SECRET) {
      context.addIssue({
        code: 'custom',
        message: 'BETTER_AUTH_SECRET must contain at least 32 characters in production.',
        path: ['BETTER_AUTH_SECRET'],
      })
    }
    if (
      environment.NODE_ENV === 'production' &&
      new URL(environment.BETTER_AUTH_URL).protocol !== 'https:'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'BETTER_AUTH_URL must use HTTPS in production.',
        path: ['BETTER_AUTH_URL'],
      })
    }
  })

function commaSeparatedValues(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function readAppEnvironment(environment: NodeJS.ProcessEnv) {
  const parsed = environmentSchema.parse(environment)
  const authUrl = new URL(parsed.BETTER_AUTH_URL)

  return {
    authSecret: parsed.BETTER_AUTH_SECRET,
    authUrl: authUrl.origin,
    databaseUrl: parsed.DATABASE_URL,
    isProduction: parsed.NODE_ENV === 'production',
    trustedOrigins: [authUrl.origin, ...commaSeparatedValues(parsed.TRUSTED_ORIGINS)],
    trustedProxies: commaSeparatedValues(parsed.TRUSTED_PROXY_IPS),
  }
}

export const appEnvironment = readAppEnvironment({
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    (process.env.NODE_ENV === 'test'
      ? 'postgresql://redline_test@127.0.0.1/redline_test'
      : undefined),
})
