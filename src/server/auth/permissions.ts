const documentCreators = new Set(['owner', 'admin', 'editor'])
const documentReviewers = new Set(['owner', 'admin', 'editor', 'reviewer'])
const documentResolvers = new Set(['owner', 'admin', 'editor'])
const documentExporters = new Set(['owner', 'admin', 'editor'])
const documentVersionManagers = new Set(['owner', 'admin', 'editor'])
const reviewQueueExporters = new Set(['owner', 'admin', 'editor', 'reviewer', 'auditor'])

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
