import process from 'node:process'

const baseUrl = requiredEnvironment('LIVE_LOAD_URL').replace(/\/$/, '')
const cookie = requiredEnvironment('LIVE_LOAD_COOKIE')
const documentId = requiredEnvironment('LIVE_LOAD_DOCUMENT_ID')
const documentVersionId = requiredEnvironment('LIVE_LOAD_VERSION_ID')
const connectionCount = Number(process.env.LIVE_LOAD_CONNECTIONS ?? 50)
const deliveryLimitMs = Number(process.env.LIVE_LOAD_DELIVERY_LIMIT_MS ?? 5_000)

if (!Number.isInteger(connectionCount) || connectionCount < 1 || connectionCount > 500) {
  throw new Error('LIVE_LOAD_CONNECTIONS must be an integer between 1 and 500.')
}

interface LoadConnection {
  abort: AbortController
  ready: Promise<void>
  delivered: Promise<number>
}

let triggerStartedAt = 0

function requiredEnvironment(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function openConnection(): LoadConnection {
  const abort = new AbortController()
  let markReady!: () => void
  let markDelivered!: (latency: number) => void
  const ready = new Promise<void>((resolve) => (markReady = resolve))
  const delivered = new Promise<number>((resolve) => (markDelivered = resolve))

  void (async () => {
    const response = await fetch(`${baseUrl}/api/v1/documents/${documentId}/events`, {
      headers: { Cookie: cookie },
      signal: abort.signal,
    })
    if (!response.ok || !response.body) {
      throw new Error(`Live stream returned HTTP ${response.status}.`)
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) throw new Error('Live stream closed before the load event arrived.')
      buffer += chunk.value
      const messages = buffer.split('\n\n')
      buffer = messages.pop() ?? ''
      for (const message of messages) {
        const data = message
          .split('\n')
          .find((line) => line.startsWith('data: '))
          ?.slice(6)
        if (!data) continue
        const event = JSON.parse(data) as { type: string }
        if (event.type === 'system.ready') {
          markReady()
        } else if (event.type.startsWith('presence.') && triggerStartedAt > 0) {
          markDelivered(Date.now() - triggerStartedAt)
          return
        }
      }
    }
  })()

  return { abort, ready, delivered }
}

const connections = Array.from({ length: connectionCount }, openConnection)

try {
  await Promise.all(connections.map((connection) => connection.ready))
  triggerStartedAt = Date.now()
  const trigger = await fetch(`${baseUrl}/api/v1/documents/${documentId}/presence`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentVersionId,
      clientId: `live-load-${crypto.randomUUID()}`,
      selectedBlockStableKey: null,
    }),
  })
  if (!trigger.ok) throw new Error(`Presence trigger returned HTTP ${trigger.status}.`)

  const deliveries = await Promise.race([
    Promise.all(connections.map((connection) => connection.delivered)),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Not every live client received the event in time.')),
        deliveryLimitMs,
      ),
    ),
  ])
  const sorted = deliveries.reduce<number[]>((ordered, latency) => {
    const insertionIndex = ordered.findIndex((existing) => existing > latency)
    if (insertionIndex === -1) return ordered.concat(latency)
    return ordered.slice(0, insertionIndex).concat(latency, ordered.slice(insertionIndex))
  }, [])
  const p95 = sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)]
  console.info(`Delivered to ${sorted.length} clients; p95=${p95}ms; max=${sorted.at(-1)}ms.`)
} finally {
  for (const connection of connections) connection.abort.abort()
}
