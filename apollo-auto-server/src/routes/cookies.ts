import { Router } from 'express'
import CookieController from 'controller/cookieController'
import CookieService from 'service/cookieService'
import { isAuthenticated } from 'middleware/auth'
import prisma from 'utils/prisma'

const cookieService = new CookieService(prisma)
const cookieController = new CookieController(cookieService)

const router = Router()

router.use(isAuthenticated)

router.get('/cookies', cookieController.getCookie)
router.put('/cookies', cookieController.upsertCookie)

export default router
