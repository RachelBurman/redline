import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { assertSameOrigin } from '#/server/http/assert-same-origin'
import { cancelSignatureRequest } from '#/server/signatures/cancel-signature-request'
import { signatureErrorResponse } from '#/server/signatures/signature-error-response'

export const Route = createFileRoute(
  '/api/v1/documents/$documentId/signature-requests/$signatureRequestId/cancel',
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          assertSameOrigin(request)
          const documentId = z.uuid().parse(params.documentId)
          const signatureRequestId = z.uuid().parse(params.signatureRequestId)
          const { session, workspace } = await requireWorkspaceContext(request)
          const result = await cancelSignatureRequest({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            signatureRequestId,
          })
          return Response.json({ data: result })
        } catch (error) {
          return signatureErrorResponse(error)
        }
      },
    },
  },
})
