#!/usr/bin/env node

/**
 * Telegram Webhook Configuration CLI Script
 * 
 * Usage:
 *   node scripts/set-telegram-webhook.js https://statxam.vercel.app
 *   node scripts/set-telegram-webhook.js status
 *   node scripts/set-telegram-webhook.js delete
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if not already present
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.replace(/^["'](.*)["']$/, '$1').trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.log(`
StatXam Telegram Webhook CLI
-----------------------------
Usage:
  npm run telegram:webhook -- <origin-url>   (e.g. https://statxam.vercel.app)
  npm run telegram:webhook -- status        (inspect current webhook state)
  npm run telegram:webhook -- delete        (delete webhook for local long-polling)
`);
    process.exit(0);
  }

  // Subcommand: status
  if (arg === 'status' || arg === '--status') {
    console.log('🔍 Fetching current Telegram webhook status...');
    const res = await fetch(`${API_BASE}/getWebhookInfo`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Subcommand: delete
  if (arg === 'delete' || arg === '--delete') {
    console.log('🗑️ Deleting active webhook from Telegram...');
    const res = await fetch(`${API_BASE}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: true }),
    });
    const data = await res.json();
    console.log('Result:', data);
    if (data.ok) {
      console.log('✅ Webhook removed. Long-polling (Mode B) can now be run.');
    }
    return;
  }

  // Subcommand: register webhook with origin
  const origin = arg.replace(/\/+$/, '');
  const webhookUrl = `${origin}/api/auth/tg/webhook`;

  console.log('1️⃣ Verifying Telegram Bot identity via getMe...');
  const meRes = await fetch(`${API_BASE}/getMe`);
  const meData = await meRes.json();

  if (!meData.ok) {
    console.error('❌ Failed connecting to bot. Response:', meData);
    process.exit(1);
  }

  console.log(`✅ Connected as @${meData.result.username} (ID: ${meData.result.id})`);

  console.log(`2️⃣ Registering Webhook URL: ${webhookUrl}`);
  console.log(`🔒 Secret token set (first 8 chars): ${WEBHOOK_SECRET.slice(0, 8)}...`);

  const setRes = await fetch(`${API_BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'edited_message'],
      drop_pending_updates: false,
    }),
  });

  const setData = await setRes.json();
  console.log('Result:', setData);

  if (setData.ok) {
    console.log(`🎉 Webhook successfully activated for ${origin}!`);
  } else {
    console.error('❌ Failed to set webhook:', setData.description);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
