import { describe, expect, it } from 'vitest'

import { buildAuthHref, getSafeAuthRedirect } from './safe-auth-redirect'

describe('getSafeAuthRedirect', () => {
  it('allows an application-relative invitation path', () => {
    expect(getSafeAuthRedirect('/accept-invitation?id=invite-1')).toBe(
      '/accept-invitation?id=invite-1',
    )
  })

  it.each(['https://malicious.example', '//malicious.example', '', null])(
    'rejects unsafe redirect %s',
    (value) => {
      expect(getSafeAuthRedirect(value)).toBe('/app')
    },
  )

  it('encodes the redirect when building an authentication link', () => {
    expect(buildAuthHref('/sign-in', '/accept-invitation?id=invite-1')).toBe(
      '/sign-in?redirect=%2Faccept-invitation%3Fid%3Dinvite-1',
    )
  })
})
