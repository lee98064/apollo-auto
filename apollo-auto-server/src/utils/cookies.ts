import type { CookieEntry } from './apollo'

const normalizeCookie = (entry: unknown): CookieEntry | null => {
  if (
    typeof entry === 'object' &&
    entry !== null &&
    'name' in entry &&
    'value' in entry
  ) {
    const name = String((entry as { name: unknown }).name).trim()
    const value = String((entry as { value: unknown }).value).trim()

    if (name && value) {
      return { name, value }
    }
  }

  return null
}

const parseCookies = (rawValue: string): CookieEntry[] => {
  if (!rawValue.trim()) {
    throw new Error('Stored Apollo cookie is empty.')
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    const arrayCandidate = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { cookies?: unknown[] } | undefined)?.cookies)
        ? (parsed as { cookies?: unknown[] }).cookies
        : null

    if (arrayCandidate) {
      const normalized = arrayCandidate
        .map(normalizeCookie)
        .filter((cookie): cookie is CookieEntry => cookie !== null)

      if (normalized.length > 0) {
        return normalized
      }
    }
  } catch {
    // fall through to raw parsing
  }

  const fallback = rawValue
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [name, ...valueParts] = chunk.split('=')
      const value = valueParts.join('=').trim()

      if (!name || !value) {
        return null
      }

      return { name: name.trim(), value }
    })
    .filter((cookie): cookie is CookieEntry => cookie !== null)

  if (fallback.length === 0) {
    throw new Error('Unable to parse Apollo cookie.')
  }

  return fallback
}

const serializeCookies = (
  cookies: CookieEntry[],
  originalValue?: string
): string => {
  const simpleList = () =>
    cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')

  if (!originalValue) {
    return JSON.stringify(
      cookies.map(({ name, value }) => ({ name, value }))
    )
  }

  const trimmed = originalValue.trim()

  if (!trimmed) {
    return JSON.stringify(
      cookies.map(({ name, value }) => ({ name, value }))
    )
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown

    if (Array.isArray(parsed)) {
      return JSON.stringify(
        cookies.map(({ name, value }) => ({ name, value }))
      )
    }

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'cookies' in parsed &&
      Array.isArray((parsed as { cookies?: unknown[] }).cookies)
    ) {
      return JSON.stringify({
        ...(parsed as Record<string, unknown>),
        cookies: cookies.map(({ name, value }) => ({ name, value })),
      })
    }
  } catch {
    // ignore JSON parse failures, fallback to simple string
  }

  return simpleList()
}

export { parseCookies, serializeCookies }
