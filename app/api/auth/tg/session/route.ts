import { NextRequest, NextResponse } from 'next/server';
import {
  createPasswordResetSession,
  getTelegramSession,
  verifyTelegramOtp,
  TELEGRAM_BOT_USERNAME,
} from '@/lib/telegram-bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mobile = body.mobile || body.email || 'scholar';

    const session = await createPasswordResetSession(mobile);

    return NextResponse.json({
      success: true,
      ...session,
    });
  } catch (error: any) {
    console.error('[API /api/auth/tg/session POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed creating Telegram session' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || '';

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }

    const session = getTelegramSession(sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      botHandle: `@${TELEGRAM_BOT_USERNAME}`,
      verified: session?.verified || false,
      chatId: session?.chatId,
      code: session?.otpCode,
    });
  } catch (error: any) {
    console.error('[API /api/auth/tg/session GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed querying Telegram session' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, code, mobile } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const res = await verifyTelegramOtp({
      sessionId,
      mobile,
      code,
    });

    return NextResponse.json(res);
  } catch (error: any) {
    console.error('[API /api/auth/tg/session PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Verification error' },
      { status: 500 }
    );
  }
}
