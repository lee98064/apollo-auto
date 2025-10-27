import type { Job, Prisma } from '@prisma/client'
import prisma from 'utils/prisma'
import { calculateNextExecutionAt } from 'utils/jobTime'

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
      let nextExecutionAt = calculateNextExecutionAt(
        job.startAt,
        job.endAt,
        now,
        timeZone
      )

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
