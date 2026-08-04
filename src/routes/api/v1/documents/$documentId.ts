import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { DocumentNotFoundError, getDocument } from '#/server/documents/get-document'

export const Route = createFileRoute('/api/v1/documents/$documentId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const { workspace } = await requireWorkspaceContext(request)
          const document = await getDocument({
            documentId,
            organizationId: workspace.organization.id,
          })
          return Response.json({ data: document })
        } catch (error) {
          if (error instanceof Error && error.name === 'AuthenticationRequiredError') {
            return Response.json(
              { error: { code: 'UNAUTHENTICATED', message: error.message } },
              { status: 401 },
            )
          }
          if (error instanceof DocumentNotFoundError || error instanceof z.ZodError) {
            return Response.json(
              { error: { code: 'DOCUMENT_NOT_FOUND', message: 'The document was not found.' } },
              { status: 404 },
            )
          }

          console.error('Document detail request failed', error)
          return Response.json(
            {
              error: {
                code: 'DOCUMENT_REQUEST_FAILED',
                message: 'The document could not be loaded.',
              },
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
