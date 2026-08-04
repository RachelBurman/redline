import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v1/health')({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          service: 'redline',
          status: 'ok',
          version: 'v1',
        }),
    },
  },
})
