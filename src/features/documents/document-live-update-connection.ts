import { liveEventAnnouncement, liveReconnectDelay } from './document-live-update-model'

import type { LiveEvent, LiveStreamMessage } from '#/types/live-events'

interface DocumentLiveUpdateConnectionInput {
  documentId: string
  onAccessRevoked: () => void
  onAnnouncement: (announcement: string | null) => void
  onConnectionChange: (connected: boolean) => void
  onEvent: (event: LiveEvent) => void
  onInitialSync: () => void
}

export class DocumentLiveUpdateConnection {
  readonly #input: DocumentLiveUpdateConnectionInput
  #announcementTimer: ReturnType<typeof setTimeout> | null = null
  #latestCursor: number | null = null
  #reconnectAttempt = 0
  #retryTimer: ReturnType<typeof setTimeout> | null = null
  #source: EventSource | null = null
  #stopped = true

  constructor(input: DocumentLiveUpdateConnectionInput) {
    this.#input = input
  }

  start() {
    if (!this.#stopped) return
    this.#stopped = false
    window.addEventListener('online', this.#reconnectNow)
    this.#connect()
  }

  stop() {
    this.#stopped = true
    this.#source?.close()
    this.#source = null
    if (this.#retryTimer) clearTimeout(this.#retryTimer)
    if (this.#announcementTimer) clearTimeout(this.#announcementTimer)
    this.#retryTimer = null
    this.#announcementTimer = null
    window.removeEventListener('online', this.#reconnectNow)
  }

  readonly #connect = () => {
    if (this.#stopped || this.#source) return
    const query =
      this.#latestCursor === null ? '' : `?cursor=${encodeURIComponent(this.#latestCursor)}`
    const source = new EventSource(`/api/v1/documents/${this.#input.documentId}/events${query}`)
    this.#source = source
    source.addEventListener('open', this.#handleOpen)
    source.addEventListener('message', this.#handleMessage)
    source.addEventListener('error', this.#handleError)
  }

  readonly #handleOpen = () => {
    this.#reconnectAttempt = 0
    this.#input.onConnectionChange(true)
  }

  readonly #handleMessage = (message: MessageEvent<string>) => {
    let parsed: LiveStreamMessage
    try {
      parsed = JSON.parse(message.data) as LiveStreamMessage
    } catch {
      return
    }

    if (parsed.type === 'system.access-revoked') {
      this.#source?.close()
      this.#source = null
      this.#stopped = true
      if (this.#retryTimer) clearTimeout(this.#retryTimer)
      if (this.#announcementTimer) clearTimeout(this.#announcementTimer)
      this.#retryTimer = null
      this.#announcementTimer = null
      window.removeEventListener('online', this.#reconnectNow)
      this.#input.onConnectionChange(false)
      this.#input.onAnnouncement('Live document access ended.')
      this.#input.onAccessRevoked()
      return
    }
    if (parsed.type === 'system.ready') {
      const needsInitialSync = this.#latestCursor === null
      this.#latestCursor = Math.max(this.#latestCursor ?? 0, parsed.cursor)
      if (needsInitialSync) this.#input.onInitialSync()
      return
    }
    if (parsed.type === 'system.rotate') {
      this.#latestCursor = Math.max(this.#latestCursor ?? 0, parsed.cursor)
      this.#source?.close()
      this.#source = null
      this.#scheduleReconnect()
      return
    }
    if (!('id' in parsed)) return
    if (this.#latestCursor !== null && parsed.cursor <= this.#latestCursor) return

    this.#latestCursor = parsed.cursor
    this.#input.onEvent(parsed)
    const announcement = liveEventAnnouncement(parsed)
    if (announcement) {
      if (this.#announcementTimer) clearTimeout(this.#announcementTimer)
      this.#input.onAnnouncement(null)
      this.#announcementTimer = setTimeout(() => this.#input.onAnnouncement(announcement), 400)
    }
  }

  readonly #handleError = () => {
    this.#source?.close()
    this.#source = null
    this.#scheduleReconnect()
  }

  readonly #reconnectNow = () => {
    if (this.#stopped) return
    if (this.#retryTimer) clearTimeout(this.#retryTimer)
    this.#retryTimer = null
    this.#source?.close()
    this.#source = null
    this.#connect()
  }

  #scheduleReconnect() {
    if (this.#stopped || this.#retryTimer) return
    this.#input.onConnectionChange(false)
    const delay = liveReconnectDelay(this.#reconnectAttempt)
    this.#reconnectAttempt += 1
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = null
      this.#connect()
    }, delay)
  }
}
