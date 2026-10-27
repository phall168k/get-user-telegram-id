import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractUsers } from '../shared/utils/telegram.ts'
import ExcelJS from 'exceljs'

test('deduplicates interactions while keeping group chat IDs distinct', () => {
  const from = { id: 1234567890123, first_name: 'សុខ', username: 'sok' }
  const privateMessage = { from, chat: { id: from.id, type: 'private', first_name: 'សុខ' } }
  const rows = extractUsers([{ message: privateMessage }, { edited_message: privateMessage }, { message: { from, chat: { id: -1001234567890, type: 'supergroup', title: 'Team' } } }])
  assert.equal(rows.length, 2)
  assert.equal(rows[0].userId, '1234567890123')
  assert.equal(rows[1].chatId, '-1001234567890')
  assert.equal(rows[1].chatName, 'Team')
})
test('extracts callback and membership users, excludes bots, and handles missing chat', () => {
  const rows = extractUsers([{ callback_query: { from: { id: 1, first_name: 'Alice' } } }, { chat_member: { from: { id: 2, first_name: 'Bot', is_bot: true }, chat: { id: -5, type: 'group' }, new_chat_member: { user: { id: 3, first_name: 'Bob' } } } }])
  assert.equal(rows.length, 2)
  assert.equal(rows[0].chatId, '')
  assert.equal(rows[1].userId, '3')
  assert.deepEqual(extractUsers([{ poll: {} }]), [])
})
test('Excel preserves IDs, Unicode names, and formula-like names as text', async () => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Users')
  sheet.addRow(['1234567890123', '-1001234567890', 'សុខ', '=1+1'])
  const restored = new ExcelJS.Workbook()
  await restored.xlsx.load(await workbook.xlsx.writeBuffer())
  assert.deepEqual(restored.worksheets[0].getRow(1).values.slice(1), ['1234567890123', '-1001234567890', 'សុខ', '=1+1'])
})
