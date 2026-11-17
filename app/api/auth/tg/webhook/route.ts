import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleTelegramUpdate, TELEGRAM_WEBHOOK_SECRET } from '@/lib/telegram-bot';

export const dynamic = 'force-dynamic';

/**
 * Mode A: Telegram Webhook Route
 * Path: POST /api/auth/tg/webhook
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validate Secret Token Header
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token') || '';
    const expectedSecret = TELEGRAM_WEBHOOK_SECRET;

    const secretBuffer = Buffer.from(secretHeader, 'utf8');
    const expectedBuffer = Buffer.from(expectedSecret, 'utf8');

    const isMatch =
      secretBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(secretBuffer, expectedBuffer);

    if (!isMatch) {
      console.warn('[TelegramWebhook] Secret token mismatch or missing header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Telegram Update
    const update = await req.json();

    // 3. Process Update
    const result = await handleTelegramUpdate(update);

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error('[TelegramWebhook] Error processing update:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 });
  }
}

/**
 * Health check endpoint for webhook verification
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/auth/tg/webhook',
    bot: '@statxambot',
    timestamp: new Date().toISOString(),
  });
}
