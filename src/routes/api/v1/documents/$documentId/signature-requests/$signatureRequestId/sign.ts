import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { assertSameOrigin } from '#/server/http/assert-same-origin'
import { readJsonBody } from '#/server/http/read-json-body'
import { signSignatureRequest } from '#/server/signatures/sign-signature-request'
import { signatureErrorResponse } from '#/server/signatures/signature-error-response'

const signSchema = z.object({ confirmed: z.literal(true), idempotencyKey: z.uuid() })

export const Route = createFileRoute(
  '/api/v1/documents/$documentId/signature-requests/$signatureRequestId/sign',
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          assertSameOrigin(request)
          const documentId = z.uuid().parse(params.documentId)
          const signatureRequestId = z.uuid().parse(params.signatureRequestId)
          const body = await readJsonBody(request, signSchema)
          const { session, workspace } = await requireWorkspaceContext(request)
          const result = await signSignatureRequest({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              userId: session.user.id,
            },
            documentId,
            signatureRequestId,
            ...body,
          })
          return Response.json({ data: result })
        } catch (error) {
          return signatureErrorResponse(error)
        }
      },
    },
  },
})
