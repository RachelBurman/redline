import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'

import { buildSecurityHeaders } from '#/server/http/security-headers'

const csrfMiddleware = createCsrfMiddleware({
  filter: ({ request }) => !['GET', 'HEAD', 'OPTIONS'].includes(request.method),
  secFetchSite: 'same-origin',
  failureResponse: Response.json(
    {
      error: {
        code: 'UNTRUSTED_REQUEST_ORIGIN',
        message: 'The request origin could not be verified.',
      },
    },
    { status: 403 },
  ),
})

const securityHeadersMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next, request }) => {
    const result = await next()
    const url = new URL(request.url)
    const headers = new Headers(result.response.headers)
    const securityHeaders = buildSecurityHeaders({
      isDevelopment: process.env.NODE_ENV !== 'production',
      isHttps: url.protocol === 'https:',
      pathname: url.pathname,
    })

    securityHeaders.forEach((value, name) => headers.set(name, value))

    return {
      ...result,
      response: new Response(result.response.body, {
        status: result.response.status,
        statusText: result.response.statusText,
        headers,
      }),
    }
  },
)

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, securityHeadersMiddleware],
}))
