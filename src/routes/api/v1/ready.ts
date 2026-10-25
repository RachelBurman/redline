import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'

import { db } from '#/db/index'

export const Route = createFileRoute('/api/v1/ready')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.execute(sql`select 1`)
          return Response.json({ service: 'redline', status: 'ready', database: 'available' })
        } catch (error) {
          console.error('Readiness check failed', error)
          return Response.json(
            { service: 'redline', status: 'not_ready', database: 'unavailable' },
            { status: 503 },
          )
        }
      },
    },
  },
})
