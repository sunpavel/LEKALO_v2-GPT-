# LEKALO lead delivery setup

The lead endpoint is `POST /api/leads`. It stores every validated lead before attempting Telegram delivery.

## Railway variables

- `TELEGRAM_BOT_TOKEN` — token issued by BotFather.
- `TELEGRAM_CHAT_IDS` — one or more recipient chat IDs separated by commas, for example `123456789,987654321`.
- `LEADS_FILE` — use `/data/leads.jsonl` when a Railway volume is mounted at `/data`.

Do not commit real tokens or chat IDs to the repository.

## Telegram setup

1. Create a bot with `@BotFather` and copy the token into the Railway variable `TELEGRAM_BOT_TOKEN`.
2. Every recipient opens the bot and sends `/start`.
3. Resolve each recipient's numeric chat ID and add the comma-separated values to `TELEGRAM_CHAT_IDS`.
4. Redeploy the Railway service after variables are saved.

## Persistent backup

Attach a Railway volume to the service, mount it at `/data`, and set `LEADS_FILE=/data/leads.jsonl`. Without a volume, the endpoint falls back to `/tmp/lekalo-leads.jsonl`; that fallback survives a process restart only while the container filesystem exists and is not a durable archive.

## Analytics events

- GA4: `form_start`, `generate_lead`, `phone_click`, `telegram_click`.
- Yandex.Metrica goals: `form_start`, `lead_submit`, `phone_click`, `telegram_click`.
