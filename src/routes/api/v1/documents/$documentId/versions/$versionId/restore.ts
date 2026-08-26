import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { documentVersionErrorResponse } from '#/server/documents/document-version-error-response'
import { restoreDocumentVersion } from '#/server/documents/restore-document-version'
import { restoreDocumentVersionSchema } from '#/server/documents/version-schemas'

export const Route = createFileRoute('/api/v1/documents/$documentId/versions/$versionId/restore')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const sourceVersionId = z.uuid().parse(params.versionId)
          const restore = restoreDocumentVersionSchema.parse(await request.json())
          const { session, workspace } = await requireWorkspaceContext(request)
          const restored = await restoreDocumentVersion({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            sourceVersionId,
            expectedCurrentVersionId: restore.expectedCurrentVersionId,
            reason: restore.reason,
          })
          return Response.json({ data: restored }, { status: 201 })
        } catch (error) {
          return documentVersionErrorResponse(error)
        }
      },
    },
  },
})
