import { z } from 'zod'

import { PermissionDeniedError } from '#/server/auth/permissions'
import { DocumentNotFoundError } from '#/server/documents/get-document'

import { ReviewConflictError, ReviewItemNotFoundError, ReviewTargetError } from './review-errors'

export function reviewErrorResponse(error: unknown) {
  if (error instanceof Error && error.name === 'AuthenticationRequiredError') {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: error.message } },
      { status: 401 },
    )
  }
  if (error instanceof PermissionDeniedError) {
    return Response.json({ error: { code: 'FORBIDDEN', message: error.message } }, { status: 403 })
  }
  if (error instanceof DocumentNotFoundError) {
    return Response.json(
      { error: { code: 'DOCUMENT_NOT_FOUND', message: error.message } },
      { status: 404 },
    )
  }
  if (error instanceof ReviewItemNotFoundError) {
    return Response.json(
      { error: { code: 'REVIEW_ITEM_NOT_FOUND', message: error.message } },
      { status: 404 },
    )
  }
  if (error instanceof ReviewConflictError || error instanceof ReviewTargetError) {
    return Response.json(
      { error: { code: 'REVIEW_CONFLICT', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: {
          code: 'INVALID_REVIEW_ITEM',
          message: error.issues[0]?.message ?? 'The review item is invalid.',
        },
      },
      { status: 400 },
    )
  }

  console.error('Review request failed', error)
  return Response.json(
    { error: { code: 'REVIEW_REQUEST_FAILED', message: 'The review request failed.' } },
    { status: 500 },
  )
}
