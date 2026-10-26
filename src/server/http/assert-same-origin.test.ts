import { describe, expect, it } from 'vitest'

import { CrossSiteRequestError, assertSameOrigin } from './assert-same-origin'

describe('same-origin mutation protection', () => {
  it('allows same-origin browser requests and clients without an origin header', () => {
    expect(() =>
      assertSameOrigin(
        new Request('https://redline.test/api/v1/example', {
          headers: { origin: 'https://redline.test', 'sec-fetch-site': 'same-origin' },
        }),
      ),
    ).not.toThrow()
    expect(() => assertSameOrigin(new Request('https://redline.test/api/v1/example'))).not.toThrow()
  })

  it('rejects cross-site fetch metadata or a foreign origin', () => {
    expect(() =>
      assertSameOrigin(
        new Request('https://redline.test/api/v1/example', {
          headers: { 'sec-fetch-site': 'cross-site' },
        }),
      ),
    ).toThrow(CrossSiteRequestError)
    expect(() =>
      assertSameOrigin(
        new Request('https://redline.test/api/v1/example', {
          headers: { origin: 'https://attacker.test' },
        }),
      ),
    ).toThrow(CrossSiteRequestError)
  })
})
