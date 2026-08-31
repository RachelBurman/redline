export class ReviewTargetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReviewTargetError'
  }
}

export class ReviewConflictError extends Error {
  constructor(message = 'This proposal changed before your decision could be recorded.') {
    super(message)
    this.name = 'ReviewConflictError'
  }
}

export class ReviewItemNotFoundError extends Error {
  constructor() {
    super('The review proposal was not found in this organisation.')
    this.name = 'ReviewItemNotFoundError'
  }
}

export class ReviewCommentParentError extends Error {
  constructor(message = 'The reply target is not available for this review proposal.') {
    super(message)
    this.name = 'ReviewCommentParentError'
  }
}
