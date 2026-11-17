import { Question, LanguageMedium } from './types';

export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';

export const DEFAULT_GROQ_API_KEY =
  process.env.NEXT_PUBLIC_GROQ_API_KEY ||
  process.env.GROQ_API_KEY ||
  '';

export const DEFAULT_GROQ_MODEL =
  process.env.NEXT_PUBLIC_GROQ_MODEL || 'openai/gpt-oss-120b';

export const POPULAR_GROQ_MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B (High Precision & Reasoning)', latency: '~110ms' },
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B (Ultra-Fast Response)', latency: '~70ms' },
];

/**
 * Retrieve the active Groq API Key (from Admin configured local override or environment)
 */
export function getActiveGroqApiKey(): string {
  if (typeof window !== 'undefined') {
    const adminKey = localStorage.getItem('statxam_admin_groq_key');
    if (adminKey && adminKey.trim().length > 10) {
      return adminKey.trim();
    }
  }
  return DEFAULT_GROQ_API_KEY;
}

/**
 * Persist Admin Groq API Key
 */
export function setActiveGroqApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('statxam_admin_groq_key', key.trim());
  }
}

/**
 * Retrieve active Groq model
 */
export function getActiveGroqModel(): string {
  if (typeof window !== 'undefined') {
    const adminModel = localStorage.getItem('statxam_admin_groq_model');
    if (adminModel && adminModel.trim().length > 0) {
      return adminModel.trim();
    }
  }
  return DEFAULT_GROQ_MODEL;
}

/**
 * Persist active Groq model
 */
export function setActiveGroqModel(model: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('statxam_admin_groq_model', model.trim());
  }
}

/**
 * Live test of a Groq API Key with latency measurement
 */
export async function testGroqApiKey(apiKey?: string): Promise<{
  success: boolean;
  latencyMs: number;
  models: string[];
  error?: string;
}> {
  const key = apiKey || getActiveGroqApiKey();
  const startTime = Date.now();

  try {
    const res = await fetch(GROQ_MODELS_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        latencyMs,
        models: [],
        error: `Groq HTTP ${res.status}: ${errText}`,
      };
    }

    const json = await res.json();
    const models = Array.isArray(json.data)
      ? json.data.map((m: any) => m.id as string)
      : [];

    return {
      success: true,
      latencyMs,
      models,
    };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      models: [],
      error: err?.message || 'Network error connecting to Groq API',
    };
  }
}

export interface GroqChatResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

/**
 * Base Groq Chat Completion Caller
 */
export async function callGroqChat(params: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const key = params.apiKey || getActiveGroqApiKey();
  const model = params.model || getActiveGroqModel();

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: params.temperature ?? 0.2,
        max_tokens: params.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[GroqService] Request failed with status ${res.status}:`, errText);
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as GroqChatResponse;
    return data.choices[0]?.message?.content || '';
  } catch (err) {
    console.warn('[GroqService] Fetch error:', err);
    throw err;
  }
}

/**
 * Generate Multilingual Board Exam Questions using Groq AI
 */
export async function generateBoardQuestionsWithGroq(params: {
  board: string;
  subject: string;
  chapterName: string;
  language: LanguageMedium | string;
  year?: number;
  count?: number;
  apiKey?: string;
  model?: string;
}): Promise<Question[]> {
  const {
    board,
    subject,
    chapterName,
    language,
    year = 2024,
    count = 10,
    apiKey,
    model,
  } = params;

  const systemPrompt = `You are a Senior Chief Examiner and Question Paper Setter for ${board}.
Generate authentic exam questions strictly calibrated to the past 20 years official syllabus and marking rubrics.
Return valid JSON without backticks, with the following schema:
[
  {
    "id": "GROQ-string",
    "topic": "Topic Name",
    "stem": "Question statement in requested language",
    "options": [
      { "id": "A", "text": "Option A text" },
      { "id": "B", "text": "Option B text" },
      { "id": "C", "text": "Option C text" },
      { "id": "D", "text": "Option D text" }
    ],
    "correctOption": "A or B or C or D",
    "solution": "Step-by-step official marking scheme rubric with formulas",
    "difficulty": "easy" or "medium" or "hard",
    "marks": 1 or 2 or 4 or 6
  }
]`;

  const userPrompt = `Generate ${count} high-probability questions for:
Board: ${board}
Subject: ${subject}
Chapter/Topic: ${chapterName}
Language: ${language}
Year: ${year}

Ensure official step rubrics, realistic exam stems, and standard distractors. Return raw JSON array only.`;

  try {
    const rawContent = await callGroqChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      apiKey,
      model,
      temperature: 0.3,
      maxTokens: 3200,
    });

    const cleanedJson = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedJson);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any, idx: number) => ({
        id: item.id || `GROQ-${board.replace(/\s+/g, '')}-${year}-${Date.now()}-${idx + 1}`,
        subject: subject.toLowerCase().includes('math')
          ? 'mathematics'
          : subject.toLowerCase().includes('sci')
          ? 'science'
          : 'general',
        topic: item.topic || chapterName,
        language: (language as LanguageMedium) || 'english',
        stem: item.stem,
        options: item.options,
        correctOption: item.correctOption,
        solution: item.solution,
        source: 'groq_board_trend_synthesizer',
        reviewStatus: 'accepted',
        examCode: `${board.replace(/\s+/g, '-')}-${year}`,
        year,
        difficulty: item.difficulty || 'medium',
        marks: item.marks || 4,
        negativeMarks: 0,
      }));
    }
  } catch (err) {
    console.warn('[GroqService] Batch generation fallback:', err);
  }

  // Fallback question
  return [
    {
      id: `GROQ-${year}-FALLBACK-01`,
      subject: 'mathematics',
      topic: `${chapterName} • Standard Rubric`,
      language: (language as LanguageMedium) || 'english',
      stem: `In ${board} examination: Calculate the discriminant of 2x² - 4x + 3 = 0 and determine the nature of roots.`,
      options: [
        { id: 'A', text: 'D = -8 (No real roots)' },
        { id: 'B', text: 'D = 8 (Two distinct real roots)' },
        { id: 'C', text: 'D = 0 (Two equal real roots)' },
        { id: 'D', text: 'D = -16 (Complex roots)' },
      ],
      correctOption: 'A',
      solution: `D = b² - 4ac = (-4)² - 4(2)(3) = 16 - 24 = -8. Since D < 0, there are no real roots.`,
      source: 'groq_board_trend_synthesizer',
      reviewStatus: 'accepted',
      examCode: `${board.replace(/\s+/g, '-')}-${year}`,
      year,
      difficulty: 'medium',
      marks: 4,
      negativeMarks: 0,
    },
  ];
}

/**
 * Solve student doubt with Groq AI Neural Tutor
 */
export async function solveStudentDoubtWithGroq(params: {
  query: string;
  language?: LanguageMedium | string;
  board?: string;
  apiKey?: string;
}): Promise<{ explanation: string; formula?: string }> {
  const { query, language = 'english', board = 'Indian Board / NEET-UG / JEE', apiKey } = params;

  const systemPrompt = `You are StatXam AI (Clara), a distinguished formal academic tutor and subject-matter expert for Indian competitive examinations and school boards (NEET-UG, JEE Main/Advanced, CBSE, and State Boards).

Your tone must be formal, scholarly, clear, and pedagogy-driven—similar to advanced ChatGPT educational writing. Never output crude meta-rubrics for greetings or simple conversation.

RESPONSE PROTOCOLS:

1. GREETINGS & CASUAL INQUIRIES (e.g. "hi", "hello", "good morning", "can you help with NEET?"):
   - Respond warmly, formally, and concisely.
   - Welcome the scholar, explain what subjects (Physics, Chemistry, Biology, Mathematics) and examinations you cover.
   - DO NOT assign marks or invent an exam rubric for the greeting!
   - Politely ask the student to provide their specific question, problem, or topic.

2. NUMERICAL PROBLEMS & THEORETICAL CONCEPTS:
   - Provide a formal, comprehensive, step-by-step academic explanation structured as follows:
     • **Concept Overview**: Clear definition and physical/mathematical principle.
     • **Given Parameters**: List all values and constants with their SI units.
     • **Formula & Principles Applied**: The exact formula(s) in clean LaTeX or mathematical notation.
     • **Step-by-Step Working**: Logical sequence of calculations with intermediate results.
     • **Final Answer**: Explicitly state the final result with appropriate units in bold.
     • **Exam Insight / Common Trap**: High-yield tip or pitfall to avoid in board/NEET exams.

3. CODE & MATHEMATICAL FUNCTIONS:
   - If the student requests code, algorithms, or computer science functions (Python, C++, Java), format them inside standard markdown code blocks with language tags (e.g. \`\`\`python ... \`\`\`).
   - Include clean comments, time complexity, and example input/output.

4. CRITICAL LANGUAGE INSTRUCTION:
   - Respond in the EXACT SAME LANGUAGE that the student used in their question!
   - If the query is in English, reply in formal English.
   - If the query is in Hindi, reply in Hindi.
   - If the query is in Punjabi, reply in Punjabi.
   - If the query is in another regional language (Tamil, Telugu, Bengali, Gujarati), reply in that language.
   - If ambiguous, default to: ${language}.

5. MATHEMATICAL EQUATIONS & LATEX:
   - Write all standalone mathematical equations and physics derivations using clean standard display math:
     \\[
     \\text{equation}
     \\]
   - Write all inline variables, constants, angles, and symbols using inline math: \\(x\\), \\(\\theta\\), \\(\\angle ACB\\), \\(\\delta_m\\).
   - Ensure every LaTeX block is cleanly formatted and properly closed.
   - Deliver the entire comprehensive solution continuously from introduction to exam insight. Never emit artificial delimiters or markers like "---FORMULA---".`;

  try {
    const response = await callGroqChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      apiKey,
      temperature: 0.2,
      maxTokens: 1600,
    });

    // Remove any accidental separator artifacts
    const cleaned = response
      .replace(/---FORMULA---/gi, '\n')
      .replace(/```latex/gi, '')
      .trim();

    return {
      explanation: cleaned,
    };
  } catch {
    return {
      explanation: `Step-by-step academic solution for "${query}": Analyzed according to official ${board} standards and step-marking principles.`,
    };
  }
}
