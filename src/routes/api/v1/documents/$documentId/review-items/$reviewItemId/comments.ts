import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { createReviewComment } from '#/server/reviews/create-review-comment'
import { listReviewComments } from '#/server/reviews/list-review-comments'
import { reviewErrorResponse } from '#/server/reviews/review-error-response'
import { createReviewCommentSchema } from '#/server/reviews/schemas'

export const Route = createFileRoute(
  '/api/v1/documents/$documentId/review-items/$reviewItemId/comments',
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const reviewItemId = z.uuid().parse(params.reviewItemId)
          const { workspace } = await requireWorkspaceContext(request)
          const comments = await listReviewComments({
            documentId,
            reviewItemId,
            organizationId: workspace.organization.id,
          })
          return Response.json({ data: comments })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
      POST: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const reviewItemId = z.uuid().parse(params.reviewItemId)
          const comment = createReviewCommentSchema.parse(await request.json())
          const { session, workspace } = await requireWorkspaceContext(request)
          const created = await createReviewComment({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
              userName: session.user.name,
            },
            documentId,
            reviewItemId,
            comment,
          })
          return Response.json({ data: created }, { status: 201 })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
    },
  },
})
