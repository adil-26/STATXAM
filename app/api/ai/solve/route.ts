import { NextRequest, NextResponse } from 'next/server';
import { solveStudentDoubtWithGroq, getActiveGroqApiKey, getActiveGroqModel } from '@/lib/groq-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query, language = 'english', board = 'Indian Board / NEET-UG / JEE', apiKey, examMode = 'indian' } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid "query" parameter' },
        { status: 400 }
      );
    }

    const effectiveApiKey = apiKey || getActiveGroqApiKey();
    const solution = await solveStudentDoubtWithGroq({
      query: query.trim(),
      language,
      board,
      apiKey: effectiveApiKey,
      examMode: examMode === 'ielts' ? 'ielts' : 'indian',
    });

    return NextResponse.json({
      success: true,
      explanation: solution.explanation,
      formula: solution.formula,
      modelUsed: getActiveGroqModel(),
    });
  } catch (error: any) {
    console.error('[API /api/ai/solve] Handler exception:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error processing AI tutor doubt',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/ai/solve',
    model: getActiveGroqModel(),
    hasApiKey: !!getActiveGroqApiKey(),
  });
}
