import { createFileRoute } from '@tanstack/react-router'

import { assertCanInviteReviewers } from '#/server/auth/permissions'
import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { listReviewerManagement } from '#/server/reviewers/list-reviewer-management'
import { reviewErrorResponse } from '#/server/reviews/review-error-response'

export const Route = createFileRoute('/api/v1/reviewers')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { workspace } = await requireWorkspaceContext(request)
          assertCanInviteReviewers(workspace.organization.role)
          const reviewers = await listReviewerManagement(workspace.organization.id)
          return Response.json({ data: reviewers })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
    },
  },
})
