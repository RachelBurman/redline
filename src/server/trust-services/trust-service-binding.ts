import type { TrustServiceBinding, TrustServiceProfile } from './trust-service-adapter'

export class TrustServiceBindingMismatchError extends Error {
  constructor(readonly field: keyof TrustServiceBinding) {
    super(`The trust-service response does not match the bound ${field}.`)
    this.name = 'TrustServiceBindingMismatchError'
  }
}

export class TrustServiceProfileMismatchError extends Error {
  constructor(readonly field: keyof TrustServiceProfile) {
    super(`The trust-service response does not match the approved ${field}.`)
    this.name = 'TrustServiceProfileMismatchError'
  }
}

const bindingFields = [
  'organizationId',
  'projectId',
  'documentId',
  'documentVersionId',
  'signatureRequestId',
  'contentSha256',
] as const satisfies readonly (keyof TrustServiceBinding)[]

export function assertTrustServiceBinding(
  expected: TrustServiceBinding,
  actual: TrustServiceBinding,
): void {
  for (const field of bindingFields) {
    if (expected[field] !== actual[field]) throw new TrustServiceBindingMismatchError(field)
  }
}

const profileFields = [
  'assurance',
  'jurisdiction',
  'signatureFormat',
  'signatureProfile',
] as const satisfies readonly (keyof TrustServiceProfile)[]

export function assertTrustServiceProfile(
  expected: TrustServiceProfile,
  actual: TrustServiceProfile,
): void {
  for (const field of profileFields) {
    if (expected[field] !== actual[field]) throw new TrustServiceProfileMismatchError(field)
  }
}
