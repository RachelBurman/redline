import { LiveUpdatesContext } from './document-live-updates-context'

import type { PropsWithChildren } from 'react'

export function DocumentLiveUpdatesProvider({
  announcement,
  connected,
  children,
}: PropsWithChildren<{ announcement: string | null; connected: boolean }>) {
  return (
    <LiveUpdatesContext value={connected}>
      {announcement ? (
        <output aria-live="polite" className="sr-only">
          {announcement}
        </output>
      ) : null}
      {children}
    </LiveUpdatesContext>
  )
}
