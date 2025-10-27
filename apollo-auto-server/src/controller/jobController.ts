import type { JobType } from '@prisma/client'
import { BadRequestError, createSuccessResponse } from 'dto/response'
import type { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import type JobService from 'service/jobService'
import { validateTimeString } from 'utils/jobTime'

type CreateJobRequestBody = {
  type: JobType
  startAt: string
  endAt?: string | null
  isActive?: boolean
  expiredAt?: string | null
  data?: unknown
}

type UpdateJobRequestBody = Partial<CreateJobRequestBody>

const parseJobId = (value: string | undefined): number => {
  const jobId = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(jobId)) {
    throw new BadRequestError('Invalid job id.')
  }
  return jobId
}

const parseTime = (value: string, field: string): string => {
  const trimmed = value.trim()

  try {
    validateTimeString(trimmed)
    return trimmed
  } catch {
    throw new BadRequestError(`Invalid ${field} value. Expected HH:mm.`)
  }
}

const parseOptionalTime = (
  value: string | null | undefined,
  field: string
): string | null | undefined => {
  if (typeof value === 'undefined') {
    return undefined
  }

  if (value === null) {
    return null
  }

  return parseTime(value, field)
}

const parseDate = (value: string, field: string): Date => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestError(`Invalid ${field} value.`)
  }
  return parsed
}

const parseOptionalDate = (
  value: string | null | undefined,
  field: string
): Date | null | undefined => {
  if (typeof value === 'undefined') {
    return undefined
  }

  if (value === null) {
    return null
  }

  return parseDate(value, field)
}

const parseData = (value: unknown): string | null | undefined => {
  if (typeof value === 'undefined') {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    const serialized = JSON.stringify(value)
    if (typeof serialized !== 'string') {
      throw new Error('Serialization failed')
    }
    return serialized
  } catch {
    throw new BadRequestError('Invalid data value.')
  }
}

export default class JobController {
  constructor(private readonly jobService: JobService) {}

  listJobs = async (req: Request, res: Response) => {
    const user = req.user

    const jobs = await this.jobService.listJobs(user.id)

    res.json(
      createSuccessResponse({
        jobs,
      })
    )
  }

  createJob = async (
    req: Request<unknown, unknown, CreateJobRequestBody>,
    res: Response
  ) => {
    const user = req.user

    const { type, startAt, endAt, isActive, expiredAt, data } = req.body

    const job = await this.jobService.createJob({
      userId: user.id,
      type,
      startAt: parseTime(startAt, 'startAt'),
      endAt: parseOptionalTime(endAt, 'endAt'),
      isActive,
      expiredAt: parseOptionalDate(expiredAt, 'expiredAt'),
      data: parseData(data),
    })

    res.status(StatusCodes.CREATED).json(
      createSuccessResponse({
        job,
      })
    )
  }

  updateJob = async (
    req: Request<{ jobId: string }, unknown, UpdateJobRequestBody>,
    res: Response
  ) => {
    const user = req.user

    const jobId = parseJobId(req.params.jobId)

    const { type, startAt, endAt, isActive, expiredAt, data } = req.body

    if (
      typeof type === 'undefined' &&
      typeof startAt === 'undefined' &&
      typeof endAt === 'undefined' &&
      typeof isActive === 'undefined' &&
      typeof expiredAt === 'undefined' &&
      typeof data === 'undefined'
    ) {
      throw new BadRequestError('No fields provided for update.')
    }

    const job = await this.jobService.updateJob({
      userId: user.id,
      jobId,
      type,
      startAt:
        typeof startAt === 'undefined'
          ? undefined
          : parseTime(startAt, 'startAt'),
      endAt: parseOptionalTime(endAt, 'endAt'),
      isActive,
      expiredAt: parseOptionalDate(expiredAt, 'expiredAt'),
      data: parseData(data),
    })

    res.json(
      createSuccessResponse({
        job,
      })
    )
  }

  deleteJob = async (
    req: Request<{ jobId: string }>,
    res: Response
  ) => {
    const user = req.user
    const jobId = parseJobId(req.params.jobId)

    await this.jobService.deleteJob({
      userId: user.id,
      jobId,
    })

    res.json(createSuccessResponse({ deleted: true }))
  }
}
