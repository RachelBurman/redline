import { describe, expect, it } from 'vitest'

import { buildSecurityHeaders } from './security-headers'

describe('buildSecurityHeaders', () => {
  it('protects authenticated API responses from storage and framing', () => {
    const headers = buildSecurityHeaders({
      isDevelopment: false,
      isHttps: true,
      pathname: '/api/v1/documents',
    })

    expect(headers.get('cache-control')).toBe('private, no-store')
    expect(headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(headers.get('strict-transport-security')).toContain('max-age=31536000')
    expect(headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('does not send HSTS over local development HTTP', () => {
    const headers = buildSecurityHeaders({
      isDevelopment: true,
      isHttps: false,
      pathname: '/',
    })

    expect(headers.has('strict-transport-security')).toBe(false)
    expect(headers.has('cache-control')).toBe(false)
  })
})
