import { NextResponse } from 'next/server';
import { getActiveGroqApiKey, getActiveGroqModel, testGroqApiKey } from '@/lib/groq-service';
import { getActiveSupabaseUrl, getActiveSupabaseAnonKey, testSupabaseConnection } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const [groqStatus, supabaseStatus] = await Promise.all([
    testGroqApiKey().catch((err) => ({
      success: false,
      latencyMs: 0,
      models: [],
      error: err?.message || 'Groq check failed',
    })),
    testSupabaseConnection().catch((err) => ({
      success: false,
      latencyMs: 0,
      statusCode: 0,
      error: err?.message || 'Supabase check failed',
    })),
  ]);

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    isVercel: !!process.env.VERCEL,
    groq: {
      connected: groqStatus.success,
      latencyMs: groqStatus.latencyMs,
      model: getActiveGroqModel(),
      authorizedModels: groqStatus.models.slice(0, 5),
      error: groqStatus.error,
    },
    supabase: {
      connected: supabaseStatus.success,
      url: getActiveSupabaseUrl(),
      statusCode: supabaseStatus.statusCode,
      latencyMs: supabaseStatus.latencyMs,
      error: supabaseStatus.error,
      hasRealKey: !getActiveSupabaseAnonKey().includes('placeholder'),
    },
  });
}
