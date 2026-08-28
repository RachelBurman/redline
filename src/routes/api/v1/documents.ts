import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PermissionDeniedError } from '#/server/auth/permissions'
import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { createDocumentFromUpload } from '#/server/documents/create-document-from-upload'
import { InvalidDocxError, MAX_DOCX_BYTES } from '#/server/documents/docx-validation'
import { listDocuments } from '#/server/documents/list-documents'
import { DocxParseError } from '#/server/documents/parse-docx'

function errorResponse(error: unknown) {
  if (error instanceof Error && error.name === 'AuthenticationRequiredError') {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: error.message } },
      { status: 401 },
    )
  }
  if (error instanceof PermissionDeniedError) {
    return Response.json({ error: { code: 'FORBIDDEN', message: error.message } }, { status: 403 })
  }
  if (error instanceof InvalidDocxError || error instanceof z.ZodError) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? 'The document details are invalid.')
        : error.message
    return Response.json({ error: { code: 'INVALID_DOCUMENT', message } }, { status: 400 })
  }
  if (error instanceof DocxParseError) {
    return Response.json(
      {
        error: {
          code: 'DOCUMENT_PARSE_FAILED',
          message: error.message,
          documentId: 'documentId' in error ? error.documentId : undefined,
        },
      },
      { status: 422 },
    )
  }

  console.error('Document request failed', error)
  return Response.json(
    { error: { code: 'DOCUMENT_REQUEST_FAILED', message: 'The document request failed.' } },
    { status: 500 },
  )
}

export const Route = createFileRoute('/api/v1/documents')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { workspace } = await requireWorkspaceContext(request)
          const documents = await listDocuments({
            organizationId: workspace.organization.id,
            projectId: workspace.project.id,
          })
          return Response.json({ data: documents })
        } catch (error) {
          return errorResponse(error)
        }
      },
      POST: async ({ request }) => {
        try {
          const contentLength = Number(request.headers.get('content-length') ?? 0)
          if (contentLength > MAX_DOCX_BYTES + 1024 * 1024) {
            return Response.json(
              {
                error: {
                  code: 'DOCUMENT_TOO_LARGE',
                  message: 'The document must be 15 MB or smaller.',
                },
              },
              { status: 413 },
            )
          }

          const { session, workspace } = await requireWorkspaceContext(request)
          const formData = await request.formData()
          const file = formData.get('file')
          if (!(file instanceof File)) {
            throw new InvalidDocxError('Choose a Microsoft Word .docx file.')
          }

          const uploaded = await createDocumentFromUpload({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            file,
            title:
              typeof formData.get('title') === 'string' ? String(formData.get('title')) : undefined,
          })
          return Response.json({ data: uploaded }, { status: 201 })
        } catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})
