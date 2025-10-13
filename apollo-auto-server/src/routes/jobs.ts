import JobController from 'controller/jobController'
import { Router } from 'express'
import { isAuthenticated } from 'middleware/auth'
import JobService from 'service/jobService'
import prisma from 'utils/prisma'

const jobService = new JobService(prisma)
const jobController = new JobController(jobService)

const router = Router()

router.use(isAuthenticated)

router.get('/jobs', jobController.listJobs)
router.post('/jobs', jobController.createJob)
router.put('/jobs/:jobId', jobController.updateJob)

export default router
