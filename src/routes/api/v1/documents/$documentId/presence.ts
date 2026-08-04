import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import {
  listActiveDocumentPresence,
  recordDocumentPresence,
} from '#/server/presence/document-presence'
import { presenceHeartbeatSchema } from '#/server/presence/presence-schema'
import { reviewErrorResponse } from '#/server/reviews/review-error-response'

export const Route = createFileRoute('/api/v1/documents/$documentId/presence')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const { workspace } = await requireWorkspaceContext(request)
          const participants = await listActiveDocumentPresence({
            organizationId: workspace.organization.id,
            documentId,
          })
          return Response.json({ data: participants })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
      POST: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const heartbeat = presenceHeartbeatSchema.parse(await request.json())
          const { session, workspace } = await requireWorkspaceContext(request)
          const presence = await recordDocumentPresence({
            organizationId: workspace.organization.id,
            documentId,
            documentVersionId: heartbeat.documentVersionId,
            userId: session.user.id,
            clientId: heartbeat.clientId,
            selectedBlockStableKey: heartbeat.selectedBlockStableKey,
          })
          return Response.json({ data: presence })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
    },
  },
})
