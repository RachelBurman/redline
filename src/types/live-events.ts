export interface LiveEvent {
  id: string
  cursor: number
  organizationId: string
  documentId: string
  documentVersionId: string | null
  reviewRoundId: string | null
  reviewItemId: string | null
  actorId: string
  type: string
  occurredAt: string
}

export type LiveStreamMessage =
  | LiveEvent
  | { type: 'system.ready' | 'system.rotate'; cursor: number }
  | { type: 'system.access-revoked' }
