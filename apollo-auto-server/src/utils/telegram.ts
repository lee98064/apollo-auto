const TELEGRAM_API_BASE_URL = 'https://api.telegram.org'
const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000

type TelegramSendMessageResponse = {
  ok: boolean
  description?: string
}

const buildTelegramUrl = (botToken: string, method: string): string => {
  if (!botToken || !method) {
    throw new Error('Telegram bot token and method are required.')
  }

  return `${TELEGRAM_API_BASE_URL}/bot${botToken}/${method}`
}

export const sendTelegramMessage = async (
  botToken: string,
  chatId: string,
  text: string
): Promise<void> => {
  const url = buildTelegramUrl(botToken, 'sendMessage')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
      signal: controller.signal,
    })

    const result = (await response.json()) as TelegramSendMessageResponse

    if (!response.ok || !result.ok) {
      throw new Error(result.description || 'Telegram API request failed.')
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Telegram API request timed out.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

