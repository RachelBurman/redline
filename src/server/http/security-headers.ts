const authenticatedPagePrefixes = [
  '/accept-invitation',
  '/app',
  '/forgot-password',
  '/reset-password',
  '/sign-in',
  '/sign-up',
]

function contentSecurityPolicy(isDevelopment: boolean) {
  const scripts = isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'"
  const connections = isDevelopment ? "connect-src 'self' ws: wss:" : "connect-src 'self'"

  return [
    "default-src 'self'",
    "base-uri 'self'",
    connections,
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    scripts,
    "style-src 'self' 'unsafe-inline'",
    'upgrade-insecure-requests',
  ].join('; ')
}

export function buildSecurityHeaders(input: {
  isDevelopment: boolean
  isHttps: boolean
  pathname: string
}) {
  const headers = new Headers({
    'Content-Security-Policy': contentSecurityPolicy(input.isDevelopment),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  })

  if (input.isHttps && !input.isDevelopment) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  if (
    input.pathname.startsWith('/api/') ||
    authenticatedPagePrefixes.some(
      (prefix) => input.pathname === prefix || input.pathname.startsWith(`${prefix}/`),
    )
  ) {
    headers.set('Cache-Control', 'private, no-store')
    headers.set('Pragma', 'no-cache')
  }

  return headers
}
