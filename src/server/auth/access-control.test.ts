import { describe, expect, it } from 'vitest'

import { organizationRoles } from './access-control'

describe('organisation role policy', () => {
  it('allows reviewers to propose reviews without editing or resolving documents', () => {
    expect(organizationRoles.reviewer.statements.document).toContain('review')
    expect(organizationRoles.reviewer.statements.document).not.toContain('edit')
    expect(organizationRoles.reviewer.statements.document).not.toContain('resolve')
  })

  it('keeps audit-only access separate from editing access', () => {
    expect(organizationRoles.auditor.statements.document).toContain('audit')
    expect(organizationRoles.auditor.statements.document).not.toContain('edit')
    expect(organizationRoles.auditor.statements.document).not.toContain('review')
  })

  it('allows owners to perform every document action', () => {
    expect(organizationRoles.owner.statements.document).toEqual([
      'create',
      'read',
      'edit',
      'review',
      'resolve',
      'export',
      'audit',
    ])
  })
})
