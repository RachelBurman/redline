import { createContext, useContext } from 'react'

export const LiveUpdatesContext = createContext(false)

export function useLiveUpdatesConnected() {
  return useContext(LiveUpdatesContext)
}
