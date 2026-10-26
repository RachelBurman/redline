export class CrossSiteRequestError extends Error {
  constructor() {
    super('Cross-site mutation requests are not allowed.')
    this.name = 'CrossSiteRequestError'
  }
}

export function assertSameOrigin(request: Request) {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'cross-site') throw new CrossSiteRequestError()

  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) throw new CrossSiteRequestError()
}
