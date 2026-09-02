import { describe, expect, it } from 'vitest'

import {
  PermissionDeniedError,
  assertCanAssignReviewers,
  assertCanCommentOnReviewItem,
  assertCanCreateDocument,
  assertCanExportDocument,
  assertCanExportReviewQueue,
  assertCanInviteReviewers,
  assertCanManageDocumentVersions,
  assertCanResolveReviewItem,
  assertCanReviewDocument,
  getDocumentCapabilities,
  getWorkspaceCapabilities,
  hasOrganizationWideDocumentAccess,
} from './permissions'

describe('document permissions', () => {
  it('builds UI capabilities from the same role policy as the API', () => {
    expect(getWorkspaceCapabilities('reviewer')).toEqual({
      createDocument: false,
      manageReviewers: false,
    })
    expect(getDocumentCapabilities('reviewer')).toMatchObject({
      comment: true,
      exportDocument: false,
      exportReviewQueue: true,
      manageAssignments: false,
      manageVersions: false,
      review: true,
      resolve: false,
      viewAudit: true,
    })
  })

  it.each(['owner', 'admin', 'editor'])('%s can read every organisation document', (role) => {
    expect(hasOrganizationWideDocumentAccess(role)).toBe(true)
  })

  it.each(['reviewer', 'viewer', 'auditor', 'member'])(
    '%s needs a current review-round assignment',
    (role) => {
      expect(hasOrganizationWideDocumentAccess(role)).toBe(false)
    },
  )

  it.each(['owner', 'admin', 'editor'])('allows %s to create documents', (role) => {
    expect(() => assertCanCreateDocument(role)).not.toThrow()
  })

  it.each(['reviewer', 'viewer', 'auditor', 'member'])('rejects %s uploads', (role) => {
    expect(() => assertCanCreateDocument(role)).toThrow(PermissionDeniedError)
  })
})

describe('review permissions', () => {
  it.each(['owner', 'admin', 'editor'])('allows %s to assign review rounds', (role) => {
    expect(() => assertCanAssignReviewers(role)).not.toThrow()
  })

  it.each(['reviewer', 'viewer', 'auditor', 'member'])(
    'prevents %s from assigning review rounds',
    (role) => {
      expect(() => assertCanAssignReviewers(role)).toThrow(PermissionDeniedError)
    },
  )

  it.each(['owner', 'admin'])('allows %s to invite reviewers', (role) => {
    expect(() => assertCanInviteReviewers(role)).not.toThrow()
  })

  it.each(['editor', 'reviewer', 'viewer', 'auditor', 'member'])(
    'prevents %s from inviting reviewers',
    (role) => {
      expect(() => assertCanInviteReviewers(role)).toThrow(PermissionDeniedError)
    },
  )

  it('allows reviewers to propose but not resolve changes', () => {
    expect(() => assertCanReviewDocument('reviewer')).not.toThrow()
    expect(() => assertCanResolveReviewItem('reviewer')).toThrow(PermissionDeniedError)
  })

  it.each(['owner', 'admin', 'editor'])('allows %s to resolve changes', (role) => {
    expect(() => assertCanResolveReviewItem(role)).not.toThrow()
    expect(() => assertCanExportDocument(role)).not.toThrow()
    expect(() => assertCanManageDocumentVersions(role)).not.toThrow()
  })

  it.each(['owner', 'admin', 'editor', 'reviewer'])(
    'allows %s to comment on review proposals',
    (role) => {
      expect(() => assertCanCommentOnReviewItem(role)).not.toThrow()
    },
  )

  it.each(['viewer', 'auditor', 'member'])('prevents %s from commenting', (role) => {
    expect(() => assertCanCommentOnReviewItem(role)).toThrow(PermissionDeniedError)
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

  it.each(['reviewer', 'viewer', 'auditor', 'member'])(
    'prevents %s from managing document versions',
    (role) => {
      expect(() => assertCanManageDocumentVersions(role)).toThrow(PermissionDeniedError)
    },
  )
})
