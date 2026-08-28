import { describe, expect, it } from 'vitest'

import { readEmailConfig } from './email-config'

describe('readEmailConfig', () => {
  it('uses the loopback Mailpit service outside production', () => {
    expect(readEmailConfig({ NODE_ENV: 'development' })).toEqual({
      host: '127.0.0.1',
      port: 1025,
      secure: false,
      user: undefined,
      password: undefined,
      from: 'Redline <no-reply@redline.local>',
    })
  })

  it('requires explicit production SMTP settings', () => {
    expect(() => readEmailConfig({ NODE_ENV: 'production' })).toThrow('expected string')
  })

  it('does not allow a partial SMTP credential pair', () => {
    expect(() =>
      readEmailConfig({
        NODE_ENV: 'production',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'redline',
        SMTP_FROM: 'Redline <redline@example.com>',
      }),
    ).toThrow('SMTP_USER and SMTP_PASSWORD')
  })
})
