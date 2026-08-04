import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { resolveReviewItem } from '#/server/reviews/resolve-review-item'
import { reviewErrorResponse } from '#/server/reviews/review-error-response'
import { resolveReviewItemSchema } from '#/server/reviews/schemas'

export const Route = createFileRoute(
  '/api/v1/documents/$documentId/review-items/$reviewItemId/resolve',
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const reviewItemId = z.uuid().parse(params.reviewItemId)
          const resolution = resolveReviewItemSchema.parse(await request.json())
          const { session, workspace } = await requireWorkspaceContext(request)
          const result = await resolveReviewItem({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            reviewItemId,
            decision: resolution.decision,
            expectedRevision: resolution.expectedRevision,
          })
          return Response.json({ data: result })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
    },
  },
})
