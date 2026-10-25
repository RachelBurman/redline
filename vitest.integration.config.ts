import { fileURLToPath } from 'node:url'

import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const fileEnvironment = loadEnv(mode, '.', '')
  const databaseUrl = process.env.DATABASE_URL ?? fileEnvironment.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run database integration tests.')
  }

  return {
    resolve: {
      alias: {
        '#': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'node',
      env: { DATABASE_URL: databaseUrl },
      include: ['src/**/*.integration.test.{ts,tsx}'],
      maxWorkers: 1,
    },
  }
})
