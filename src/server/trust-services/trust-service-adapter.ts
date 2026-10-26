export type TrustServiceAssurance = 'advanced' | 'qualified'

export type TrustServiceStatus =
  | 'created'
  | 'awaiting-signer'
  | 'processing'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'expired'
  | 'failed'

export interface TrustServiceBinding {
  organizationId: string
  projectId: string
  documentId: string
  documentVersionId: string
  signatureRequestId: string
  contentSha256: string
}

export interface TrustServiceProfile {
  assurance: TrustServiceAssurance
  jurisdiction: string
  signatureFormat: string
  signatureProfile: string
}

export interface TrustServiceSigner {
  redlineUserId: string
  displayName: string
  verifiedEmail: string
  locale?: string
}

export interface TrustServiceArtifact {
  fileName: string
  mediaType: string
  sha256: string
  bytes: Uint8Array
}

export interface CreateTrustServiceTransactionInput {
  binding: TrustServiceBinding
  profile: TrustServiceProfile
  signer: TrustServiceSigner
  artifact: TrustServiceArtifact
  callbackUrl: string
  returnUrl: string
}

export type SigningExperience =
  | { kind: 'redirect'; url: string; expiresAt: string }
  | { kind: 'embedded'; url: string; expiresAt: string; allowedOrigins: string[] }

export interface TrustServiceTransactionSnapshot {
  providerTransactionId: string
  binding: TrustServiceBinding
  profile: TrustServiceProfile
  status: TrustServiceStatus
  providerStatus: string
  providerUpdatedAt: string
  failure?: { code: string; message: string; retryable: boolean }
}

export interface VerifiedTrustServiceWebhook {
  providerEventId: string
  providerTransactionId: string
  eventType: string
  occurredAt: string
}

export interface TrustServiceCertificate {
  subject: string
  issuer: string
  serialNumber: string
  sha256: string
  notBefore: string
  notAfter: string
}

export interface TrustServiceTimestamp {
  type: string
  authority: string
  time: string
  tokenSha256: string
  validationStatus: 'valid' | 'invalid' | 'indeterminate' | 'not-performed'
}

export interface TrustServiceRevocationEvidence {
  certificateSha256: string
  status: 'good' | 'revoked' | 'unknown' | 'not-checked'
  checkedAt: string | null
  source: string | null
  evidenceSha256: string | null
}

export interface TrustServiceEvidenceArtifact {
  kind: 'signed-artifact' | 'evidence-package' | 'validation-report' | 'other'
  fileName: string
  mediaType: string
  sha256: string
  bytes: Uint8Array
}

export interface TrustServiceEvidence {
  providerTransactionId: string
  binding: TrustServiceBinding
  profile: TrustServiceProfile
  providerId: string
  validationStatus: 'valid' | 'invalid' | 'indeterminate' | 'not-performed'
  validatedAt: string | null
  certificateChain: TrustServiceCertificate[]
  timestamps: TrustServiceTimestamp[]
  revocationEvidence: TrustServiceRevocationEvidence[]
  artifacts: TrustServiceEvidenceArtifact[]
}

export interface TrustServiceAdapter {
  readonly providerId: string
  createTransaction(
    input: CreateTrustServiceTransactionInput,
  ): Promise<TrustServiceTransactionSnapshot>
  createSigningExperience(providerTransactionId: string): Promise<SigningExperience>
  getTransaction(providerTransactionId: string): Promise<TrustServiceTransactionSnapshot>
  cancelTransaction(providerTransactionId: string): Promise<TrustServiceTransactionSnapshot>
  verifyWebhook(input: {
    headers: Headers
    rawBody: Uint8Array
    receivedAt: string
  }): Promise<VerifiedTrustServiceWebhook>
  retrieveEvidence(providerTransactionId: string): Promise<TrustServiceEvidence>
}
