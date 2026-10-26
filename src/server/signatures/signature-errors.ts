export class SignatureRequestNotFoundError extends Error {
  constructor() {
    super('The signature request was not found for this document.')
    this.name = 'SignatureRequestNotFoundError'
  }
}

export class SignatureRequestConflictError extends Error {
  constructor(message = 'This signature request can no longer be changed.') {
    super(message)
    this.name = 'SignatureRequestConflictError'
  }
}

export class SignatureSignerNotFoundError extends Error {
  constructor(message = 'No eligible required signers were found for this version.') {
    super(message)
    this.name = 'SignatureSignerNotFoundError'
  }
}

export class SignatureSlotNotFoundError extends Error {
  constructor() {
    super('You are not a required signer for this signature request.')
    this.name = 'SignatureSlotNotFoundError'
  }
}

export class SignatureEmailNotVerifiedError extends Error {
  constructor() {
    super('Verify your email address before signing this document version.')
    this.name = 'SignatureEmailNotVerifiedError'
  }
}
