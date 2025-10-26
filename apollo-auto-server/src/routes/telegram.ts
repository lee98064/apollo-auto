import { Router } from 'express'
import TelegramController from 'controller/telegramController'
import { isAuthenticated } from 'middleware/auth'
import TelegramService from 'service/telegramService'
import prisma from 'utils/prisma'

const telegramService = new TelegramService(prisma)
const telegramController = new TelegramController(telegramService)

const router = Router()

router.use(isAuthenticated)

router.get('/telegram/tokens', telegramController.listTokens)
router.post('/telegram/tokens', telegramController.createToken)
router.put('/telegram/tokens/:tokenId', telegramController.updateToken)
router.delete('/telegram/tokens/:tokenId', telegramController.deleteToken)
router.post(
  '/telegram/tokens/:tokenId/test',
  telegramController.sendTestMessage
)

export default router

