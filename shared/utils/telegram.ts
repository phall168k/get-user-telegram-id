export interface TelegramUser { id: number; is_bot?: boolean; first_name: string; last_name?: string; username?: string; language_code?: string }
export interface TelegramRow { userId: string; chatId: string; firstName: string; lastName: string; username: string; language: string; chatType: string; chatName: string }
export function extractUsers(updates: Record<string, any>[]): TelegramRow[] {
  const rows = new Map<string, TelegramRow>()
  const add = (user: TelegramUser | undefined, chat?: Record<string, any>) => {
    if (!user || user.is_bot) return
    const row = { userId: String(user.id), chatId: chat ? String(chat.id) : '', firstName: user.first_name, lastName: user.last_name || '', username: user.username || '', language: user.language_code || '', chatType: chat?.type || '', chatName: chat?.title || [chat?.first_name, chat?.last_name].filter(Boolean).join(' ') }
    rows.set(`${row.userId}:${row.chatId}`, row)
  }
  for (const update of updates) {
    for (const key of ['message', 'edited_message', 'channel_post', 'edited_channel_post', 'business_message', 'edited_business_message']) {
      const message = update[key]
      if (message) { add(message.from, message.chat); for (const user of message.new_chat_members || []) add(user, message.chat) }
    }
    if (update.callback_query) add(update.callback_query.from, update.callback_query.message?.chat)
    for (const key of ['my_chat_member', 'chat_member', 'chat_join_request', 'message_reaction']) {
      const item = update[key]
      if (item) { add(item.from || item.user, item.chat); add(item.new_chat_member?.user, item.chat) }
    }
    for (const key of ['inline_query', 'chosen_inline_result', 'shipping_query', 'pre_checkout_query', 'purchased_paid_media']) add(update[key]?.from)
  }
  return [...rows.values()]
}
