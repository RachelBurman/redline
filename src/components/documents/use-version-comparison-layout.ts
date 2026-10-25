import { useCallback, useSyncExternalStore } from 'react'

import { isVersionComparisonLayout } from './version-comparison-layout'

import type { VersionComparisonLayout } from './version-comparison-layout'

const preferencePrefix = 'redline:version-comparison-layout'

export function versionComparisonLayoutPreferenceKey(userId: string) {
  return `${preferencePrefix}:${userId}`
}

const listeners = new Map<string, Set<() => void>>()

function readLayout(storageKey: string): VersionComparisonLayout {
  try {
    const storedLayout = window.localStorage.getItem(storageKey)
    return isVersionComparisonLayout(storedLayout) ? storedLayout : 'unified'
  } catch {
    return 'unified'
  }
}

function subscribeToLayout(storageKey: string, onStoreChange: () => void) {
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

export function useVersionComparisonLayout(userId: string) {
  const storageKey = versionComparisonLayoutPreferenceKey(userId)
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToLayout(storageKey, onStoreChange),
    [storageKey],
  )
  const getSnapshot = useCallback(() => readLayout(storageKey), [storageKey])
  const getServerSnapshot = useCallback((): VersionComparisonLayout => 'unified', [])
  const layout = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setLayout = useCallback(
    (nextLayout: VersionComparisonLayout) => {
      try {
        window.localStorage.setItem(storageKey, nextLayout)
      } catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
      }
      for (const listener of listeners.get(storageKey) ?? []) listener()
    },
    [storageKey],
  )

  return [layout, setLayout] as const
}
