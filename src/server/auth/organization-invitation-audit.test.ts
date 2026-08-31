import { describe, expect, it } from 'vitest'

import { buildInvitationAuditPayload } from './organization-invitation-audit'

describe('buildInvitationAuditPayload', () => {
  it('normalises the invited email and retains the immutable invitation identity', () => {
    expect(
      buildInvitationAuditPayload({
        id: 'invitation-1',
        email: 'Reviewer@Example.com',
        organizationId: 'organization-1',
        role: 'reviewer',
      }),
    ).toEqual({
      invitationId: 'invitation-1',
      invitedEmail: 'reviewer@example.com',
      role: 'reviewer',
    })
  })
})
