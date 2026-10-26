import { z } from 'zod'

import { DocumentAccessDeniedError } from '#/server/auth/document-access'
import { PermissionDeniedError } from '#/server/auth/permissions'
import { CrossSiteRequestError } from '#/server/http/assert-same-origin'
import { RequestBodyError, requestBodyErrorResponse } from '#/server/http/read-json-body'
import { ReviewTargetError } from '#/server/reviews/review-errors'

import { UnsafeMediaError } from './image-processing'
import { MediaAssetNotFoundError, MediaAssetStateError } from './media-errors'

export function mediaErrorResponse(error: unknown) {
  if (error instanceof RequestBodyError) return requestBodyErrorResponse(error)
  if (error instanceof Error && error.name === 'AuthenticationRequiredError') {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: error.message } },
      { status: 401 },
    )
  }
  if (error instanceof PermissionDeniedError || error instanceof CrossSiteRequestError) {
    return Response.json({ error: { code: 'FORBIDDEN', message: error.message } }, { status: 403 })
  }
  if (error instanceof DocumentAccessDeniedError || error instanceof MediaAssetNotFoundError) {
    return Response.json(
      { error: { code: 'MEDIA_NOT_FOUND', message: 'The media asset was not found.' } },
      { status: 404 },
    )
  }
  if (error instanceof UnsafeMediaError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.code === 'FILE_TOO_LARGE' ? 413 : 422 },
    )
  }
  if (error instanceof MediaAssetStateError) {
    return Response.json(
      { error: { code: 'MEDIA_NOT_READY', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof ReviewTargetError) {
    return Response.json(
      { error: { code: 'MEDIA_PROPOSAL_CONFLICT', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: {
          code: 'INVALID_MEDIA_PROPOSAL',
          message: error.issues[0]?.message ?? 'The media proposal is invalid.',
        },
      },
      { status: 400 },
    )
  }

  console.error('Media request failed', error)
  return Response.json(
    {
      error: { code: 'MEDIA_REQUEST_FAILED', message: 'The media request could not be completed.' },
    },
    { status: 500 },
  )
}
