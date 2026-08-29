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

export function assertDocumentVersionHasBlocks(blocks: unknown[]) {
  if (blocks.length > 0) return
  throw new DocumentVersionConflictError(
    'The next version cannot be empty. Propose and accept a new paragraph before creating it.',
  )
}
