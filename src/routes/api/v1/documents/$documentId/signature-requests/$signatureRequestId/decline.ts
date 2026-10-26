import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { assertSameOrigin } from '#/server/http/assert-same-origin'
import { readJsonBody } from '#/server/http/read-json-body'
import { declineSignatureRequest } from '#/server/signatures/decline-signature-request'
import { signatureErrorResponse } from '#/server/signatures/signature-error-response'

const declineSchema = z.object({ reason: z.string().trim().min(3).max(500) })

export const Route = createFileRoute(
  '/api/v1/documents/$documentId/signature-requests/$signatureRequestId/decline',
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          assertSameOrigin(request)
          const documentId = z.uuid().parse(params.documentId)
          const signatureRequestId = z.uuid().parse(params.signatureRequestId)
          const body = await readJsonBody(request, declineSchema)
          const { session, workspace } = await requireWorkspaceContext(request)
          const result = await declineSignatureRequest({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              userId: session.user.id,
            },
            documentId,
            signatureRequestId,
            reason: body.reason,
          })
          return Response.json({ data: result })
        } catch (error) {
          return signatureErrorResponse(error)
        }
      },
    },
  },
})
