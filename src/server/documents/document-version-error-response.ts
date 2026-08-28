import { z } from 'zod'

import { PermissionDeniedError } from '#/server/auth/permissions'

import { DocumentNotFoundError } from './get-document'
import {
  DocumentVersionConflictError,
  DocumentVersionNotFoundError,
  NoAcceptedChangesError,
} from './version-errors'

export function documentVersionErrorResponse(error: unknown) {
  if (error instanceof Error && error.name === 'AuthenticationRequiredError') {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: error.message } },
      { status: 401 },
    )
  }
  if (error instanceof PermissionDeniedError) {
    return Response.json({ error: { code: 'FORBIDDEN', message: error.message } }, { status: 403 })
  }
  if (error instanceof DocumentNotFoundError || error instanceof DocumentVersionNotFoundError) {
    return Response.json(
      { error: { code: 'DOCUMENT_VERSION_NOT_FOUND', message: error.message } },
      { status: 404 },
    )
  }
  if (error instanceof DocumentVersionConflictError || error instanceof NoAcceptedChangesError) {
    return Response.json(
      { error: { code: 'DOCUMENT_VERSION_CONFLICT', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: {
          code: 'INVALID_VERSION_REQUEST',
          message: error.issues[0]?.message ?? 'The version request is invalid.',
        },
      },
      { status: 400 },
    )
  }

  console.error('Document version request failed', error)
  return Response.json(
    { error: { code: 'DOCUMENT_VERSION_REQUEST_FAILED', message: 'The request failed.' } },
    { status: 500 },
  )
}
