const documentCreators = new Set(['owner', 'admin', 'editor'])
const documentReviewers = new Set(['owner', 'admin', 'editor', 'reviewer'])
const documentResolvers = new Set(['owner', 'admin', 'editor'])
const reviewCommenters = new Set(['owner', 'admin', 'editor', 'reviewer'])
const documentExporters = new Set(['owner', 'admin', 'editor'])
const documentVersionManagers = new Set(['owner', 'admin', 'editor'])
const reviewQueueExporters = new Set(['owner', 'admin', 'editor', 'reviewer', 'auditor'])
const reviewerInviters = new Set(['owner', 'admin'])
const reviewRoundAssigners = new Set(['owner', 'admin', 'editor'])
const organizationWideDocumentReaders = new Set(['owner', 'admin', 'editor'])
const signatureRequestManagers = new Set(['owner', 'admin', 'editor'])

export interface WorkspaceCapabilities {
  createDocument: boolean
  manageReviewers: boolean
}

export interface DocumentCapabilities {
  comment: boolean
  exportDocument: boolean
  exportReviewQueue: boolean
  manageAssignments: boolean
  manageVersions: boolean
  manageSignatures: boolean
  review: boolean
  viewAudit: boolean
  resolve: boolean
}

export class PermissionDeniedError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message)
    this.name = 'PermissionDeniedError'
  }
}

export function hasOrganizationWideDocumentAccess(role: string) {
  return organizationWideDocumentReaders.has(role)
}

export function getWorkspaceCapabilities(role: string): WorkspaceCapabilities {
  return {
    createDocument: documentCreators.has(role),
    manageReviewers: reviewerInviters.has(role),
  }
}

export function getDocumentCapabilities(role: string): DocumentCapabilities {
  return {
    comment: reviewCommenters.has(role),
    exportDocument: documentExporters.has(role),
    exportReviewQueue: reviewQueueExporters.has(role),
    manageAssignments: reviewRoundAssigners.has(role),
    manageVersions: documentVersionManagers.has(role),
    manageSignatures: signatureRequestManagers.has(role),
    review: documentReviewers.has(role),
    viewAudit: reviewQueueExporters.has(role),
    resolve: documentResolvers.has(role),
  }
}

export function assertCanCreateDocument(role: string) {
  if (!documentCreators.has(role)) {
    throw new PermissionDeniedError('Your organisation role cannot upload documents.')
  }
}

export function assertCanReviewDocument(role: string) {
  if (!documentReviewers.has(role)) {
    throw new PermissionDeniedError('Your organisation role cannot propose document changes.')
  }
}

export function assertCanResolveReviewItem(role: string) {
  if (!documentResolvers.has(role)) {
    throw new PermissionDeniedError('Your organisation role cannot accept or reject proposals.')
  }
}

export function assertCanCommentOnReviewItem(role: string) {
  if (!reviewCommenters.has(role)) {
    throw new PermissionDeniedError('Your organisation role cannot comment on review proposals.')
  }
}

export function assertCanExportDocument(role: string) {
  if (!documentExporters.has(role)) {
    throw new PermissionDeniedError('Your organisation role cannot export resolved documents.')
  }
}

export function assertCanExportReviewQueue(role: string) {
  if (!reviewQueueExporters.has(role)) {
    throw new PermissionDeniedError('Your organisation role cannot export review reports.')
  }
}

export function assertCanManageDocumentVersions(role: string) {
  if (!documentVersionManagers.has(role)) {
    throw new PermissionDeniedError('Your organisation role cannot create or restore versions.')
  }
}

export function assertCanInviteReviewers(role: string) {
  if (!reviewerInviters.has(role)) {
    throw new PermissionDeniedError('Your organisation role cannot invite reviewers.')
  }
}

export function assertCanAssignReviewers(role: string) {
  if (!reviewRoundAssigners.has(role)) {
    throw new PermissionDeniedError('Your organisation role cannot manage review assignments.')
  }
}

export function assertCanManageSignatureRequests(role: string) {
  if (!signatureRequestManagers.has(role)) {
    throw new PermissionDeniedError(
      'Your organisation role cannot create, cancel, or supersede signature requests.',
    )
  }
}
