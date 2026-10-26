import { describe, expect, it } from 'vitest'

import {
  liveEventAnnouncement,
  liveEventQueryKeys,
  liveInitialSyncQueryKeys,
  liveReconnectDelay,
} from './document-live-update-model'

import type { LiveEvent } from '#/types/live-events'

function event(overrides: Partial<LiveEvent>): LiveEvent {
  return {
    id: 'event-id',
    cursor: 4,
    organizationId: 'organization-id',
    documentId: 'document-id',
    documentVersionId: 'version-id',
    reviewRoundId: 'round-id',
    reviewItemId: 'item-id',
    actorId: 'actor-id',
    type: 'review_item.created',
    occurredAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('liveEventQueryKeys', () => {
  it('targets proposal and discussion queries without applying a mutation twice', () => {
    expect(liveEventQueryKeys(event({ type: 'review_comment.created' }))).toEqual([
      ['review-items', 'document-id'],
      ['review-comments', 'document-id', 'item-id'],
    ])
  })

  it('refreshes every version-bound view after the immutable version changes', () => {
    expect(liveEventQueryKeys(event({ type: 'document.version_restored' }))).toContainEqual([
      'document-versions',
      'document-id',
    ])
    expect(liveEventQueryKeys(event({ type: 'document.version_restored' }))).toContainEqual([
      'signature-requests',
      'document-id',
    ])
  })
})

describe('liveInitialSyncQueryKeys', () => {
  it('closes the query-to-subscription race with an authoritative refetch', () => {
    expect(liveInitialSyncQueryKeys('document-id')).toContainEqual([
      'review-comments',
      'document-id',
    ])
    expect(liveInitialSyncQueryKeys('document-id')).toContainEqual([
      'document-presence',
      'document-id',
    ])
  })
})

describe('liveEventAnnouncement', () => {
  it('announces meaningful changes but keeps presence heartbeats quiet', () => {
    expect(liveEventAnnouncement(event({ type: 'review_assignment.revoked' }))).toBe(
      'Review assignments updated.',
    )
    expect(liveEventAnnouncement(event({ type: 'presence.joined' }))).toBeNull()
  })
})

describe('liveReconnectDelay', () => {
  it('uses bounded exponential backoff with jitter', () => {
    expect(liveReconnectDelay(0, 0.5)).toBe(1_000)
    expect(liveReconnectDelay(4, 0.5)).toBe(16_000)
    expect(liveReconnectDelay(20, 0.5)).toBe(30_000)
    expect(liveReconnectDelay(20, 0)).toBe(24_000)
    expect(liveReconnectDelay(20, 1)).toBe(30_000)
  })
})
