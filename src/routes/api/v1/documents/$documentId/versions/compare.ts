import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { compareDocumentVersions } from '#/server/documents/compare-document-versions'
import { documentVersionErrorResponse } from '#/server/documents/document-version-error-response'
import { compareDocumentVersionsSchema } from '#/server/documents/version-schemas'

export const Route = createFileRoute('/api/v1/documents/$documentId/versions/compare')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const url = new URL(request.url)
          const versions = compareDocumentVersionsSchema.parse({
            baseVersionId: url.searchParams.get('baseVersionId'),
            targetVersionId: url.searchParams.get('targetVersionId'),
          })
          const { workspace } = await requireWorkspaceContext(request)
          const comparison = await compareDocumentVersions({
            documentId,
            organizationId: workspace.organization.id,
            ...versions,
          })
          return Response.json({ data: comparison })
        } catch (error) {
          return documentVersionErrorResponse(error)
        }
      },
    },
  },
})
