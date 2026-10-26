import { describe, expect, it } from 'vitest'

import {
  assertTrustServiceBinding,
  assertTrustServiceProfile,
  TrustServiceBindingMismatchError,
  TrustServiceProfileMismatchError,
} from './trust-service-binding'

import type { TrustServiceBinding, TrustServiceProfile } from './trust-service-adapter'

const binding: TrustServiceBinding = {
  organizationId: 'organization-1',
  projectId: 'project-1',
  documentId: 'document-1',
  documentVersionId: 'version-1',
  signatureRequestId: 'request-1',
  contentSha256: 'a'.repeat(64),
}

const profile: TrustServiceProfile = {
  assurance: 'advanced',
  jurisdiction: 'test-jurisdiction',
  signatureFormat: 'test-format',
  signatureProfile: 'test-profile',
}

describe('trust-service binding', () => {
  it('accepts the exact immutable Redline binding', () => {
    expect(() => assertTrustServiceBinding(binding, { ...binding })).not.toThrow()
  })

  it.each(Object.keys(binding) as (keyof TrustServiceBinding)[])(
    'rejects a changed %s',
    (field) => {
      expect(() =>
        assertTrustServiceBinding(binding, { ...binding, [field]: `${binding[field]}-changed` }),
      ).toThrow(new TrustServiceBindingMismatchError(field))
    },
  )

  it.each(Object.keys(profile) as (keyof TrustServiceProfile)[])(
    'rejects a changed %s profile value',
    (field) => {
      expect(() =>
        assertTrustServiceProfile(profile, { ...profile, [field]: `${profile[field]}-changed` }),
      ).toThrow(new TrustServiceProfileMismatchError(field))
    },
  )
})
