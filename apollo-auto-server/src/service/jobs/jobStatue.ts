import type { Job, Prisma } from '@prisma/client'
import prisma from 'utils/prisma'

type TimeOfDay = {
  hours: number
  minutes: number
  seconds: number
}

const extractTimeOfDay = (date: Date): TimeOfDay => ({
  hours: date.getHours(),
  minutes: date.getMinutes(),
  seconds: date.getSeconds(),
})

const toSecondsOfDay = ({ hours, minutes, seconds }: TimeOfDay): number =>
  hours * 3600 + minutes * 60 + seconds

const buildFutureDateFromSeconds = (
  secondsOfDay: number,
  reference: Date
): Date => {
  const candidate = new Date(reference)
  candidate.setHours(0, 0, 0, 0)
  candidate.setSeconds(secondsOfDay, 0)

  if (candidate <= reference) {
    candidate.setDate(candidate.getDate() + 1)
  }

  return candidate
}

const calculateNextExecutionAt = (job: Job, now: Date): Date => {
  const startSeconds = toSecondsOfDay(extractTimeOfDay(job.startAt))
  const endSeconds = job.endAt
    ? toSecondsOfDay(extractTimeOfDay(job.endAt))
    : null
  const secondsPerDay = 24 * 60 * 60

  if (endSeconds !== null && endSeconds > startSeconds) {
    const range = endSeconds - startSeconds
    const offset = Math.floor(Math.random() * (range + 1))

    return buildFutureDateFromSeconds(startSeconds + offset, now)
  }

  if (endSeconds !== null && endSeconds < startSeconds) {
    const range = secondsPerDay - startSeconds + endSeconds
    const offset = Math.floor(Math.random() * (range + 1))
    const targetSeconds = (startSeconds + offset) % secondsPerDay

    return buildFutureDateFromSeconds(targetSeconds, now)
  }

  return buildFutureDateFromSeconds(startSeconds, now)
}

// const shouldUpdateJob = (job: Job, now: Date): boolean =>
//   job.nextExecutionAt <= now

type ActiveJob = Prisma.JobGetPayload<{
  include: { user: { select: { timezone: true } } }
}>

const DEFAULT_TIMEZONE = 'UTC'

const formatDateKey = (date: Date, timeZone: string): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(date)
}

const hasExecutedToday = (job: ActiveJob, now: Date): boolean => {
  if (!job.lastExecutedAt) {
    return false
  }

  const timeZone = job.user?.timezone ?? DEFAULT_TIMEZONE

  return (
    formatDateKey(job.lastExecutedAt, timeZone) ===
    formatDateKey(now, timeZone)
  )
}

const isSameDay = (target: Date, reference: Date, timeZone: string): boolean =>
  formatDateKey(target, timeZone) === formatDateKey(reference, timeZone)

const setJobStatus = async (): Promise<boolean> => {
  const now = new Date()
  const activeJobs = await prisma.job.findMany({
    where: {
      isActive: true,
      nextExecutionAt: null,
    },
    include: {
      user: {
        select: { timezone: true },
      },
    },
  })

  const updates = await Promise.all(
    activeJobs.map(async (job) => {
      const timeZone = job.user?.timezone ?? DEFAULT_TIMEZONE
      const alreadyExecutedToday = hasExecutedToday(job, now)
      let nextExecutionAt = calculateNextExecutionAt(job, now)

      if (alreadyExecutedToday) {
        const adjustedExecution = new Date(nextExecutionAt)

        while (isSameDay(adjustedExecution, now, timeZone)) {
          adjustedExecution.setDate(adjustedExecution.getDate() + 1)
        }

        nextExecutionAt = adjustedExecution
      }

      await prisma.job.update({
        where: { id: job.id },
        data: { nextExecutionAt },
      })

      return job.id
    })
  )

  if (updates.length > 0) {
    console.log(
      `[Apollo-CheckIn] Set job status task executed. Updated jobs: ${updates.join(
        ', '
      )}.`
    )
  }

  return true
}

export { setJobStatus }
