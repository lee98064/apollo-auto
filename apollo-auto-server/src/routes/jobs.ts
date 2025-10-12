import { Router } from 'express'
import JobController from 'controller/jobController'
import JobService from 'service/jobService'
import { isAuthenticated } from 'middleware/auth'
import prisma from 'utils/prisma'

const jobService = new JobService(prisma)
const jobController = new JobController(jobService)

const router = Router()

router.use(isAuthenticated)

router.get('/jobs', jobController.listJobs)
router.post('/jobs', jobController.createJob)
router.put('/jobs/:jobId', jobController.updateJob)

export default router
