import { describe, expect, it } from 'vitest'

import { encodeServerSentEvent, parseLiveEventCursor } from './live-stream'

describe('parseLiveEventCursor', () => {
  it('prefers a valid URL cursor and accepts Last-Event-ID on native reconnects', () => {
    expect(
      parseLiveEventCursor(
        new Request('https://redline.test/events?cursor=41', {
          headers: { 'Last-Event-ID': '40' },
        }),
      ),
    ).toBe(41)
    expect(
      parseLiveEventCursor(
        new Request('https://redline.test/events', { headers: { 'Last-Event-ID': '42' } }),
      ),
    ).toBe(42)
  })

  it('treats invalid cursors as a fresh subscription', () => {
    expect(parseLiveEventCursor(new Request('https://redline.test/events?cursor=-1'))).toBeNull()
    expect(parseLiveEventCursor(new Request('https://redline.test/events?cursor=text'))).toBeNull()
  })
})

describe('encodeServerSentEvent', () => {
  it('emits resumable metadata-only events', () => {
    const encoded = encodeServerSentEvent({ type: 'system.ready', cursor: 12 })
    expect(encoded).toBe('id: 12\ndata: {"type":"system.ready","cursor":12}\n\n')
  })
})
