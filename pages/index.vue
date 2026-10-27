<script lang="ts" setup>
import type { TelegramRow } from '~/shared/utils/telegram'
import { Download, Search, Connection } from '@element-plus/icons-vue'

const botToken = ref('')
const users = ref<TelegramRow[]>([])
const bot = ref<{ id: string; name: string; username: string } | null>(null)
const activeToken = ref('')
const loading = ref(false)
const exporting = ref(false)
const fetched = ref(false)
const error = ref('')
const search = ref('')
const lastFetched = ref('')
const updateCount = ref(0)
const filteredUsers = computed(() => {
  const query = search.value.trim().toLowerCase()
  return users.value.filter(user => Object.values(user).some(value => value.toLowerCase().includes(query)))
})
watch(botToken, () => {
  users.value = []; bot.value = null; activeToken.value = ''; fetched.value = false; error.value = ''; lastFetched.value = ''; search.value = ''
})
async function handleGetUsers() {
  const token = botToken.value.trim()
  if (!token) { error.value = 'Enter your bot token to continue.'; return }
  loading.value = true; error.value = ''
  try {
    const result = await $fetch('/api/telegram/users', { method: 'POST', body: { token } })
    if (token !== botToken.value.trim()) return
    const merged = new Map((activeToken.value === token ? users.value : []).map(user => [`${user.userId}:${user.chatId}`, user]))
    for (const user of result.users) merged.set(`${user.userId}:${user.chatId}`, user)
    users.value = [...merged.values()]
    bot.value = result.bot; activeToken.value = token; fetched.value = true
    updateCount.value = result.updateCount; lastFetched.value = new Date().toLocaleString()
  } catch (err: any) {
    if (token === botToken.value.trim()) error.value = err.data?.statusMessage || 'Could not fetch users. Please try again.'
  } finally { loading.value = false }
}
async function exportExcel() {
  exporting.value = true
  try {
    const { Workbook } = await import('exceljs')
    const workbook = new Workbook()
    const sheet = workbook.addWorksheet('Telegram users')
    sheet.columns = [
      { header: 'User ID', key: 'userId', width: 22 }, { header: 'Chat ID', key: 'chatId', width: 22 },
      { header: 'First name', key: 'firstName', width: 24 }, { header: 'Last name', key: 'lastName', width: 24 },
      { header: 'Username', key: 'username', width: 24 }, { header: 'Language', key: 'language', width: 14 },
      { header: 'Chat type', key: 'chatType', width: 16 }, { header: 'Chat name', key: 'chatName', width: 28 },
    ]
    sheet.addRows(filteredUsers.value.map(user => ({ ...user })))
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.autoFilter = 'A1:H1'
    const buffer = await workbook.xlsx.writeBuffer()
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const link = document.createElement('a')
    link.href = url; link.download = `telegram-users-${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch { ElMessage.error('Excel export failed. Please try again.') }
  finally { exporting.value = false }
}
</script>

<template>
  <main class="dashboard">
    <header class="page-header">
      <div class="brand"><span class="brand-icon">↗</span> Telegram contacts</div>
      <span class="privacy-label">Token stays in this session</span>
    </header>
    <section class="intro">
      <div class="eyebrow">BOT EXPLORER</div>
      <h1>Your Telegram users,<br>in one place.</h1>
      <p>Find user names and chat IDs from your bot’s recent interactions, then export them to Excel.</p>
    </section>
    <section class="panel connection-panel">
      <div class="section-title"><h2>Connect your bot</h2><span>01</span></div>
      <label for="bot-token">Telegram bot token</label>
      <form class="connect-form" @submit.prevent="handleGetUsers">
        <el-input id="bot-token" v-model="botToken" type="password" show-password placeholder="Paste your token from @BotFather" size="large" autocomplete="off" :disabled="loading" />
        <el-button type="primary" size="large" :icon="Connection" :loading="loading" native-type="submit">{{ fetched ? 'Refresh users' : 'Fetch users' }}</el-button>
      </form>
      <p class="help">Ask users to open your bot and send /start before fetching. Your token is never saved to browser storage.</p>
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="notice" />
      <div v-if="bot" class="connected">● Connected to {{ bot.name }} <span v-if="bot.username">@{{ bot.username }}</span></div>
    </section>
    <section class="panel users-panel" v-loading="loading">
      <div class="table-toolbar">
        <div><h2>Bot users <span class="count">{{ users.length }}</span></h2><p>{{ lastFetched ? `Last fetched ${lastFetched}` : 'Connect a bot to discover its users' }}</p></div>
        <el-button :icon="Download" :disabled="!filteredUsers.length || loading" :loading="exporting" @click="exportExcel">Export Excel</el-button>
      </div>
      <el-input v-model="search" :prefix-icon="Search" placeholder="Search by name, username, user ID or chat ID" clearable class="search" :disabled="!users.length" />
      <el-table v-if="users.length" :data="filteredUsers" stripe empty-text="No users match your search." style="width: 100%">
        <el-table-column label="Name" min-width="180"><template #default="{ row }"><strong>{{ row.firstName }} {{ row.lastName }}</strong></template></el-table-column>
        <el-table-column label="Username" min-width="160"><template #default="{ row }">{{ row.username ? `@${row.username}` : '—' }}</template></el-table-column>
        <el-table-column prop="userId" label="User ID" min-width="155" />
        <el-table-column label="Chat ID" min-width="165"><template #default="{ row }">{{ row.chatId || 'Unavailable' }}</template></el-table-column>
        <el-table-column label="Chat" min-width="170"><template #default="{ row }">{{ row.chatName || '—' }}<div class="chat-type">{{ row.chatType }}</div></template></el-table-column>
      </el-table>
      <el-empty v-else :description="fetched ? 'No users found in recent updates. Send your bot a message and refresh.' : 'Your bot’s users will appear here'" :image-size="90" />
      <div v-if="users.length" class="table-footer">Showing {{ filteredUsers.length }} of {{ users.length }} user/chat records · Export includes the current search results.</div>
      <el-alert v-if="fetched && updateCount === 100" title="Telegram returned the first 100 pending updates. More updates may exist; this view does not advance or consume the bot’s update queue." type="warning" :closable="false" class="notice" />
    </section>
    <p class="footnote">Telegram only retains pending updates for up to 24 hours. This is not a full subscriber list. Existing webhooks or other polling clients can prevent fetching. Results accumulate in this tab until you change the token or reload. A person may have multiple chat records; group chat IDs are different from user IDs.</p>
  </main>
</template>

<style>
body { margin: 0; background: #f5f7fb; color: #1b2b43; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
* { box-sizing: border-box; }
.dashboard { max-width: 1150px; margin: 0 auto; padding: 0 32px 40px; }
.page-header { height: 88px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; gap: 16px; }
.brand { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 650; }
.brand-icon { background: #2563eb; color: white; width: 34px; height: 34px; border-radius: 10px; text-align: center; line-height: 34px; font-size: 26px; }
.privacy-label, .help, .footnote, .table-toolbar p, .table-footer { color: #718096; font-size: 13px; }
.intro { padding: 48px 0 30px; }
.eyebrow { font-size: 11px; letter-spacing: 2px; color: #2563eb; font-weight: 700; }
h1 { font-size: clamp(30px, 4vw, 44px); line-height: 1.15; margin: 14px 0; font-weight: 700; letter-spacing: -1.5px; }
.intro p { color: #64748b; line-height: 1.7; max-width: 570px; }
.panel { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 26px; margin-bottom: 22px; box-shadow: 0 3px 12px #1b2b4303; }
h2 { font-size: 17px; margin: 0; font-weight: 650; }
.section-title { display: flex; justify-content: space-between; margin-bottom: 24px; }
.section-title > span { color: #94a3b8; font-size: 13px; }
label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 9px; }
.connect-form { display: flex; gap: 12px; }
.connect-form .el-button { min-width: 160px; }
.help { margin: 12px 0 0; line-height: 1.6; }
.connected { color: #16805d; margin-top: 18px; font-size: 13px; }
.connected span { color: #64748b; margin-left: 8px; }
.table-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 22px; }
.table-toolbar p { margin: 8px 0 0; }
.count { font-size: 12px; margin-left: 8px; background: #edf2ff; color: #2563eb; padding: 3px 9px; border-radius: 20px; }
.search { max-width: 430px; margin-bottom: 20px; }
.chat-type { color: #94a3b8; font-size: 12px; }
.table-footer { margin-top: 18px; line-height: 1.6; }
.footnote { max-width: 900px; line-height: 1.8; margin: 0 auto; text-align: center; }
.notice { margin-top: 18px; }
:root { --el-color-primary: #2563eb; --el-border-radius-base: 7px; }
@media (max-width: 640px) { .dashboard { padding: 0 16px 28px; } .privacy-label { display: none; } .intro { padding-top: 32px; } .panel { padding: 18px; } .connect-form { flex-direction: column; } .table-toolbar { align-items: flex-start; } .table-toolbar .el-button { margin-top: 0; } }
</style>
