import schedule from "node-schedule"
import getPrunchData from "./service/jobs/checkIn"
import env from "./utils/env"

class JobManager {
	private scheduledJobs = []

	private jobStatus = new Map<string, boolean>()

	constructor() {
		this.scheduleJob("CHECK_IN", env.CHECK_IN_JOB_SCHEDULE, getPrunchData)
    console.log('[Apollo-JobManager] Job Manager initialized and jobs scheduled.')
	}

	async scheduleJob(
		key: string,
		scheduleTime: string,
		task: () => Promise<boolean>,
		runMultiple: boolean = false,
	) {
		this.jobStatus.set(key, false)
		const job = schedule.scheduleJob(scheduleTime, async () => {
			if (this.jobStatus.get(key) && !runMultiple) {
				console.info(
					`[Apollo-Scheduler] Job ${key} is already running, skipping this execution.`,
				)

				return
			}
			this.jobStatus.set(key, true)
			try {
				console.info(`[Apollo-Scheduler] Job ${key} started.`)

				const taskResult = await task()

				if (!taskResult) {
					throw new Error(`Task ${key} failed.`)
				}

				console.info(`[Apollo-Scheduler] Job ${key} finished.`)
			} catch (error) {
				console.error(
					`[Apollo-Scheduler] Error during job ${key} execution: ${error.message}`,
				)
			} finally {
				this.jobStatus.set(key, false)
			}
		})
		this.scheduledJobs.push({ key, job })

		return job
	}

	async execute(key: string): Promise<boolean> {
		const scheduledJob = this.scheduledJobs.find((job) => job.key === key)

		if (!scheduledJob) {
			console.error(`[Apollo-Scheduler] Job ${key} not found.`)
			throw new Error(`Job ${key} not found.`)
		}

		if (this.jobStatus.get(key)) {
			console.info(
				`[Apollo-Scheduler] Job ${key} is already running, skipping manual execution.`,
			)

			return false
		}

		this.jobStatus.set(key, true)
		try {
			console.info(`[Apollo-Scheduler] Manually executing job ${key}.`)
			await scheduledJob.job.invoke()

			return true
		} catch (error) {
			console.error(
				`[Apollo-Scheduler] Error during manual job ${key} execution: ${error.message}`,
			)

			return false
		} finally {
			this.jobStatus.set(key, false)
		}
	}
}

export default JobManager
