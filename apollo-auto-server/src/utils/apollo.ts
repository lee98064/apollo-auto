import env from './env'

export interface CookieEntry {
  name: string
  value: string
}

export interface CalendarDay {
  date: string
  isWorkingDay: boolean
  isHoliday: boolean
  hasLeave: boolean
  workOnTime?: string
  workOffTime?: string
}

export interface PunchStatus {
  workType: number
  restType: number
  locationName?: string
  errorMessage?: string
}

export interface PunchResult {
  success: boolean
  punchDate?: string
  punchType?: number
  locationName?: string
  message?: string
}

type ApolloRequestOptions = {
  method?: 'GET' | 'POST'
  headers?: Record<string, string | undefined>
  query?: Record<string, string | number | undefined>
  body?: unknown
}

const REQUEST_TIMEOUT_MS = 15_000

const buildCookieHeader = (cookies: CookieEntry[]): string =>
  cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')

const normalizeTime = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

type ApolloRequestResult = {
  response: Response
  rawBody: string
}

const performApolloRequest = async (
  path: string,
  options: ApolloRequestOptions = {}
): Promise<ApolloRequestResult> => {
  const { method = 'GET', headers = {}, query, body } = options

  const url = new URL(path, env.APOLLO_BASE_URL)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (typeof value === 'undefined' || value === null) {
        return
      }
      url.searchParams.set(key, String(value))
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const sanitizedHeaders = Object.entries(headers).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value !== 'undefined') {
        acc[key] = value
      }
      return acc
    },
    {}
  )

  const requestInit: RequestInit = {
    method,
    headers: sanitizedHeaders,
    signal: controller.signal,
  }

  if (typeof body !== 'undefined') {
    if (typeof body === 'string' || body instanceof Uint8Array) {
      requestInit.body = body as RequestInit['body']
    } else {
      requestInit.body = JSON.stringify(body)
      if (!sanitizedHeaders['Content-Type']) {
        sanitizedHeaders['Content-Type'] = 'application/json'
      }
    }
  }

  try {
    const response = await fetch(url, requestInit)
    const rawBody = await response.text()
    return { response, rawBody }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Apollo request timed out.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

const requestApollo = async <T>(
  path: string,
  options: ApolloRequestOptions = {}
): Promise<T> => {
  const { response, rawBody } = await performApolloRequest(path, options)

  if (!response.ok) {
    const message =
      rawBody ||
      `${response.status} ${response.statusText || 'request failed'}`
    throw new Error(message)
  }

  if (!rawBody) {
    return {} as T
  }

  try {
    return JSON.parse(rawBody) as T
  } catch {
    throw new Error('Failed to parse Apollo response.')
  }
}

const getSetCookieHeaders = (headers: Headers): string[] => {
  const extendedHeaders = headers as Headers & {
    getSetCookie?: () => string[]
    raw?: () => Record<string, string[]>
  }

  if (typeof extendedHeaders.getSetCookie === 'function') {
    return extendedHeaders.getSetCookie()
  }

  if (typeof extendedHeaders.raw === 'function') {
    const rawHeaders = extendedHeaders.raw()
    const setCookie = rawHeaders['set-cookie'] ?? rawHeaders['Set-Cookie']
    if (Array.isArray(setCookie)) {
      return setCookie
    }
  }

  const singleHeader = headers.get('set-cookie')
  return singleHeader ? [singleHeader] : []
}

const parseSetCookieHeader = (header: string): CookieEntry | undefined => {
  const [cookiePair] = header.split(';')
  if (!cookiePair) {
    return undefined
  }

  const equalsIndex = cookiePair.indexOf('=')
  if (equalsIndex === -1) {
    return undefined
  }

  const name = cookiePair.slice(0, equalsIndex).trim()
  const value = cookiePair.slice(equalsIndex + 1).trim()

  if (!name) {
    return undefined
  }

  return { name, value }
}

export const fetchCalendar = async (
  year: number,
  month: number,
  cookies: CookieEntry[]
): Promise<Record<string, CalendarDay>> => {
  const cookieHeader = buildCookieHeader(cookies)

  const response = await requestApollo<{
    Data?: {
      Calendars?: Array<Record<string, unknown>>
    }
  }>('/backend/pt/api/EmployeeCalendars/scheduling', {
    method: 'GET',
    query: { year, month },
    headers: {
      Cookie: cookieHeader,
      functioncode: 'PersonalShiftSchedule',
    },
  })

  const calendars: Record<string, CalendarDay> = {}
  const data = response.Data?.Calendars ?? []

  data.forEach((day) => {
    const date = String(day?.Date ?? '')
    if (!date) {
      return
    }

    const calendarEvent = day?.CalendarEvent as
      | { EventStatus?: number }
      | undefined
    const shiftSchedule = day?.ShiftSchedule as
      | {
          CycleStatus?: number
          WorkOnTime?: string | null
          WorkOffTime?: string | null
        }
      | undefined
    const employees = Array.isArray(day?.Employees)
      ? (day?.Employees as Array<{ LeaveSheets?: unknown[] }>)
      : []

    const isHoliday = Boolean(calendarEvent && calendarEvent.EventStatus === 2)
    const hasLeave = employees.some(
      (employee) =>
        Array.isArray(employee.LeaveSheets) &&
        employee.LeaveSheets.length > 0
    )
    const isWorkingDay =
      shiftSchedule?.CycleStatus === 1 &&
      Boolean(shiftSchedule?.WorkOnTime) &&
      Boolean(shiftSchedule?.WorkOffTime)

    calendars[date.slice(0, 10)] = {
      date,
      isWorkingDay,
      isHoliday,
      hasLeave,
      workOnTime: normalizeTime(shiftSchedule?.WorkOnTime ?? undefined),
      workOffTime: normalizeTime(shiftSchedule?.WorkOffTime ?? undefined),
    }
  })

  return calendars
}

export const fetchPunchStatus = async (
  cookies: CookieEntry[]
): Promise<PunchStatus> => {
  const cookieHeader = buildCookieHeader(cookies)

  const response = await requestApollo<{
    Data?: {
      WorkType?: number
      RestType?: number
      LocationName?: string
      ErrorMessage?: string
    }
  }>('/backend/pt/api/checkin/punchedTypeWithLocation', {
    headers: {
      Cookie: cookieHeader,
      actioncode: 'Default',
      functioncode: 'PunchCard',
    },
  })

  const data = response.Data ?? {}

  return {
    workType: data.WorkType ?? 0,
    restType: data.RestType ?? 0,
    locationName: data.LocationName,
    errorMessage: data.ErrorMessage,
  }
}

export const punch = async (
  attendanceType: 1 | 2,
  cookies: CookieEntry[]
): Promise<PunchResult> => {
  const cookieHeader = buildCookieHeader(cookies)

  try {
    const response = await requestApollo<{
      Data?: {
        punchDate?: string
        punchType?: number
        LocationName?: string
      }
    }>('/backend/pt/api/checkIn/punch/web', {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
        actioncode: 'Default',
        functioncode: 'PunchCard',
      },
      body: {
        AttendanceType: attendanceType,
        IsOverride: false,
      },
    })

    const data = response.Data ?? {}

    return {
      success: true,
      punchDate: data.punchDate,
      punchType: data.punchType,
      locationName: data.LocationName,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Punch failed.'

    console.error('Punch request failed:', {
      error,
      message,
    })

    return {
      success: false,
      message,
    }
  }
}

export const refreshSessionCookies = async (
  cookies: CookieEntry[]
): Promise<{
  __ModuleSessionCookie?: string
  __ModuleSessionCookie2?: string
}> => {
  const cookieHeader = buildCookieHeader(cookies)

  const { response, rawBody } = await performApolloRequest(
    '/backend/authcommon/api/auth/refreshtoken',
    {
      headers: {
        Cookie: cookieHeader,
      },
    }
  )

  if (!response.ok) {
    const message =
      rawBody ||
      `${response.status} ${response.statusText || 'request failed'}`
    throw new Error(message)
  }

  const setCookieHeaders = getSetCookieHeaders(response.headers)

  const refreshedCookies: {
    __ModuleSessionCookie?: string
    __ModuleSessionCookie2?: string
  } = {}

  setCookieHeaders.forEach((header) => {
    const parsed = parseSetCookieHeader(header)
    if (!parsed) {
      return
    }

    if (parsed.name === '__ModuleSessionCookie') {
      refreshedCookies.__ModuleSessionCookie = parsed.value
    }

    if (parsed.name === '__ModuleSessionCookie2') {
      refreshedCookies.__ModuleSessionCookie2 = parsed.value
    }
  })

  return refreshedCookies
}

export default {
  fetchCalendar,
  fetchPunchStatus,
  punch,
  refreshSessionCookies,
}
