import type { LiveEvent } from '#/types/live-events'

export function liveReconnectDelay(attempt: number, random = Math.random()) {
  const baseDelay = Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt))
  return Math.min(30_000, Math.round(baseDelay * (0.8 + random * 0.4)))
}

export function liveInitialSyncQueryKeys(documentId: string) {
  return [
    ['document', documentId],
    ['document-versions', documentId],
    ['review-items', documentId],
    ['review-comments', documentId],
    ['review-round-assignments', documentId],
    ['signature-requests', documentId],
    ['document-presence', documentId],
  ]
}

export function liveEventQueryKeys(event: LiveEvent) {
  const keys: string[][] = []
  const documentKey = [event.documentId]

  if (event.type.startsWith('review_item.') || event.type === 'media_asset.proposal_created') {
    keys.push(['review-items', ...documentKey])
  }
  if (event.type === 'review_comment.created') {
    keys.push(['review-items', ...documentKey])
    if (event.reviewItemId) {
      keys.push(['review-comments', event.documentId, event.reviewItemId])
    }
  }
  if (event.type.startsWith('review_assignment.')) {
    keys.push(['review-round-assignments', ...documentKey])
  }
  if (event.type.startsWith('document.version_')) {
    keys.push(
      ['document', ...documentKey],
      ['document-versions', ...documentKey],
      ['review-items', ...documentKey],
      ['signature-requests', ...documentKey],
      ['document-presence', ...documentKey],
      ['documents'],
    )
  }
  if (event.type.startsWith('signature')) {
    keys.push(['signature-requests', ...documentKey])
  }
  if (event.type.startsWith('presence.')) {
    keys.push(['document-presence', ...documentKey])
  }

  return keys
}

export function liveEventAnnouncement(event: LiveEvent) {
  if (event.type.startsWith('review_item.')) return 'Review proposals updated.'
  if (event.type === 'review_comment.created') return 'Review discussion updated.'
  if (event.type.startsWith('review_assignment.')) return 'Review assignments updated.'
  if (event.type.startsWith('document.version_')) return 'The current document version changed.'
  if (event.type.startsWith('signature')) return 'Signature status updated.'
  return null
}
