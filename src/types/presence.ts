export interface PresenceParticipant {
  userId: string
  name: string
  image: string | null
  selectedBlockStableKey: string | null
  lastSeenAt: string
}
