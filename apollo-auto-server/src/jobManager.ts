import schedule from 'node-schedule'
import { setJobStatus } from './service/jobs/jobStatue'
import { checkIn, checkOut } from './service/jobs/punch'
import { refreshApolloCookies } from './service/jobs/refreshApolloCookies'
import env from './utils/env'

class JobManager {
  private scheduledJobs = []

  private jobStatus = new Map<string, boolean>()

  constructor() {
    this.scheduleJob('SET_JOB_STATUS', '*/1 * * * * *', setJobStatus)
    this.scheduleJob('CHECK_IN', env.CHECK_IN_JOB_SCHEDULE, checkIn)
    this.scheduleJob('CHECK_OUT', env.CHECK_IN_JOB_SCHEDULE, checkOut)
    this.scheduleJob(
      'REFRESH_APOLLO_COOKIES',
      env.COOKIE_REFRESH_JOB_SCHEDULE,
      refreshApolloCookies
    )

    void this.bootstrapJobs()
  }

  async scheduleJob(
    key: string,
    scheduleTime: string,
    task: () => Promise<boolean>,
    runMultiple: boolean = false
  ) {
    this.jobStatus.set(key, false)
    const job = schedule.scheduleJob(scheduleTime, async () => {
      if (this.jobStatus.get(key) && !runMultiple) {
        return
      }
      this.jobStatus.set(key, true)
      try {
        const taskResult = await task()

        if (!taskResult) {
          throw new Error(`Task ${key} failed.`)
        }
      } catch (error) {
        console.error(
          `[Apollo-Scheduler] Error during job ${key} execution: ${error}`
        )
      } finally {
        this.jobStatus.set(key, false)
      }
    })
    this.scheduledJobs.push({ key, job })

    return job
  }

  private async bootstrapJobs(): Promise<void> {
    const startupOrder = ['REFRESH_APOLLO_COOKIES']

    for (const key of startupOrder) {
      try {
        const executed = await this.execute(key)
        if (!executed) {
          console.warn(
            `[Apollo-Scheduler] Startup execution skipped for ${key}.`
          )
        }
      } catch (error) {
        console.error(
          `[Apollo-Scheduler] Failed to bootstrap job ${key}:`,
          error instanceof Error ? error.message : error
        )
      }
    }
  }

  async execute(key: string): Promise<boolean> {
    const scheduledJob = this.scheduledJobs.find((job) => job.key === key)

    if (!scheduledJob) {
      console.error(`[Apollo-Scheduler] Job ${key} not found.`)
      throw new Error(`Job ${key} not found.`)
    }

    if (this.jobStatus.get(key)) {
      return false
    }

    try {
      await scheduledJob.job.invoke()

      return true
    } catch (error) {
      console.error(
        `[Apollo-Scheduler] Error during manual job ${key} execution: ${
          error instanceof Error ? error.message : error
        }`
      )

      return false
    }
  }
}

export default JobManager
