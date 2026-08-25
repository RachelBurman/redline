import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PermissionDeniedError } from '#/server/auth/permissions'
import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { DocumentNotFoundError } from '#/server/documents/get-document'
import { exportReviewQueue } from '#/server/exports/export-review-queue'

export const Route = createFileRoute('/api/v1/documents/$documentId/review-items/export')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const { session, workspace } = await requireWorkspaceContext(request)
          const exported = await exportReviewQueue({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
          })

          return new Response(exported.bytes, {
            status: 201,
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="${exported.filename}"`,
              'Content-Length': String(exported.bytes.byteLength),
              'Cache-Control': 'private, no-store',
              'X-Redline-Document-Version': exported.documentVersionId,
              'X-Redline-Export-Id': exported.exportId,
              'X-Redline-Review-Item-Count': String(exported.reviewItemCount),
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

          console.error('Review queue export failed', error)
          return Response.json(
            {
              error: {
                code: 'REVIEW_QUEUE_EXPORT_FAILED',
                message: 'The review queue could not be exported.',
              },
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
