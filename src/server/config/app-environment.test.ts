import { describe, expect, it } from 'vitest'

import { readAppEnvironment } from './app-environment'

describe('readAppEnvironment', () => {
  it('normalizes trusted origins and proxies', () => {
    const environment = readAppEnvironment({
      BETTER_AUTH_URL: 'https://redline.example/path',
      DATABASE_URL: 'postgresql://redline@example.test/redline',
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      TRUSTED_ORIGINS: 'https://admin.example, https://preview.example',
      TRUSTED_PROXY_IPS: '192.0.2.10, 10.0.0.0/24',
    })

    expect(environment.authUrl).toBe('https://redline.example')
    expect(environment.trustedOrigins).toEqual([
      'https://redline.example',
      'https://admin.example',
      'https://preview.example',
    ])
    expect(environment.trustedProxies).toEqual(['192.0.2.10', '10.0.0.0/24'])
  })

  it('rejects insecure production authentication configuration', () => {
    expect(() =>
      readAppEnvironment({
        BETTER_AUTH_URL: 'http://redline.example',
        DATABASE_URL: 'postgresql://redline@example.test/redline',
        NODE_ENV: 'production',
      }),
    ).toThrow(/BETTER_AUTH_SECRET/)
  })
})
