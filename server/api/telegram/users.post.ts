import { extractUsers } from '../../../shared/utils/telegram'
interface TelegramResponse<T> { ok: boolean; result: T; error_code?: number; description?: string }
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody(event)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) throw createError({ statusCode: 400, statusMessage: 'Enter a valid Telegram bot token.' })
  async function telegram<T>(method: string, data = {}): Promise<T> {
    let response: TelegramResponse<T>
    try {
      response = await $fetch<TelegramResponse<T>>(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', body: data, timeout: 15000, ignoreResponseError: true, retry: 0 })
    } catch {
      throw createError({ statusCode: 502, statusMessage: 'Unable to reach Telegram. Please try again.' })
    }
    if (!response.ok) {
      const code = response.error_code
      const message = code === 401 || code === 404 ? 'Invalid bot token. Check your token from BotFather.' : code === 409 ? 'Telegram polling is unavailable. Stop other polling clients and check the bot webhook.' : code === 429 ? 'Telegram rate limit reached. Please wait before trying again.' : 'Telegram could not complete the request.'
      throw createError({ statusCode: code === 401 || code === 404 ? 400 : 502, statusMessage: message })
    }
    return response.result
  }
  const bot = await telegram<{ id: number; first_name: string; username?: string }>('getMe')
  const webhook = await telegram<{ url: string }>('getWebhookInfo')
  if (webhook.url) throw createError({ statusCode: 409, statusMessage: 'This bot has an active webhook. getUpdates cannot run while it is active. Use a separate bot or remove the webhook in your bot configuration.' })
  // No offset: inspecting updates must not acknowledge them on behalf of another bot consumer.
  const updates = await telegram<Record<string, any>[]>('getUpdates', { limit: 100, timeout: 0 })
  return { bot: { id: String(bot.id), name: bot.first_name, username: bot.username || '' }, users: extractUsers(updates), updateCount: updates.length }
})
