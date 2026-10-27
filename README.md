# Telegram contacts

Nuxt app for fetching Telegram bot user names, user IDs, and chat IDs, with searchable results and Excel (.xlsx) export.

## Run

```sh
npm install
npm run dev
```

Open the app, paste a bot token from @BotFather, ask users to send the bot `/start`, then click **Fetch users**. **Refresh users** merges new records in the current tab. **Export Excel** exports the current search results.

Tokens are sent to the local Nuxt server in a POST body and then to Telegram over HTTPS. They are not persisted. User records stay in browser memory and clear on reload or token changes. Deploy behind your own access controls if the app is shared.

## Telegram limitations

The app reads up to 100 pending updates without acknowledging them. Telegram keeps updates for no longer than 24 hours; its API cannot enumerate every historical bot subscriber. Active webhooks block getUpdates, and another polling client may consume updates. This app does not delete webhooks or advance the update offset. See https://core.telegram.org/bots/api#getupdates.

User IDs identify people; chat IDs identify conversations. In a private chat they match. Group chat IDs differ. Records are deduplicated by user ID and chat ID. Updates without chat context display an unavailable chat ID.

## Validate and build

```sh
node --experimental-strip-types --test tests/telegram.test.mjs
npm run build
node .output/server/index.mjs
```
