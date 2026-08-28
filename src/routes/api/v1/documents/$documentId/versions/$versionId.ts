import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { documentVersionErrorResponse } from '#/server/documents/document-version-error-response'
import { getDocumentVersion } from '#/server/documents/get-document-version'

export const Route = createFileRoute('/api/v1/documents/$documentId/versions/$versionId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const documentVersionId = z.uuid().parse(params.versionId)
          const { workspace } = await requireWorkspaceContext(request)
          const version = await getDocumentVersion({
            documentId,
            documentVersionId,
            organizationId: workspace.organization.id,
          })
          return Response.json({ data: version })
        } catch (error) {
          return documentVersionErrorResponse(error)
        }
      },
    },
  },
})
