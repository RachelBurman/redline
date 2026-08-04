import { Users } from 'lucide-react'

import type { PresenceParticipant } from '#/types/presence'

interface PresenceBarProps {
  participants: PresenceParticipant[]
  currentUserId: string
}

export function PresenceBar({ participants, currentUserId }: PresenceBarProps) {
  if (participants.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[#727b77]">
        <Users aria-hidden="true" size={14} /> Connecting presence…
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2" aria-label="Active reviewers">
      <span className="flex -space-x-2" aria-hidden="true">
        {participants.slice(0, 4).map((participant) => (
          <span
            className="grid size-7 place-items-center rounded-full border-2 border-[#f3f2ed] bg-[#325f4b] text-[10px] font-bold text-white"
            key={participant.userId}
            title={participant.name}
          >
            {participant.name.charAt(0).toUpperCase()}
          </span>
        ))}
      </span>
      <span className="text-xs text-[#68726d]">
        {participants.length === 1 && participants[0]?.userId === currentUserId
          ? 'You are reviewing'
          : `${participants.length} people reviewing`}
      </span>
    </div>
  )
}
