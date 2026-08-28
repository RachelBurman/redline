import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { createDocumentVersion } from '#/server/documents/create-document-version'
import { documentVersionErrorResponse } from '#/server/documents/document-version-error-response'
import { listDocumentVersions } from '#/server/documents/list-document-versions'
import { createDocumentVersionSchema } from '#/server/documents/version-schemas'

export const Route = createFileRoute('/api/v1/documents/$documentId/versions')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const { workspace } = await requireWorkspaceContext(request)
          const versions = await listDocumentVersions({
            documentId,
            organizationId: workspace.organization.id,
          })
          return Response.json({ data: versions })
        } catch (error) {
          return documentVersionErrorResponse(error)
        }
      },
      POST: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const version = createDocumentVersionSchema.parse(await request.json())
          const { session, workspace } = await requireWorkspaceContext(request)
          const created = await createDocumentVersion({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            expectedCurrentVersionId: version.expectedCurrentVersionId,
            note: version.note,
          })
          return Response.json({ data: created }, { status: 201 })
        } catch (error) {
          return documentVersionErrorResponse(error)
        }
      },
    },
  },
})
