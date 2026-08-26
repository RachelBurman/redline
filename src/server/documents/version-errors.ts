export class DocumentVersionNotFoundError extends Error {
  constructor() {
    super('The document version was not found in this organisation.')
    this.name = 'DocumentVersionNotFoundError'
  }
}

export class DocumentVersionConflictError extends Error {
  constructor(message = 'The current document version changed. Refresh and try again.') {
    super(message)
    this.name = 'DocumentVersionConflictError'
  }
}

export class NoAcceptedChangesError extends Error {
  constructor() {
    super('Accept at least one proposal before creating a new version.')
    this.name = 'NoAcceptedChangesError'
  }
}
