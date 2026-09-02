function containsControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })
}

export function getSafeAuthRedirect(value: unknown, fallback = '/app') {
  if (typeof value !== 'string') return fallback

  try {
    const decodedValue = decodeURIComponent(value)
    if (
      !value.startsWith('/') ||
      value.startsWith('//') ||
      decodedValue.includes('\\') ||
      containsControlCharacter(decodedValue)
    ) {
      return fallback
    }

    const applicationOrigin = 'https://redline.invalid'
    const redirectUrl = new URL(value, applicationOrigin)
    if (redirectUrl.origin !== applicationOrigin) return fallback
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
  } catch {
    return fallback
  }
}

export function buildAuthHref(path: '/sign-in' | '/sign-up', redirectTo: string) {
  const search = new URLSearchParams({ redirect: getSafeAuthRedirect(redirectTo) })
  return `${path}?${search.toString()}`
}
