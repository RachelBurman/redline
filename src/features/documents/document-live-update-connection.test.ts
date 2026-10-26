import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DocumentLiveUpdateConnection } from './document-live-update-connection'

import type { LiveEvent, LiveStreamMessage } from '#/types/live-events'

class FakeEventSource extends EventTarget {
  static instances: FakeEventSource[] = []
  readonly url: string
  closed = false

  constructor(url: string) {
    super()
    this.url = url
    FakeEventSource.instances.push(this)
  }

  close() {
    this.closed = true
  }

  send(message: LiveStreamMessage) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }))
  }
}

function liveEvent(cursor: number): LiveEvent {
  return {
    id: `event-${cursor}`,
    cursor,
    organizationId: 'organization-id',
    documentId: 'document-id',
    documentVersionId: 'version-id',
    reviewRoundId: 'round-id',
    reviewItemId: 'item-id',
    actorId: 'actor-id',
    type: 'review_comment.created',
    occurredAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('DocumentLiveUpdateConnection', () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    vi.stubGlobal('EventSource', FakeEventSource)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('deduplicates cursors, resumes with backoff, and releases the connection', () => {
    const onAnnouncement = vi.fn<(announcement: string | null) => void>()
    const onConnectionChange = vi.fn<(connected: boolean) => void>()
    const onEvent = vi.fn<(event: LiveEvent) => void>()
    const onInitialSync = vi.fn<() => void>()
    const connection = new DocumentLiveUpdateConnection({
      documentId: 'document-id',
      onAccessRevoked: vi.fn<() => void>(),
      onAnnouncement,
      onConnectionChange,
      onEvent,
      onInitialSync,
    })

    connection.start()
    const first = FakeEventSource.instances[0]!
    first.dispatchEvent(new Event('open'))
    first.send({ type: 'system.ready', cursor: 5 })
    first.send(liveEvent(6))
    first.send(liveEvent(6))

    expect(onConnectionChange).toHaveBeenCalledWith(true)
    expect(onInitialSync).toHaveBeenCalledOnce()
    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(onAnnouncement).toHaveBeenCalledWith(null)
    vi.advanceTimersByTime(400)
    expect(onAnnouncement).toHaveBeenLastCalledWith('Review discussion updated.')

    first.dispatchEvent(new Event('error'))
    expect(first.closed).toBe(true)
    expect(onConnectionChange).toHaveBeenLastCalledWith(false)
    vi.advanceTimersByTime(1_000)

    expect(FakeEventSource.instances).toHaveLength(2)
    expect(FakeEventSource.instances[1]!.url).toContain('cursor=6')
    connection.stop()
    expect(FakeEventSource.instances[1]!.closed).toBe(true)
    window.dispatchEvent(new Event('online'))
    expect(FakeEventSource.instances).toHaveLength(2)
  })

  it('stops permanently and notifies the page when access is revoked', () => {
    const onAccessRevoked = vi.fn<() => void>()
    const onAnnouncement = vi.fn<(announcement: string | null) => void>()
    const onConnectionChange = vi.fn<(connected: boolean) => void>()
    const connection = new DocumentLiveUpdateConnection({
      documentId: 'document-id',
      onAccessRevoked,
      onAnnouncement,
      onConnectionChange,
      onEvent: vi.fn<(event: LiveEvent) => void>(),
      onInitialSync: vi.fn<() => void>(),
    })

    connection.start()
    FakeEventSource.instances[0]!.send({ type: 'system.access-revoked' })

    expect(onAccessRevoked).toHaveBeenCalledOnce()
    expect(onConnectionChange).toHaveBeenLastCalledWith(false)
    expect(onAnnouncement).toHaveBeenLastCalledWith('Live document access ended.')
    window.dispatchEvent(new Event('online'))
    vi.runAllTimers()
    expect(FakeEventSource.instances).toHaveLength(1)
    connection.stop()
  })
})
