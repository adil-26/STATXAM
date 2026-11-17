#!/usr/bin/env node

/**
 * Mode B: Telegram Long-Polling Runner (Local Development)
 * 
 * Allows receiving Telegram updates and issuing OTPs on localhost
 * without needing a public domain or ngrok tunnel.
 * 
 * Usage:
 *   node scripts/poll-telegram.js
 *   npm run telegram:polling
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
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
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'statxambot';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('❌ Failed to send message:', err.message);
  }
}

async function handleUpdate(update) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat?.id;
  const text = msg.text.trim();
  const user = msg.from?.username || msg.from?.first_name || 'Scholar';

  console.log(`\n📬 [Telegram Update] From: ${user} (ID: ${chatId}) | Text: "${text}"`);

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const sessionId = parts.length > 1 ? parts[1].trim() : '';

    if (sessionId) {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const formatted = `${otp.slice(0, 3)} ${otp.slice(3)}`;

      console.log(`🔑 [OTP Generated] Session: ${sessionId} -> Code: ${otp}`);

      const reply = `🔐 *StatXam Security Verification*

Hello *${user}*! Here is your one-time verification code (OTP) to reset your StatXam password:

👉 \`${formatted}\`
_(Tap to copy: \`${otp}\`)_

⏱ *Valid for 10 minutes.*
⚠️ Never share this OTP with anyone. StatXam moderators will never ask for your code.`;

      await sendMessage(chatId, reply);
      console.log(`✅ [OTP Dispatched] Sent to chat ${chatId}`);
      return;
    }

    // Default /start with no parameter
    const welcome = `👋 *Welcome to StatXam Verification Bot* (@${BOT_USERNAME})

This official bot delivers secure one-time passwords (OTP) for password resets across the StatXam Question Bank & CBT Vault.

*How to Reset Your Password:*
1️⃣ Open the StatXam app
2️⃣ On the Sign-In screen, tap *"Forgot password?"*
3️⃣ Tap the Telegram button to receive your instant 6-digit OTP right here.

📚 _StatXam — 20-Year State Board & NEET Question Archive_`;

    await sendMessage(chatId, welcome);
    console.log(`✅ [Welcome Sent] Sent to chat ${chatId}`);
    return;
  }

  if (text.startsWith('/help')) {
    await sendMessage(
      chatId,
      `ℹ️ *StatXam Bot Assistance*\n\n• Bot Handle: @${BOT_USERNAME}\n• Purpose: OTP delivery for password recovery\n• StatXam Web: https://statxam.vercel.app`
    );
  }
}

async function startPolling() {
  console.log('🤖 StatXam Telegram Long-Polling Gateway');
  console.log('----------------------------------------');

  // 1. Verify Bot Token
  const meRes = await fetch(`${API_BASE}/getMe`);
  const me = await meRes.json();
  if (!me.ok) {
    console.error('❌ Bot token rejected by Telegram:', me);
    process.exit(1);
  }
  console.log(`✅ Bot Authenticated: @${me.result.username} (ID: ${me.result.id})`);

  // 2. Clear Webhook (required for getUpdates)
  console.log('🔄 Clearing any active webhook for long-polling...');
  await fetch(`${API_BASE}/deleteWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drop_pending_updates: false }),
  });

  console.log('🟢 Long-polling started. Listening for /start messages... (Press Ctrl+C to stop)\n');

  let offset = 0;

  while (true) {
    try {
      const res = await fetch(`${API_BASE}/getUpdates?offset=${offset}&timeout=20`, {
        method: 'GET',
      });
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await handleUpdate(update);
        }
      } else if (!data.ok) {
        console.warn('⚠️ Telegram API notice:', data.description);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        // Network timeout / connection reset, wait and retry
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}

startPolling().catch((err) => {
  console.error('❌ Fatal polling error:', err);
  process.exit(1);
});
