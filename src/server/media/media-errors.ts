export class MediaAssetNotFoundError extends Error {
  constructor(message = 'The media asset was not found.') {
    super(message)
    this.name = 'MediaAssetNotFoundError'
  }
}

export class MediaAssetStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MediaAssetStateError'
  }
}
