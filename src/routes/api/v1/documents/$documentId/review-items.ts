import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { getDocument } from '#/server/documents/get-document'
import { createReviewItem } from '#/server/reviews/create-review-item'
import { listReviewItems } from '#/server/reviews/list-review-items'
import { reviewErrorResponse } from '#/server/reviews/review-error-response'
import { createReviewItemSchema } from '#/server/reviews/schemas'

export const Route = createFileRoute('/api/v1/documents/$documentId/review-items')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const { workspace } = await requireWorkspaceContext(request)
          await getDocument({ documentId, organizationId: workspace.organization.id })
          const reviewItems = await listReviewItems({
            documentId,
            organizationId: workspace.organization.id,
          })
          return Response.json({ data: reviewItems })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
      POST: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const review = createReviewItemSchema.parse(await request.json())
          const { session, workspace } = await requireWorkspaceContext(request)
          const createdReviewItem = await createReviewItem({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            review,
          })
          const reviewItems = await listReviewItems({
            documentId,
            organizationId: workspace.organization.id,
          })
          const reviewItem = reviewItems.find((item) => item.id === createdReviewItem.id)
          if (!reviewItem) throw new Error('The created proposal could not be loaded.')

          return Response.json({ data: reviewItem }, { status: 201 })
        } catch (error) {
          return reviewErrorResponse(error)
        }
      },
    },
  },
})
