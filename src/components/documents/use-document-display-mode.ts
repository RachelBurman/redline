import { useCallback, useSyncExternalStore } from 'react'

import { isDocumentDisplayMode } from './document-display-mode'

import type { DocumentDisplayMode } from './document-display-mode'

const preferencePrefix = 'redline:document-display-mode'
const listeners = new Map<string, Set<() => void>>()

export function documentDisplayModePreferenceKey(userId: string) {
  return `${preferencePrefix}:${userId}`
}

function readMode(storageKey: string): DocumentDisplayMode {
  try {
    const storedMode = window.localStorage.getItem(storageKey)
    return isDocumentDisplayMode(storedMode) ? storedMode : 'normal'
  } catch {
    return 'normal'
  }
}

function subscribe(storageKey: string, onStoreChange: () => void) {
  const keyListeners = listeners.get(storageKey) ?? new Set<() => void>()
  keyListeners.add(onStoreChange)
  listeners.set(storageKey, keyListeners)

  function handleStorage(event: StorageEvent) {
    if (event.key === storageKey) onStoreChange()
  }

  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener('storage', handleStorage)
    keyListeners.delete(onStoreChange)
    if (keyListeners.size === 0) listeners.delete(storageKey)
  }
}

export function useDocumentDisplayMode(userId: string) {
  const storageKey = documentDisplayModePreferenceKey(userId)
  const subscribeToMode = useCallback(
    (onStoreChange: () => void) => subscribe(storageKey, onStoreChange),
    [storageKey],
  )
  const getSnapshot = useCallback(() => readMode(storageKey), [storageKey])
  const getServerSnapshot = useCallback((): DocumentDisplayMode => 'normal', [])
  const mode = useSyncExternalStore(subscribeToMode, getSnapshot, getServerSnapshot)
  const setMode = useCallback(
    (nextMode: DocumentDisplayMode) => {
      try {
        window.localStorage.setItem(storageKey, nextMode)
      } catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
      }
      for (const listener of listeners.get(storageKey) ?? []) listener()
    },
    [storageKey],
  )

  return [mode, setMode] as const
}
