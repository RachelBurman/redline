const documentCreators = new Set(['owner', 'admin', 'editor'])

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
