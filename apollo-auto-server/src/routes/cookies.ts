import { Router } from 'express'
import { handleExpressHandlerError } from 'middleware/errorHandler'
import CookieController from 'controller/cookieController'
import CookieService from 'service/cookieService'
import { isAuthenticated } from 'middleware/auth'
import prisma from 'utils/prisma'

const cookieService = new CookieService(prisma)
const cookieController = new CookieController(cookieService)

const router = Router()

router.use(isAuthenticated)

router.get('/cookies', handleExpressHandlerError(cookieController.getCookie))
router.put(
  '/cookies',
  handleExpressHandlerError(cookieController.upsertCookie)
)

export default router
