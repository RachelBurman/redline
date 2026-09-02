import type { z } from 'zod'

const DEFAULT_MAX_JSON_BYTES = 128 * 1024

export class RequestBodyError extends Error {
  constructor(
    readonly status: 400 | 413 | 415,
    readonly code: 'INVALID_JSON' | 'REQUEST_BODY_TOO_LARGE' | 'UNSUPPORTED_CONTENT_TYPE',
    message: string,
  ) {
    super(message)
    this.name = 'RequestBodyError'
  }
}

async function readLimitedBody(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestBodyError(
      413,
      'REQUEST_BODY_TOO_LARGE',
      `The request body must be ${maxBytes} bytes or smaller.`,
    )
  }

  if (!request.body) return new Uint8Array()

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  async function readNextChunk(): Promise<void> {
    const { done, value } = await reader.read()
    if (done) return

    totalBytes += value.byteLength
    if (totalBytes > maxBytes) {
      await reader.cancel()
      throw new RequestBodyError(
        413,
        'REQUEST_BODY_TOO_LARGE',
        `The request body must be ${maxBytes} bytes or smaller.`,
      )
    }
    chunks.push(value)
    await readNextChunk()
  }

  try {
    await readNextChunk()
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

export async function readJsonBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<z.output<TSchema>> {
  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') {
    throw new RequestBodyError(
      415,
      'UNSUPPORTED_CONTENT_TYPE',
      'Send this request as application/json.',
    )
  }

  const bytes = await readLimitedBody(request, maxBytes)
  let input: unknown
  try {
    input = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new RequestBodyError(400, 'INVALID_JSON', 'The request body is not valid JSON.')
  }

  return schema.parse(input)
}

export function requestBodyErrorResponse(error: RequestBodyError) {
  return Response.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status },
  )
}
