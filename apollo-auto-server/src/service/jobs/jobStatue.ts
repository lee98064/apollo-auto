import type { Job } from '@prisma/client'
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

const setJobStatus = async (): Promise<boolean> => {
  const now = new Date()
  const activeJobs = await prisma.job.findMany({
    where: {
      isActive: true,
      nextExecutionAt: null,
    },
  })

  const updates = await Promise.all(
    activeJobs.map(async (job) => {
      const nextExecutionAt = calculateNextExecutionAt(job, now)

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
