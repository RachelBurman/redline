import { describe, expect, it } from 'vitest'

import { localObjectStore } from './local-object-store'

describe('localObjectStore key isolation', () => {
  it.each(['../secret', 'media/../../secret', 'media\\secret', 'C:\\secret'])(
    'rejects path traversal key %s',
    async (key) => {
      await expect(localObjectStore.put(key, new Uint8Array([1]))).rejects.toThrow(
        'object key is invalid',
      )
    },
  )
})
