import type {
  Job,
  JobType,
  Prisma,
  PrismaClient,
} from '@prisma/client'
import { NotFoundError } from 'dto/response'

type CreateJobInput = {
  userId: number
  type: JobType
  startAt: Date
  endAt?: Date | null
  isActive?: boolean
  expiredAt?: Date | null
}

type UpdateJobInput = {
  userId: number
  jobId: number
  type?: JobType
  startAt?: Date
  endAt?: Date | null
  isActive?: boolean
  expiredAt?: Date | null
}

export default class JobService {
  constructor(private readonly prisma: PrismaClient) {}

  async listJobs(userId: number): Promise<Job[]> {
    return this.prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createJob({
    userId,
    type,
    startAt,
    endAt,
    isActive,
    expiredAt,
  }: CreateJobInput): Promise<Job> {
    return this.prisma.job.create({
      data: {
        userId,
        type,
        startAt,
        endAt: endAt ?? null,
        isActive: isActive ?? true,
        expiredAt: expiredAt ?? null,
        nextExecutionAt: startAt,
      },
    })
  }

  async updateJob({
    userId,
    jobId,
    type,
    startAt,
    endAt,
    isActive,
    expiredAt,
  }: UpdateJobInput): Promise<Job> {
    const existingJob = await this.prisma.job.findUnique({
      where: { id: jobId },
    })

    if (!existingJob || existingJob.userId !== userId) {
      throw new NotFoundError('Job not found.')
    }

    const data: Prisma.JobUpdateInput = {}

    if (typeof type !== 'undefined') {
      data.type = type
    }

    if (typeof startAt !== 'undefined') {
      data.startAt = startAt
      data.nextExecutionAt = startAt
    }

    if (typeof endAt !== 'undefined') {
      data.endAt = endAt ?? null
    }

    if (typeof isActive !== 'undefined') {
      data.isActive = isActive
    }

    if (typeof expiredAt !== 'undefined') {
      data.expiredAt = expiredAt ?? null
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data,
    })
  }
}
