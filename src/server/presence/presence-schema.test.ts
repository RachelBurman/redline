import { describe, expect, it } from 'vitest'

import { presenceHeartbeatSchema } from './presence-schema'

describe('presenceHeartbeatSchema', () => {
  it('accepts a version-bound browser heartbeat', () => {
    expect(
      presenceHeartbeatSchema.parse({
        documentVersionId: 'facafed0-3723-4869-9772-8619a488e22e',
        clientId: 'web-r1',
        selectedBlockStableKey: 'block-2-ccd529385395',
      }),
    ).toMatchObject({ clientId: 'web-r1' })
  })

  it('rejects client identifiers containing path characters', () => {
    expect(() =>
      presenceHeartbeatSchema.parse({
        documentVersionId: 'facafed0-3723-4869-9772-8619a488e22e',
        clientId: '../other-client',
      }),
    ).toThrow(/Invalid string/)
  })
})
