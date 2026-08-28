import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import type { PresenceParticipant } from '#/types/presence'

export function useDocumentPresence(input: {
  documentId: string
  documentVersionId?: string
  selectedBlockStableKey?: string
  enabled: boolean
}) {
  const [clientId] = useState(() => `web-${crypto.randomUUID()}`)

  useQuery({
    queryKey: [
      'presence-heartbeat',
      input.documentId,
      input.documentVersionId,
      clientId,
      input.selectedBlockStableKey,
    ],
    queryFn: async () => {
      const response = await fetch(`/api/v1/documents/${input.documentId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentVersionId: input.documentVersionId,
          clientId,
          selectedBlockStableKey: input.selectedBlockStableKey ?? null,
        }),
      })
      if (!response.ok) throw new Error('The presence heartbeat was not accepted.')
      return response.json() as Promise<{ data: { lastSeenAt: string } }>
    },
    enabled: input.enabled && Boolean(input.documentVersionId),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    retry: 1,
  })

  return useQuery({
    queryKey: ['document-presence', input.documentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/documents/${input.documentId}/presence`)
      if (!response.ok) throw new Error('Active reviewers could not be loaded.')
      const body = (await response.json()) as { data: PresenceParticipant[] }
      return body.data
    },
    enabled: input.enabled,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  })
}
