import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { revokeReviewAssignment } from '#/server/reviewers/revoke-review-assignment'
import { reviewErrorResponse } from '#/server/reviews/review-error-response'

export const Route = createFileRoute(
  '/api/v1/documents/$documentId/review-rounds/$reviewRoundId/assignments/$assignmentId',
)({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const reviewRoundId = z.uuid().parse(params.reviewRoundId)
          const assignmentId = z.uuid().parse(params.assignmentId)
          const { session, workspace } = await requireWorkspaceContext(request)
          const revokedAssignment = await revokeReviewAssignment({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            reviewRoundId,
            assignmentId,
          })
          return Response.json({ data: revokedAssignment })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
    },
  },
})
