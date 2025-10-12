import { Router } from 'express'
import { handleExpressHandlerError } from 'middleware/errorHandler'
import AuthController from '../controller/authController'
import { isAuthenticated } from '../middleware/auth'
import AuthService from '../service/authService'
import prisma from '../utils/prisma'

const authService = new AuthService(prisma)

const authController = new AuthController(authService)

const router = Router()

router.post('/login', handleExpressHandlerError(authController.login))
router.delete(
  '/logout',
  isAuthenticated,
  handleExpressHandlerError(authController.logout)
)
router.post('/register', handleExpressHandlerError(authController.register))

export default router
