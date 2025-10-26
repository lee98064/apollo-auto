import type { Prisma, PrismaClient, TelegramToken } from '@prisma/client'
import { JobStatus, JobType } from '@prisma/client'
import { BadRequestError, NotFoundError } from 'dto/response'
import { sendTelegramMessage } from 'utils/telegram'

type CreateTokenInput = {
  userId: number
  name?: string | null
  botToken: string
  chatId: string
  isActive?: boolean
}

type UpdateTokenInput = {
  userId: number
  tokenId: number
  name?: string | null
  botToken?: string
  chatId?: string
  isActive?: boolean
}

type SendTestMessageInput = {
  userId: number
  tokenId: number
  message?: string | null
}

type NotifyJobExecutionInput = {
  userId: number
  jobId: number
  jobType: JobType
  status: JobStatus
  executedAt: Date
  timezone: string
  payload: unknown
}

const JOB_TYPE_LABELS: Record<JobType, string> = {
  CHECK_IN: '上班打卡',
  CHECK_OUT: '下班打卡',
}

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  SUCCESS: '成功',
  FAILED: '失敗',
  SKIPPED: '已跳過',
  PENDING: '待執行',
}

const SKIP_REASON_LABELS: Record<string, string> = {
  holiday: '假日',
  leave: '請假',
  'non-working-day': '非工作日',
}

const DEFAULT_TEST_MESSAGE = '這是一則測試訊息，確認 Telegram 通知設定成功。'

const sanitizeOptionalString = (
  value: string | null | undefined
): string | null => {
  if (typeof value === 'undefined' || value === null) {
    return null
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const sanitizeRequiredString = (value: string | undefined): string => {
  if (typeof value !== 'string') {
    throw new BadRequestError('值必須為字串。')
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new BadRequestError('內容不得為空。')
  }

  return trimmed
}

const formatDateTime = (date: Date, timeZone: string): string => {
  try {
    const formatter = new Intl.DateTimeFormat('zh-TW', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'medium',
    })
    return formatter.format(date)
  } catch {
    return date.toISOString()
  }
}

const extractDetailMessage = (
  status: JobStatus,
  payload: unknown
): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined
  }

  const data = payload as Record<string, unknown>

  if (status === JobStatus.SKIPPED) {
    const reasons = Array.isArray(data.reasons) ? data.reasons : []
    if (reasons.length === 0) {
      return '排程已跳過。'
    }
    const readableReasons = reasons
      .map((reason) => {
        if (typeof reason !== 'string') {
          return ''
        }
        return SKIP_REASON_LABELS[reason] ?? reason
      })
      .filter((reason) => reason.length > 0)
      .join('、')

    if (readableReasons.length === 0) {
      return '排程已跳過。'
    }

    return `排程已跳過（${readableReasons}）。`
  }

  if (status === JobStatus.FAILED) {
    if (typeof data.error === 'string' && data.error.length > 0) {
      return data.error
    }

    const punchResult = data.punchResult as Record<string, unknown> | undefined
    if (
      punchResult &&
      typeof punchResult.message === 'string' &&
      punchResult.message.length > 0
    ) {
      return punchResult.message
    }
    return '排程執行失敗，請檢查伺服器日誌。'
  }

  if (status === JobStatus.SUCCESS) {
    const punchResult = data.punchResult as Record<string, unknown> | undefined
    const messageParts: string[] = []

    if (
      punchResult &&
      typeof punchResult.locationName === 'string' &&
      punchResult.locationName.length > 0
    ) {
      messageParts.push(`地點：${punchResult.locationName}`)
    }

    if (
      punchResult &&
      typeof punchResult.message === 'string' &&
      punchResult.message.length > 0
    ) {
      messageParts.push(punchResult.message)
    }

    if (
      punchResult &&
      typeof punchResult.punchDate === 'string' &&
      punchResult.punchDate.length > 0
    ) {
      messageParts.push(`日期：${punchResult.punchDate}`)
    }

    return messageParts.join('；') || '排程執行成功。'
  }

  return undefined
}

const buildJobNotificationMessage = ({
  jobId,
  jobType,
  status,
  executedAt,
  timezone,
  payload,
}: NotifyJobExecutionInput): string => {
  const lines = [
    '[Apollo Auto 通知]',
    `排程：${JOB_TYPE_LABELS[jobType]} (#${jobId})`,
    `狀態：${JOB_STATUS_LABELS[status] ?? status}`,
    `執行時間：${formatDateTime(executedAt, timezone)} (${timezone})`,
  ]

  const detail = extractDetailMessage(status, payload)
  if (detail) {
    lines.push(`說明：${detail}`)
  }

  return lines.join('\n')
}

export default class TelegramService {
  constructor(private readonly prisma: PrismaClient) {}

  async listTokens(userId: number): Promise<TelegramToken[]> {
    return this.prisma.telegramToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createToken({
    userId,
    name,
    botToken,
    chatId,
    isActive,
  }: CreateTokenInput): Promise<TelegramToken> {
    const sanitizedBotToken = sanitizeRequiredString(botToken)
    const sanitizedChatId = sanitizeRequiredString(chatId)
    const sanitizedName = sanitizeOptionalString(name)

    return this.prisma.telegramToken.create({
      data: {
        userId,
        name: sanitizedName,
        botToken: sanitizedBotToken,
        chatId: sanitizedChatId,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    })
  }

  private async getTokenForUser(
    userId: number,
    tokenId: number
  ): Promise<TelegramToken> {
    const token = await this.prisma.telegramToken.findUnique({
      where: { id: tokenId },
    })

    if (!token || token.userId !== userId) {
      throw new NotFoundError('找不到指定的 Telegram Token。')
    }

    return token
  }

  async updateToken({
    userId,
    tokenId,
    name,
    botToken,
    chatId,
    isActive,
  }: UpdateTokenInput): Promise<TelegramToken> {
    const existingToken = await this.getTokenForUser(userId, tokenId)

    const updateData: Prisma.TelegramTokenUpdateInput = {}

    if (typeof name !== 'undefined') {
      updateData.name = sanitizeOptionalString(name)
    }

    if (typeof botToken !== 'undefined') {
      updateData.botToken = sanitizeRequiredString(botToken)
    }

    if (typeof chatId !== 'undefined') {
      updateData.chatId = sanitizeRequiredString(chatId)
    }

    if (typeof isActive !== 'undefined') {
      updateData.isActive = isActive
    }

    if (Object.keys(updateData).length === 0) {
      return existingToken
    }

    return this.prisma.telegramToken.update({
      where: { id: tokenId },
      data: updateData,
    })
  }

  async deleteToken(userId: number, tokenId: number): Promise<void> {
    await this.getTokenForUser(userId, tokenId)
    await this.prisma.telegramToken.delete({
      where: { id: tokenId },
    })
  }

  async sendTestMessage({
    userId,
    tokenId,
    message,
  }: SendTestMessageInput): Promise<void> {
    const token = await this.getTokenForUser(userId, tokenId)
    const text =
      typeof message === 'string' && message.trim().length > 0
        ? message.trim()
        : DEFAULT_TEST_MESSAGE

    await sendTelegramMessage(token.botToken, token.chatId, text)
  }

  async notifyJobExecution(
    input: NotifyJobExecutionInput
  ): Promise<void> {
    const tokens = await this.prisma.telegramToken.findMany({
      where: {
        userId: input.userId,
        isActive: true,
      },
    })

    if (tokens.length === 0) {
      return
    }

    const message = buildJobNotificationMessage(input)

    const results = await Promise.allSettled(
      tokens.map((token) =>
        sendTelegramMessage(token.botToken, token.chatId, message)
      )
    )

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `[Apollo-Telegram] Failed to notify Telegram chat for token ${tokens[index].id}:`,
          result.reason instanceof Error ? result.reason.message : result.reason
        )
      }
    })
  }
}
