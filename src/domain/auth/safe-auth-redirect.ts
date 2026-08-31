export function getSafeAuthRedirect(value: unknown, fallback = '/app') {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

export function buildAuthHref(path: '/sign-in' | '/sign-up', redirectTo: string) {
  const search = new URLSearchParams({ redirect: getSafeAuthRedirect(redirectTo) })
  return `${path}?${search.toString()}`
}
