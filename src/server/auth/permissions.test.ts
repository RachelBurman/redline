import { describe, expect, it } from 'vitest'

import {
  PermissionDeniedError,
  assertCanCreateDocument,
  assertCanExportDocument,
  assertCanExportReviewQueue,
  assertCanResolveReviewItem,
  assertCanReviewDocument,
} from './permissions'

describe('document permissions', () => {
  it.each(['owner', 'admin', 'editor'])('allows %s to create documents', (role) => {
    expect(() => assertCanCreateDocument(role)).not.toThrow()
  })

  it.each(['reviewer', 'viewer', 'auditor', 'member'])('rejects %s uploads', (role) => {
    expect(() => assertCanCreateDocument(role)).toThrow(PermissionDeniedError)
  })
})

describe('review permissions', () => {
  it('allows reviewers to propose but not resolve changes', () => {
    expect(() => assertCanReviewDocument('reviewer')).not.toThrow()
    expect(() => assertCanResolveReviewItem('reviewer')).toThrow(PermissionDeniedError)
  })

  it.each(['owner', 'admin', 'editor'])('allows %s to resolve changes', (role) => {
    expect(() => assertCanResolveReviewItem(role)).not.toThrow()
    expect(() => assertCanExportDocument(role)).not.toThrow()
  })

  it.each(['viewer', 'auditor'])('prevents %s from proposing changes', (role) => {
    expect(() => assertCanReviewDocument(role)).toThrow(PermissionDeniedError)
    expect(() => assertCanExportDocument(role)).toThrow(PermissionDeniedError)
  })

  it.each(['owner', 'admin', 'editor', 'reviewer', 'auditor'])(
    'allows %s to export the review queue',
    (role) => {
      expect(() => assertCanExportReviewQueue(role)).not.toThrow()
    },
  )

  it.each(['viewer', 'member'])('prevents %s from exporting the review queue', (role) => {
    expect(() => assertCanExportReviewQueue(role)).toThrow(PermissionDeniedError)
  })
})
