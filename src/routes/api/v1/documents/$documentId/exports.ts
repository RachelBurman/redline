import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PermissionDeniedError } from '#/server/auth/permissions'
import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { DocumentNotFoundError } from '#/server/documents/get-document'
import { exportResolvedDocument } from '#/server/exports/export-resolved-document'

export const Route = createFileRoute('/api/v1/documents/$documentId/exports')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const { session, workspace } = await requireWorkspaceContext(request)
          const exported = await exportResolvedDocument({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
          })

          return new Response(new Uint8Array(exported.bytes), {
            status: 201,
            headers: {
              'Content-Type':
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'Content-Disposition': `attachment; filename="${exported.filename}"`,
              'Content-Length': String(exported.bytes.byteLength),
              'X-Redline-Document-Version': exported.documentVersionId,
              'X-Redline-Export-Id': exported.exportId,
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (error) {
          if (error instanceof Error && error.name === 'AuthenticationRequiredError') {
            return Response.json(
              { error: { code: 'UNAUTHENTICATED', message: error.message } },
              { status: 401 },
            )
          }
          if (error instanceof PermissionDeniedError) {
            return Response.json(
              { error: { code: 'FORBIDDEN', message: error.message } },
              { status: 403 },
            )
          }
          if (error instanceof DocumentNotFoundError || error instanceof z.ZodError) {
            return Response.json(
              { error: { code: 'DOCUMENT_NOT_FOUND', message: 'The document was not found.' } },
              { status: 404 },
            )
          }

          console.error('Document export failed', error)
          return Response.json(
            {
              error: {
                code: 'EXPORT_FAILED',
                message: 'The resolved document could not be exported.',
              },
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
