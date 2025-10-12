import { Router } from 'express'
import AuthController from '../controller/authController'
import { isAuthenticated } from '../middleware/auth'
import AuthService from '../service/authService'
import prisma from '../utils/prisma'

const authService = new AuthService(prisma)

const authController = new AuthController(authService)

const router = Router()

router.post('/login', authController.login)
router.delete(
  '/logout',
  isAuthenticated,
  authController.logout
)
router.post('/register', authController.register)

export default router
