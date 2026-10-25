import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { readJsonBody } from './read-json-body'

const schema = z.object({ value: z.string() })

describe('readJsonBody', () => {
  it('parses and validates a bounded JSON body', async () => {
    const request = new Request('https://redline.example/api/v1/example', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'review' }),
    })

    await expect(readJsonBody(request, schema)).resolves.toEqual({ value: 'review' })
  })

  it('rejects oversized bodies even without trusting content length', async () => {
    const request = new Request('https://redline.example/api/v1/example', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(200) }),
    })

    await expect(readJsonBody(request, schema, 32)).rejects.toMatchObject({
      code: 'REQUEST_BODY_TOO_LARGE',
      status: 413,
    })
  })

  it('requires JSON content', async () => {
    const request = new Request('https://redline.example/api/v1/example', {
      method: 'POST',
      body: 'value=review',
    })

    await expect(readJsonBody(request, schema)).rejects.toMatchObject({
      code: 'UNSUPPORTED_CONTENT_TYPE',
      status: 415,
    })
  })
})
