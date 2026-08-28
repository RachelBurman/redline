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
