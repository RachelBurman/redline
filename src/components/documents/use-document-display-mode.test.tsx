import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  documentDisplayModePreferenceKey,
  useDocumentDisplayMode,
} from './use-document-display-mode'

beforeEach(() => window.localStorage.clear())

describe('useDocumentDisplayMode', () => {
  it('persists a private per-user preference without document identity', () => {
    const firstUser = renderHook(() => useDocumentDisplayMode('user-a'))
    const secondUser = renderHook(() => useDocumentDisplayMode('user-b'))

    act(() => firstUser.result.current[1]('latex-source'))

    expect(firstUser.result.current[0]).toBe('latex-source')
    expect(secondUser.result.current[0]).toBe('normal')
    expect(window.localStorage.getItem(documentDisplayModePreferenceKey('user-a'))).toBe(
      'latex-source',
    )
    expect(documentDisplayModePreferenceKey('user-a')).not.toContain('document-123')
  })

  it('ignores invalid stored values', () => {
    window.localStorage.setItem(documentDisplayModePreferenceKey('user-a'), 'unsafe-mode')

    const preference = renderHook(() => useDocumentDisplayMode('user-a'))

    expect(preference.result.current[0]).toBe('normal')
  })
})
