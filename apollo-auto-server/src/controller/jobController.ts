import type { JobType } from '@prisma/client'
import {
  BadRequestError,
  createSuccessResponse,
  UnauthorizedError,
} from 'dto/response'
import type { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import type JobService from 'service/jobService'

type CreateJobRequestBody = {
  type: JobType
  startAt: string
  endAt?: string | null
  isActive?: boolean
  expiredAt?: string | null
}

type UpdateJobRequestBody = Partial<CreateJobRequestBody>

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

    const { type, startAt, endAt, isActive, expiredAt } = req.body

    const job = await this.jobService.createJob({
      userId: user.id,
      type,
      startAt: parseDate(startAt, 'startAt'),
      endAt: parseOptionalDate(endAt, 'endAt'),
      isActive,
      expiredAt: parseOptionalDate(expiredAt, 'expiredAt'),
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

    const jobId = Number.parseInt(req.params.jobId, 10)
    if (Number.isNaN(jobId)) {
      throw new BadRequestError('Invalid job id.')
    }

    const { type, startAt, endAt, isActive, expiredAt } = req.body

    if (
      typeof type === 'undefined' &&
      typeof startAt === 'undefined' &&
      typeof endAt === 'undefined' &&
      typeof isActive === 'undefined' &&
      typeof expiredAt === 'undefined'
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
          : parseDate(startAt, 'startAt'),
      endAt: parseOptionalDate(endAt, 'endAt'),
      isActive,
      expiredAt: parseOptionalDate(expiredAt, 'expiredAt'),
    })

    res.json(
      createSuccessResponse({
        job,
      })
    )
  }
}
