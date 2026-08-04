import { createFileRoute } from '@tanstack/react-router'

import { auth } from '#/lib/auth'

export const Route = createFileRoute('/api/v1/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})
