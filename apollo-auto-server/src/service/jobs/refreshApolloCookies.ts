import type { ApolloCookie } from '@prisma/client'
import type { CookieEntry } from 'utils/apollo'
import { refreshSessionCookies } from 'utils/apollo'
import { parseCookies, serializeCookies } from 'utils/cookies'
import prisma from 'utils/prisma'

type RefreshedCookieValues = {
  __ModuleSessionCookie?: string
  __ModuleSessionCookie2?: string
}

const TARGET_COOKIE_NAMES = [
  '__ModuleSessionCookie',
  '__ModuleSessionCookie2',
] as const

const applyRefreshedValues = (
  cookies: CookieEntry[],
  refreshed: RefreshedCookieValues
): { updatedCookies: CookieEntry[]; changed: boolean } => {
  const updates = new Map<CookieEntry['name'], string>()

  TARGET_COOKIE_NAMES.forEach((name) => {
    const value = refreshed[name]
    if (typeof value === 'string' && value.length > 0) {
      updates.set(name, value)
    }
  })

  if (updates.size === 0) {
    return { updatedCookies: cookies, changed: false }
  }

  const updatedCookies: CookieEntry[] = []
  let changed = false

  cookies.forEach((cookie) => {
    if (!updates.has(cookie.name)) {
      updatedCookies.push(cookie)
      return
    }

    const nextValue = updates.get(cookie.name) as string
    updates.delete(cookie.name)

    if (cookie.value !== nextValue) {
      changed = true
      updatedCookies.push({ ...cookie, value: nextValue })
    } else {
      updatedCookies.push(cookie)
    }
  })

  updates.forEach((value, name) => {
    changed = true
    updatedCookies.push({ name, value })
  })

  return { updatedCookies, changed }
}

const refreshApolloCookie = async (record: ApolloCookie): Promise<boolean> => {
  try {
    const cookies = parseCookies(record.value)
    const refreshed = await refreshSessionCookies(cookies)

    if (!refreshed.__ModuleSessionCookie && !refreshed.__ModuleSessionCookie2) {
      throw new Error('Refresh response did not include target cookies.')
    }

    const { updatedCookies, changed } = applyRefreshedValues(cookies, refreshed)

    if (!changed) {
      console.log(
        `[Apollo-CookieRefresh] Cookies for user ${record.userId} already up to date.`
      )
      return true
    }

    const serialized = serializeCookies(updatedCookies, record.value)

    await prisma.apolloCookie.update({
      where: { id: record.id },
      data: {
        value: serialized,
      },
    })

    console.log(
      `[Apollo-CookieRefresh] Refreshed cookies for user ${record.userId}.`
    )

    return true
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown refresh error.'

    console.error(
      `[Apollo-CookieRefresh] Failed to refresh cookies for user ${
        record.userId
      }: ${message}`
    )

    return false
  }
}

const refreshApolloCookies = async (): Promise<boolean> => {
  const records = await prisma.apolloCookie.findMany()

  if (records.length === 0) {
    return true
  }

  let hasFailure = false

  for (const record of records) {
    const success = await refreshApolloCookie(record)
    if (!success) {
      hasFailure = true
    }
  }

  return !hasFailure
}

export { refreshApolloCookies }
