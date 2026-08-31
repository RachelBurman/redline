import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { assertCanAssignReviewers } from '#/server/auth/permissions'
import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { createReviewAssignment } from '#/server/reviewers/create-review-assignment'
import { listReviewRoundAssignments } from '#/server/reviewers/list-review-round-assignments'
import { reviewErrorResponse } from '#/server/reviews/review-error-response'

const createAssignmentSchema = z.object({ reviewerId: z.string().trim().min(1).max(200) })

export const Route = createFileRoute(
  '/api/v1/documents/$documentId/review-rounds/$reviewRoundId/assignments',
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const reviewRoundId = z.uuid().parse(params.reviewRoundId)
          const { workspace } = await requireWorkspaceContext(request)
          assertCanAssignReviewers(workspace.organization.role)
          const assignments = await listReviewRoundAssignments({
            organizationId: workspace.organization.id,
            documentId,
            reviewRoundId,
          })
          return Response.json({ data: assignments })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
      POST: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const reviewRoundId = z.uuid().parse(params.reviewRoundId)
          const assignment = createAssignmentSchema.parse(await request.json())
          const { session, workspace } = await requireWorkspaceContext(request)
          const createdAssignment = await createReviewAssignment({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            reviewRoundId,
            reviewerId: assignment.reviewerId,
          })
          return Response.json({ data: createdAssignment }, { status: 201 })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
    },
  },
})
