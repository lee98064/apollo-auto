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
  data?: string | null
}

type UpdateJobInput = {
  userId: number
  jobId: number
  type?: JobType
  startAt?: Date
  endAt?: Date | null
  isActive?: boolean
  expiredAt?: Date | null
  data?: string | null
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
    data,
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
        data: data ?? null,
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
    data,
  }: UpdateJobInput): Promise<Job> {
    const existingJob = await this.prisma.job.findUnique({
      where: { id: jobId },
    })

    if (!existingJob || existingJob.userId !== userId) {
      throw new NotFoundError('Job not found.')
    }

    const updateData: Prisma.JobUpdateInput = {}

    if (typeof type !== 'undefined') {
      updateData.type = type
    }

    if (typeof startAt !== 'undefined') {
      updateData.startAt = startAt
      updateData.nextExecutionAt = startAt
    }

    if (typeof endAt !== 'undefined') {
      updateData.endAt = endAt ?? null
    }

    if (typeof isActive !== 'undefined') {
      updateData.isActive = isActive
    }

    if (typeof expiredAt !== 'undefined') {
      updateData.expiredAt = expiredAt ?? null
    }

    if (typeof data !== 'undefined') {
      updateData.data = data ?? null
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: updateData,
    })
  }
}
