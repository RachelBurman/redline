import { describe, expect, it } from 'vitest'

import { isBroadcastAuditEvent } from './live-events'

describe('isBroadcastAuditEvent', () => {
  it('broadcasts collaboration changes with a document scope', () => {
    expect(
      isBroadcastAuditEvent({
        documentId: 'document-id',
        eventType: 'review_comment.created',
      }),
    ).toBe(true)
  })

  it('does not broadcast sensitive evidence reads or unscoped activity', () => {
    expect(
      isBroadcastAuditEvent({
        documentId: 'document-id',
        eventType: 'document.version_exported',
      }),
    ).toBe(false)
    expect(isBroadcastAuditEvent({ eventType: 'review_item.created' })).toBe(false)
  })
})
