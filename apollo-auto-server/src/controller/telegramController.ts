import { BadRequestError, createSuccessResponse } from 'dto/response'
import type { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import type TelegramService from 'service/telegramService'

type CreateTelegramTokenBody = {
  name?: string | null
  botToken: string
  chatId: string
  isActive?: boolean
}

type UpdateTelegramTokenBody = Partial<CreateTelegramTokenBody>

type SendTestMessageBody = {
  message?: string | null
}

const parseTokenId = (value: string | undefined): number => {
  const tokenId = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(tokenId) || tokenId <= 0) {
    throw new BadRequestError('Token ID 無效。')
  }
  return tokenId
}

export default class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  listTokens = async (req: Request, res: Response) => {
    const user = req.user

    const tokens = await this.telegramService.listTokens(user.id)

    res.json(
      createSuccessResponse({
        tokens,
      })
    )
  }

  createToken = async (
    req: Request<unknown, unknown, CreateTelegramTokenBody>,
    res: Response
  ) => {
    const user = req.user
    const { name, botToken, chatId, isActive } = req.body

    const token = await this.telegramService.createToken({
      userId: user.id,
      name,
      botToken,
      chatId,
      isActive,
    })

    res.status(StatusCodes.CREATED).json(
      createSuccessResponse({
        token,
      })
    )
  }

  updateToken = async (
    req: Request<{ tokenId: string }, unknown, UpdateTelegramTokenBody>,
    res: Response
  ) => {
    const user = req.user
    const tokenId = parseTokenId(req.params.tokenId)
    const { name, botToken, chatId, isActive } = req.body

    const token = await this.telegramService.updateToken({
      userId: user.id,
      tokenId,
      name,
      botToken,
      chatId,
      isActive,
    })

    res.json(
      createSuccessResponse({
        token,
      })
    )
  }

  deleteToken = async (req: Request<{ tokenId: string }>, res: Response) => {
    const user = req.user
    const tokenId = parseTokenId(req.params.tokenId)

    await this.telegramService.deleteToken(user.id, tokenId)

    res.json(createSuccessResponse({ deleted: true }))
  }

  sendTestMessage = async (
    req: Request<{ tokenId: string }, unknown, SendTestMessageBody>,
    res: Response
  ) => {
    const user = req.user
    const tokenId = parseTokenId(req.params.tokenId)
    const { message } = req.body

    // For debug
    try {
      await this.telegramService.sendTestMessage({
        userId: user.id,
        tokenId,
        message,
      })
    } catch (error) {
      console.log(error)
      throw new BadRequestError('發送測試消息失敗。')
    }

    res.json(createSuccessResponse({ sent: true }))
  }
}
