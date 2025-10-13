import { JobStatus, JobType, type Prisma } from '@prisma/client'
import type { CalendarDay, CookieEntry, PunchResult } from 'utils/apollo'
import { fetchCalendar, punch as requestPunch } from 'utils/apollo'
import prisma from 'utils/prisma'

type JobWithUser = Prisma.JobGetPayload<{
  include: { user: true }
}>

type JobExecutionConfig = {
  skipHoliday: boolean
  skipLeaves: boolean
}

type ExecutionContext = {
  cookieCache: Map<number, CookieEntry[]>
  calendarCache: Map<string, Record<string, CalendarDay>>
}

const ATTENDANCE_TYPE_BY_JOB: Record<JobType, 1 | 2> = {
  [JobType.CHECK_IN]: 1,
  [JobType.CHECK_OUT]: 2,
}

const parseJobConfig = (rawConfig: string | null): JobExecutionConfig => {
  if (!rawConfig) {
    return { skipHoliday: false, skipLeaves: false }
  }

  try {
    const parsed = JSON.parse(rawConfig) as {
      skipHoliday?: unknown
      skipLeaves?: unknown
    }

    return {
      skipHoliday: Boolean(parsed?.skipHoliday),
      skipLeaves: Boolean(parsed?.skipLeaves),
    }
  } catch {
    throw new Error('Invalid job data payload.')
  }
}

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

const getDateParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const yearStr =
    parts.find((part) => part.type === 'year')?.value ??
    String(date.getUTCFullYear())
  const monthStr =
    parts.find((part) => part.type === 'month')?.value ??
    String(date.getUTCMonth() + 1).padStart(2, '0')
  const dayStr =
    parts.find((part) => part.type === 'day')?.value ??
    String(date.getUTCDate()).padStart(2, '0')

  return {
    year: Number.parseInt(yearStr, 10),
    month: Number.parseInt(monthStr, 10),
    dateKey: `${yearStr.padStart(4, '0')}-${monthStr.padStart(
      2,
      '0'
    )}-${dayStr.padStart(2, '0')}`,
  }
}

const serializeResult = (payload: unknown): string => {
  if (typeof payload === 'string') {
    return payload
  }

  try {
    return JSON.stringify(payload)
  } catch (error) {
    return JSON.stringify({
      message: 'Failed to serialize job execution payload.',
      originalType: typeof payload,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

const createExecutionContext = (): ExecutionContext => ({
  cookieCache: new Map(),
  calendarCache: new Map(),
})

const getCookiesForUser = async (
  userId: number,
  context: ExecutionContext
): Promise<CookieEntry[]> => {
  if (context.cookieCache.has(userId)) {
    return context.cookieCache.get(userId) as CookieEntry[]
  }

  const record = await prisma.apolloCookie.findUnique({
    where: { userId },
  })

  if (!record?.value) {
    throw new Error('Apollo cookie not found for user.')
  }

  const cookies = parseCookies(record.value)
  context.cookieCache.set(userId, cookies)

  return cookies
}

const buildCalendarCacheKey = (
  userId: number,
  year: number,
  month: number
): string => `${userId}:${year}-${month}`

const getCalendarForUser = async (
  userId: number,
  year: number,
  month: number,
  cookies: CookieEntry[],
  context: ExecutionContext
): Promise<Record<string, CalendarDay>> => {
  const cacheKey = buildCalendarCacheKey(userId, year, month)

  if (context.calendarCache.has(cacheKey)) {
    return context.calendarCache.get(cacheKey) as Record<string, CalendarDay>
  }

  const calendar = await fetchCalendar(year, month, cookies)
  context.calendarCache.set(cacheKey, calendar)

  return calendar
}

const persistJobExecution = async (
  jobId: number,
  executedAt: Date,
  status: JobStatus,
  payload: unknown,
  jobType: JobType
): Promise<void> => {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        lastExecutedAt: executedAt,
        lastExecutionStatus: status,
        lastExecutionResult: serializeResult(payload),
        nextExecutionAt: null,
      },
    })
  } catch (error) {
    console.error(
      `[Apollo-${jobType}] Failed to persist execution result for job ${jobId}:`,
      error
    )
  }
}

const buildPunchPayload = (
  punchResult: PunchResult,
  config: JobExecutionConfig,
  timeZone: string,
  calendarDay?: CalendarDay
) => ({
  config,
  punchResult,
  timeZone,
  calendarDay,
})

const executeJob = async (
  job: JobWithUser,
  jobType: JobType,
  attendanceType: 1 | 2,
  context: ExecutionContext
): Promise<boolean> => {
  const executedAt = new Date()
  const timeZone = job.user?.timezone ?? 'UTC'

  let status: JobStatus = JobStatus.FAILED
  let payload: unknown = {}
  let success = false

  try {
    const config = parseJobConfig(job.data ?? null)
    const cookies = await getCookiesForUser(job.userId, context)
    const { year, month, dateKey } = getDateParts(executedAt, timeZone)

    let calendarDay: CalendarDay | undefined
    const skipReasons: string[] = []

    if (config.skipHoliday || config.skipLeaves) {
      const calendar = await getCalendarForUser(
        job.userId,
        year,
        month,
        cookies,
        context
      )

      calendarDay = calendar[dateKey]

      if (!calendarDay) {
        throw new Error(
          `Calendar data for ${dateKey} (${timeZone}) is unavailable.`
        )
      }

      if (config.skipHoliday) {
        if (calendarDay.isHoliday) {
          skipReasons.push('holiday')
        } else if (!calendarDay.isWorkingDay) {
          skipReasons.push('non-working-day')
        }
      }

      if (config.skipLeaves && calendarDay.hasLeave) {
        skipReasons.push('leave')
      }
    }

    if (skipReasons.length > 0) {
      status = JobStatus.SKIPPED
      success = true
      payload = {
        skipped: true,
        reasons: skipReasons,
        config,
        calendarDay,
        timeZone,
        dateKey,
      }

      console.log(
        `[Apollo-${jobType}] Job ${job.id} skipped due to ${skipReasons.join(
          ', '
        )}.`
      )
    } else {
      const punchResult = await requestPunch(attendanceType, cookies)
      success = punchResult.success
      status = punchResult.success ? JobStatus.SUCCESS : JobStatus.FAILED
      payload = buildPunchPayload(
        punchResult,
        config,
        timeZone,
        calendarDay
      )

      console.log(
        `[Apollo-${jobType}] Job ${job.id} execution ${
          punchResult.success ? 'succeeded' : 'failed'
        }.`
      )
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected job execution error.'

    status = JobStatus.FAILED
    success = false
    payload = {
      error: message,
    }

    console.error(
      `[Apollo-${jobType}] Job ${job.id} failed with error: ${message}`
    )
  } finally {
    await persistJobExecution(job.id, executedAt, status, payload, jobType)
  }

  return success
}

const processJobs = async (jobType: JobType): Promise<boolean> => {
  const now = new Date()
  const attendanceType = ATTENDANCE_TYPE_BY_JOB[jobType]
  const context = createExecutionContext()

  const jobs = await prisma.job.findMany({
    where: {
      type: jobType,
      isActive: true,
      OR: [{ expiredAt: null }, { expiredAt: { gt: now } }],
      NOT: {
        nextExecutionAt: null,
      },
      nextExecutionAt: {
        lte: now,
      },
    },
    include: { user: true },
    orderBy: { nextExecutionAt: 'asc' },
  })

  if (jobs.length === 0) {
    console.log(`[Apollo-${jobType}] No due jobs to process.`)
    return true
  }

  let hasFailure = false

  for (const job of jobs) {
    console.log(
      `[Apollo-${jobType}] Executing job ${job.id} for user ${job.userId}.`
    )

    const result = await executeJob(job, jobType, attendanceType, context)

    if (!result) {
      hasFailure = true
    }
  }

  return !hasFailure
}

const checkIn = async (): Promise<boolean> => processJobs(JobType.CHECK_IN)

const checkOut = async (): Promise<boolean> => processJobs(JobType.CHECK_OUT)

export { checkIn, checkOut }
