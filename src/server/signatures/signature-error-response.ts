import { z } from 'zod'

import { DocumentAccessDeniedError } from '#/server/auth/document-access'
import { PermissionDeniedError } from '#/server/auth/permissions'
import { CrossSiteRequestError } from '#/server/http/assert-same-origin'
import { RequestBodyError, requestBodyErrorResponse } from '#/server/http/read-json-body'

import {
  SignatureEmailNotVerifiedError,
  SignatureRequestConflictError,
  SignatureRequestNotFoundError,
  SignatureSignerNotFoundError,
  SignatureSlotNotFoundError,
} from './signature-errors'

export function signatureErrorResponse(error: unknown) {
  if (error instanceof RequestBodyError) return requestBodyErrorResponse(error)
  if (error instanceof Error && error.name === 'AuthenticationRequiredError') {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: error.message } },
      { status: 401 },
    )
  }
  if (
    error instanceof PermissionDeniedError ||
    error instanceof SignatureSlotNotFoundError ||
    error instanceof CrossSiteRequestError
  ) {
    return Response.json({ error: { code: 'FORBIDDEN', message: error.message } }, { status: 403 })
  }
  if (
    error instanceof DocumentAccessDeniedError ||
    error instanceof SignatureRequestNotFoundError
  ) {
    return Response.json(
      { error: { code: 'SIGNATURE_REQUEST_NOT_FOUND', message: error.message } },
      { status: 404 },
    )
  }
  if (error instanceof SignatureEmailNotVerifiedError) {
    return Response.json(
      { error: { code: 'EMAIL_NOT_VERIFIED', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof SignatureRequestConflictError) {
    return Response.json(
      { error: { code: 'SIGNATURE_REQUEST_CONFLICT', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof SignatureSignerNotFoundError) {
    return Response.json(
      { error: { code: 'SIGNATURE_SIGNERS_REQUIRED', message: error.message } },
      { status: 400 },
    )
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: {
          code: 'INVALID_SIGNATURE_REQUEST',
          message: error.issues[0]?.message ?? 'The signature request is invalid.',
        },
      },
      { status: 400 },
    )
  }

  console.error('Signature request failed', error)
  return Response.json(
    { error: { code: 'SIGNATURE_REQUEST_FAILED', message: 'The request could not be completed.' } },
    { status: 500 },
  )
}
