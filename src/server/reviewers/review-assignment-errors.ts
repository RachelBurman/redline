export class ReviewRoundNotFoundError extends Error {
  constructor() {
    super('The review round was not found for this document.')
    this.name = 'ReviewRoundNotFoundError'
  }
}

export class ReviewAssigneeNotFoundError extends Error {
  constructor() {
    super('The selected reviewer is not an eligible organisation member.')
    this.name = 'ReviewAssigneeNotFoundError'
  }
}

export class ReviewAssignmentNotFoundError extends Error {
  constructor() {
    super('The active review assignment was not found.')
    this.name = 'ReviewAssignmentNotFoundError'
  }
}

export class ReviewAssignmentConflictError extends Error {
  constructor(message = 'This reviewer is already assigned to the review round.') {
    super(message)
    this.name = 'ReviewAssignmentConflictError'
  }
}
