export interface DocumentAuditEvent {
  id: string
  sequence: number
  eventType: string
  payload: Record<string, unknown>
  actor: { id: string; name: string }
  documentVersionId: string | null
  reviewItemId: string | null
  previousHash: string | null
  eventHash: string
  occurredAt: string
}
