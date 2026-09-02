import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { listDocumentAuditEvents } from '#/server/audit/list-document-audit-events'
import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { reviewErrorResponse } from '#/server/reviews/review-error-response'

export const Route = createFileRoute('/api/v1/documents/$documentId/audit-events')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const { session, workspace } = await requireWorkspaceContext(request)
          const events = await listDocumentAuditEvents({
            documentId,
            organizationId: workspace.organization.id,
            role: workspace.organization.role,
            userId: session.user.id,
          })
          return Response.json({ data: events })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
    },
  },
})
