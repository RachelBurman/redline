import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { DocumentLiveUpdateConnection } from './document-live-update-connection'
import { liveEventQueryKeys, liveInitialSyncQueryKeys } from './document-live-update-model'

export function useDocumentLiveUpdates(input: { documentId: string; enabled: boolean }) {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const [announcement, setAnnouncement] = useState<string | null>(null)

  useEffect(() => {
    if (!input.enabled) return

    const connection = new DocumentLiveUpdateConnection({
      documentId: input.documentId,
      onAccessRevoked: () => {
        void queryClient.invalidateQueries({ queryKey: ['document', input.documentId] })
      },
      onAnnouncement: setAnnouncement,
      onConnectionChange: setConnected,
      onEvent: (event) => {
        for (const queryKey of liveEventQueryKeys(event)) {
          void queryClient.invalidateQueries({ queryKey })
        }
      },
      onInitialSync: () => {
        for (const queryKey of liveInitialSyncQueryKeys(input.documentId)) {
          void queryClient.invalidateQueries({ queryKey })
        }
      },
    })
    connection.start()
    return () => connection.stop()
  }, [input.documentId, input.enabled, queryClient])

  return { announcement, connected }
}
