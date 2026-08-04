import { describe, expect, it } from 'vitest'

import { PermissionDeniedError, assertCanCreateDocument } from './permissions'

describe('document permissions', () => {
  it.each(['owner', 'admin', 'editor'])('allows %s to create documents', (role) => {
    expect(() => assertCanCreateDocument(role)).not.toThrow()
  })

  it.each(['reviewer', 'viewer', 'auditor', 'member'])('rejects %s uploads', (role) => {
    expect(() => assertCanCreateDocument(role)).toThrow(PermissionDeniedError)
  })
})
