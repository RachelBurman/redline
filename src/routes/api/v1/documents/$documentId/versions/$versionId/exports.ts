import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { documentVersionErrorResponse } from '#/server/documents/document-version-error-response'
import { exportDocumentVersion } from '#/server/exports/export-document-version'

export const Route = createFileRoute('/api/v1/documents/$documentId/versions/$versionId/exports')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const documentVersionId = z.uuid().parse(params.versionId)
          const { session, workspace } = await requireWorkspaceContext(request)
          const exported = await exportDocumentVersion({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            documentVersionId,
          })

          return new Response(new Uint8Array(exported.bytes), {
            status: 201,
            headers: {
              'Content-Type':
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'Content-Disposition': `attachment; filename="${exported.filename}"`,
              'Content-Length': String(exported.bytes.byteLength),
              'Cache-Control': 'private, no-store',
              'X-Redline-Document-Version': exported.documentVersionId,
              'X-Redline-Export-Id': exported.exportId,
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (error) {
          return documentVersionErrorResponse(error)
        }
      },
    },
  },
})
