const documentCreators = new Set(['owner', 'admin', 'editor'])
const documentReviewers = new Set(['owner', 'admin', 'editor', 'reviewer'])
const documentResolvers = new Set(['owner', 'admin', 'editor'])
const reviewCommenters = new Set(['owner', 'admin', 'editor', 'reviewer'])
const documentExporters = new Set(['owner', 'admin', 'editor'])
const documentVersionManagers = new Set(['owner', 'admin', 'editor'])
const reviewQueueExporters = new Set(['owner', 'admin', 'editor', 'reviewer', 'auditor'])
const reviewerInviters = new Set(['owner', 'admin'])
const reviewRoundAssigners = new Set(['owner', 'admin', 'editor'])

export class PermissionDeniedError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message)
    this.name = 'PermissionDeniedError'
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
