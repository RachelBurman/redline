import { auth } from '#/lib/auth'

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('You must be signed in to continue.')
    this.name = 'AuthenticationRequiredError'
  }
}

export async function requireSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    throw new AuthenticationRequiredError()
  }

  return session
}
