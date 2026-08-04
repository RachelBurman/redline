export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export async function apiRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string }
    } | null

    throw new ApiClientError(
      errorBody?.error?.message ?? 'The request could not be completed.',
      response.status,
      errorBody?.error?.code,
    )
  }

  const body = (await response.json()) as {
    data?: T
  }

  if (body.data === undefined) {
    throw new ApiClientError('The server returned an invalid response.', response.status)
  }

  return body.data
}
