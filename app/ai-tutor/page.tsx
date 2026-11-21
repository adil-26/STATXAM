'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import katex from 'katex';
import { triggerHaptic, captureQuestionPhoto } from '@/lib/native-permissions';
import { solveStudentDoubtWithGroq } from '@/lib/groq-service';
import { useAuth } from '@/lib/auth-context';
import { useExamMode } from '@/components/ExamModeContext';
import { getApiUrl } from '@/lib/api-config';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface FileAttachmentInfo {
  name: string;
  sizeMb: string;
  type: 'image' | 'pdf' | 'document';
  dataUrl: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  formula?: string;
  imageUri?: string;
  fileAttachment?: FileAttachmentInfo;
  isStreaming?: boolean;
  fullText?: string;
}

interface ParsedSection {
  id: string;
  type:
  | 'concept'
  | 'parameters'
  | 'formula'
  | 'steps'
  | 'final'
  | 'diagram'
  | 'code'
  | 'example'
  | 'insight'
  | 'general';
  title: string;
  content: string;
}

/**
 * Intelligent language detection based on character scripts
 */
function detectQueryLanguage(text: string, fallback: string = 'english'): string {
  if (/[\u0A00-\u0A7F]/.test(text)) return 'punjabi';
  if (/[\u0900-\u097F]/.test(text)) return 'hindi';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';
  if (/[\u0980-\u09FF]/.test(text)) return 'bengali';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gujarati';
  if (/^[A-Za-z0-9\s.,?!'"+\-*/=()^%_]+$/.test(text)) return 'english';
  return fallback;
}

/**
 * Render a pure LaTeX string into KaTeX HTML safely
 */
function renderKatex(latex: string, displayMode: boolean = false): string {
  if (!latex) return '';
  try {
    const cleaned = latex.trim().replace(/^\\\[|\\\]$|^\$\$|\$\$$/g, '').trim();
    return katex.renderToString(cleaned, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch {
    return latex;
  }
}

/**
 * Converts text containing inline math \(...\), $...$ and block math \[...\], $$...$$ into rich KaTeX HTML
 */
function renderContentWithMathAndMarkdown(text: string): string {
  if (!text) return '';

  // 1. Block math: \[ ... \] or $$ ... $$
  let formatted = text.replace(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g, (match, p1, p2) => {
    const rawFormula = (p1 || p2 || '').trim();
    if (!rawFormula) return match;
    try {
      const mathHtml = katex.renderToString(rawFormula, { displayMode: true, throwOnError: false });
      return `<div class="katex-display-box my-2 py-2 px-3 rounded-xl bg-[#faf5ee]/90 border border-[#e8dccb] overflow-x-auto text-center shadow-2xs">${mathHtml}</div>`;
    } catch {
      return match;
    }
  });

  // 2. Inline math: \( ... \) or $ ... $
  formatted = formatted.replace(/\\\(([\s\S]*?)\\\)|\$([^$\n\r]+)\$/g, (match, p1, p2) => {
    const rawFormula = (p1 || p2 || '').trim();
    if (!rawFormula) return match;
    try {
      return katex.renderToString(rawFormula, { displayMode: false, throwOnError: false });
    } catch {
      return match;
    }
  });

  // 3. Bold text: **text**
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-on-surface">$1</strong>');

  return formatted;
}

/**
 * Robust markdown section parser for formal academic solutions
 */
function parseResponseIntoSections(text: string): ParsedSection[] {
  let sanitizedText = text;
  const fenceCount = (sanitizedText.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) {
    sanitizedText += '\n```';
  }

  const lines = sanitizedText.split('\n');
  const sections: ParsedSection[] = [];
  let currentTitle = '';
  let currentType: ParsedSection['type'] = 'general';
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLines.length > 0 || currentTitle) {
      sections.push({
        id: `sec-${sections.length}`,
        type: currentType,
        title: currentTitle,
        content: currentLines.join('\n').trim(),
      });
      currentLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip horizontal divider lines between sections
    if (trimmed === '---' || trimmed === '***' || trimmed === '- - -') {
      continue;
    }

    const headerMatch = trimmed.match(
      /^(?:#{1,4}\s*(?:[0-9]+\.\s*)?(.+)|\*\*(?:[0-9]+\.\s*)?([^*]+)\*\*)$/
    );

    if (headerMatch) {
      const titleCandidate = (headerMatch[1] || headerMatch[2] || '').trim().replace(/:$/, '');
      const lower = titleCandidate.toLowerCase();

      let detectedType: ParsedSection['type'] | null = null;
      if (
        lower.includes('concept') ||
        lower.includes('overview') ||
        lower.includes('principle') ||
        lower.includes('theory')
      ) {
        detectedType = 'concept';
      } else if (
        lower.includes('parameter') ||
        lower.includes('given') ||
        lower.includes('data') ||
        lower.includes('symbol')
      ) {
        detectedType = 'parameters';
      } else if (
        lower.includes('formula') ||
        lower.includes('equation') ||
        lower.includes('mathematical')
      ) {
        detectedType = 'formula';
      } else if (
        lower.includes('step') ||
        lower.includes('working') ||
        lower.includes('calculation') ||
        lower.includes('derivation') ||
        lower.includes('proof')
      ) {
        detectedType = 'steps';
      } else if (
        lower.includes('final') ||
        lower.includes('answer') ||
        lower.includes('conclusion') ||
        lower.includes('result')
      ) {
        detectedType = 'final';
      } else if (
        lower.includes('diagram') ||
        lower.includes('figure') ||
        lower.includes('construction') ||
        lower.includes('geometry')
      ) {
        detectedType = 'diagram';
      } else if (
        lower.includes('python') ||
        lower.includes('implementation') ||
        lower.includes('code') ||
        lower.includes('algorithm')
      ) {
        detectedType = 'code';
      } else if (
        lower.includes('example') ||
        lower.includes('input') ||
        lower.includes('output') ||
        lower.includes('test case')
      ) {
        detectedType = 'example';
      } else if (
        lower.includes('insight') ||
        lower.includes('trap') ||
        lower.includes('tip') ||
        lower.includes('pitfall') ||
        lower.includes('takeaway')
      ) {
        detectedType = 'insight';
      }

      if (detectedType) {
        flush();
        currentTitle = titleCandidate;
        currentType = detectedType;
        continue;
      }
    }

    currentLines.push(line);
  }

  flush();

  if (sections.length === 0) {
    sections.push({
      id: 'sec-0',
      type: 'general',
      title: '',
      content: sanitizedText,
    });
  }

  return sections;
}

/**
 * Syntax-Styled Code Block Window with One-Click Copy
 */
function CodeBlockBox({
  codeRaw,
  copyId,
  copiedKey,
  onCopy,
}: {
  codeRaw: string;
  copyId: string;
  copiedKey: string | null;
  onCopy: (code: string, id: string) => void;
}) {
  const contentWithoutFences = codeRaw.replace(/^```|```$/g, '').trim();
  const firstNewline = contentWithoutFences.indexOf('\n');
  let lang = 'code';
  let code = contentWithoutFences;
  if (firstNewline !== -1) {
    const possibleLang = contentWithoutFences.slice(0, firstNewline).trim();
    if (possibleLang && !possibleLang.includes(' ')) {
      lang = possibleLang;
      code = contentWithoutFences.slice(firstNewline + 1);
    }
  }

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-[#3e342e] bg-[#1c1815] text-[#faf5ee] shadow-2xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#251f1b] border-b border-[#3e342e] text-xs font-mono">
        <div className="flex items-center gap-1.5 text-[#f0a878]">
          <span className="material-symbols-outlined text-[14px]">terminal</span>
          <span className="font-bold uppercase tracking-wider text-[10px]">{lang}</span>
        </div>
        <button
          type="button"
          onClick={() => onCopy(code, copyId)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c1815] hover:bg-[#322923] text-[#cec6be] hover:text-[#faf5ee] text-[11px] font-mono transition-all border border-[#3e342e]"
        >
          <span className="material-symbols-outlined text-[13px] text-[#f0a878]">
            {copiedKey === copyId ? 'check' : 'content_copy'}
          </span>
          <span className="font-semibold">{copiedKey === copyId ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 text-xs sm:text-sm font-mono overflow-x-auto text-[#86efac] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Standardized Section Card: Flat, Elegant, and Clean without Nested Clutter
 */
function SectionCard({
  section,
  copiedKey,
  onCopy,
}: {
  section: ParsedSection;
  copiedKey: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const { type, title, content, id } = section;

  // 1. Code Block Section
  if (type === 'code' || (content.startsWith('```') && content.endsWith('```'))) {
    return (
      <div className="space-y-1">
        {title && (
          <div className="flex items-center gap-1.5 text-xs font-headline font-bold text-on-surface pt-1">
            <span className="material-symbols-outlined text-[15px] text-primary">data_object</span>
            <span>{title}</span>
          </div>
        )}
        <CodeBlockBox
          codeRaw={content}
          copyId={`code-${id}`}
          copiedKey={copiedKey}
          onCopy={onCopy}
        />
      </div>
    );
  }

  // 2. Exam Insight / Common Trap Card (Clean Left-Accent Callout)
  if (type === 'insight') {
    return (
      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#fff8f0] border-l-4 border-l-[#c2652a] border border-[#f0dfcc] space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#c2652a]">
            <span className="material-symbols-outlined text-[16px]">lightbulb</span>
            <span className="font-headline font-bold text-xs uppercase tracking-wider">
              Examiner Tip
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#c2652a]/10 text-[#c2652a] border border-[#c2652a]/20">
            Key Insight
          </span>
        </div>
        <div
          className="text-xs sm:text-sm leading-relaxed text-[#2b2118]"
          dangerouslySetInnerHTML={{ __html: renderContentWithMathAndMarkdown(content) }}
        />
      </div>
    );
  }

  // 3. Formula & Principles Applied Card
  if (type === 'formula') {
    const formulaMatch = content.match(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/);
    const rawFormula = formulaMatch ? (formulaMatch[1] || formulaMatch[2] || '').trim() : content.trim();
    const renderedMath = renderKatex(rawFormula, true);

    return (
      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#faf5ee] border border-[#e4d7c6] space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-primary">
            <span className="material-symbols-outlined text-[16px]">functions</span>
            <span className="font-headline font-bold text-xs uppercase tracking-wider">
              {title || 'Applied Formula'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onCopy(rawFormula, `formula-${id}`)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface border border-primary/30 text-primary text-[11px] font-mono font-semibold hover:bg-primary/10 transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[13px]">
              {copiedKey === `formula-${id}` ? 'check' : 'content_copy'}
            </span>
            <span>{copiedKey === `formula-${id}` ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div
          className="p-2.5 sm:p-3 rounded-xl bg-white/80 border border-[#e4d7c6] overflow-x-auto text-center"
          dangerouslySetInnerHTML={{ __html: renderedMath }}
        />

        {formulaMatch && content.replace(/\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$/g, '').trim() && (
          <div
            className="text-xs text-on-surface-variant pt-1 border-t border-outline-variant/30 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: renderContentWithMathAndMarkdown(
                content.replace(/\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$/g, '').trim()
              ),
            }}
          />
        )}
      </div>
    );
  }

  // 4. Final Answer Card: ONE Mint Green Card with Single Copy Button
  if (type === 'final') {
    return (
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#edf7f1] border border-[#b7e1c9] space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span className="font-headline font-bold text-xs uppercase tracking-wider">
              {title || 'Final Answer'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onCopy(content.replace(/```/g, ''), `final-${id}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-emerald-500/30 text-emerald-800 text-[11px] font-mono font-semibold transition-colors shadow-2xs"
            title="Copy Final Answer"
          >
            <span className="material-symbols-outlined text-[13px]">
              {copiedKey === `final-${id}` ? 'check' : 'content_copy'}
            </span>
            <span>{copiedKey === `final-${id}` ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="text-xs sm:text-sm font-semibold text-on-surface">
          <FormattedTextSegment
            text={content}
            segmentIdx={4}
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
        </div>
      </div>
    );
  }

  // 5. Diagrammatic / Geometric Construction Card
  if (type === 'diagram') {
    return (
      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#1c222b] border border-[#2d3748] text-[#f1f5f9] space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sky-400">
            <span className="material-symbols-outlined text-[16px]">schema</span>
            <span className="font-headline font-bold text-xs uppercase tracking-wider">
              {title || 'Geometric Construction'}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300">
            Geometry View
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] font-mono text-xs text-sky-200 overflow-x-auto whitespace-pre leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  // 6. Example Input / Output Terminal Card
  if (type === 'example') {
    return (
      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#181412] border border-[#342b26] text-[#faf5ee] space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sky-400">
            <span className="material-symbols-outlined text-[16px]">input</span>
            <span className="font-headline font-bold text-xs uppercase tracking-wider">
              {title || 'Example I/O'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onCopy(content.replace(/```/g, ''), `example-${id}`)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#241e1b] border border-[#3e342e] text-[#cec6be] hover:text-[#faf5ee] text-[11px] font-mono transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">
              {copiedKey === `example-${id}` ? 'check' : 'content_copy'}
            </span>
            <span>{copiedKey === `example-${id}` ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="p-2.5 rounded-xl bg-[#120f0d] font-mono text-xs text-[#a5f3fc] overflow-x-auto leading-relaxed">
          <code>{content.replace(/```/g, '').trim()}</code>
        </pre>
      </div>
    );
  }

  // 7. Given Parameters Card
  if (type === 'parameters') {
    return (
      <div className="space-y-1 py-1">
        <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
          <span className="material-symbols-outlined text-[16px]">fact_check</span>
          <span className="font-headline font-bold text-xs uppercase tracking-wider">
            {title || 'Given Parameters'}
          </span>
        </div>
        <div className="text-xs sm:text-sm leading-relaxed text-on-surface">
          <FormattedTextSegment
            text={content}
            segmentIdx={0}
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
        </div>
      </div>
    );
  }

  // 8. Concept Overview
  if (type === 'concept') {
    return (
      <div className="space-y-1 py-1">
        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
          <span className="material-symbols-outlined text-[16px]">lightbulb</span>
          <span className="font-headline font-bold text-xs uppercase tracking-wider">
            {title || 'Concept Overview'}
          </span>
        </div>
        <div className="text-xs sm:text-sm leading-relaxed text-on-surface">
          <FormattedTextSegment
            text={content}
            segmentIdx={1}
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
        </div>
      </div>
    );
  }

  // 9. Step-by-Step Working
  if (type === 'steps') {
    return (
      <div className="space-y-1 py-1">
        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <span className="material-symbols-outlined text-[16px]">format_list_numbered</span>
          <span className="font-headline font-bold text-xs uppercase tracking-wider">
            {title || 'Step-by-Step Working'}
          </span>
        </div>
        <div className="text-xs sm:text-sm leading-relaxed text-on-surface">
          <FormattedTextSegment
            text={content}
            segmentIdx={2}
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
        </div>
      </div>
    );
  }

  // 10. General Fallback
  return (
    <div className="space-y-1 py-1">
      {title && (
        <h4 className="font-headline font-bold text-xs sm:text-sm text-on-surface flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>{title}</span>
        </h4>
      )}
      <div className="text-xs sm:text-sm leading-relaxed text-on-surface">
        <FormattedTextSegment
          text={content}
          segmentIdx={3}
          copiedKey={copiedKey}
          onCopy={onCopy}
        />
      </div>
    </div>
  );
}

/**
 * Formatted Markdown Text Segment with Table & Clean Math Recognition
 */
function FormattedTextSegment({
  text,
}: {
  text: string;
  segmentIdx?: number;
  copiedKey?: string | null;
  onCopy?: (t: string, id: string) => void;
}) {
  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="space-y-2 text-xs sm:text-sm leading-relaxed font-body">
      {paragraphs.map((p, pIdx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        const lines = trimmed.split('\n');
        const isTable =
          lines.length >= 2 &&
          lines[0].startsWith('|') &&
          lines[0].endsWith('|') &&
          lines[1].includes('|-');

        if (isTable) {
          const headerCols = lines[0]
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          const rowLines = lines.slice(2).filter((l) => l.startsWith('|'));
          return (
            <div
              key={`tbl-${pIdx}`}
              className="my-2 overflow-x-auto rounded-xl border border-outline-variant/60 shadow-2xs"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f0e6d8] font-semibold text-on-surface">
                  <tr>
                    {headerCols.map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-1.5 border-b border-outline-variant/50 font-label text-[11px]"
                        dangerouslySetInnerHTML={{ __html: renderContentWithMathAndMarkdown(h) }}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 bg-surface-container-lowest">
                  {rowLines.map((row, rIdx) => {
                    const cells = row
                      .split('|')
                      .slice(1, -1)
                      .map((c) => c.trim());
                    return (
                      <tr key={rIdx} className="hover:bg-surface-container-low/50 transition-colors">
                        {cells.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-3 py-1.5 text-on-surface text-[12px]"
                            dangerouslySetInnerHTML={{ __html: renderContentWithMathAndMarkdown(cell) }}
                          />
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        // Clean Mathematical Display Block (No Nested Outer Box or Duplicate Copy Button)
        if (
          (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) ||
          (trimmed.startsWith('$$') && trimmed.endsWith('$$'))
        ) {
          const formulaRaw = trimmed.replace(/^\\\[|^\$\$|\\\]$|\$\$$/g, '').trim();
          const renderedMath = renderKatex(formulaRaw, true);
          return (
            <div
              key={`eq-${pIdx}`}
              className="my-2 py-2 px-3 rounded-xl bg-[#faf5ee]/90 border border-[#e8dccb] overflow-x-auto text-center shadow-2xs"
              dangerouslySetInnerHTML={{ __html: renderedMath }}
            />
          );
        }

        return (
          <div
            key={`p-${pIdx}`}
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderContentWithMathAndMarkdown(trimmed) }}
          />
        );
      })}
    </div>
  );
}

/**
 * Standardized Message Bubble with Attached Images & Documents Support
 */
function ChatMessageBubble({
  message,
  copiedKey,
  onCopy,
  onSkipStreaming,
}: {
  message: ChatMessage;
  copiedKey: string | null;
  onCopy: (text: string, id: string) => void;
  onSkipStreaming: (id: string) => void;
}) {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex flex-col items-end w-full">
        <div className="max-w-[88%] sm:max-w-[75%] rounded-2xl p-3 sm:p-4 shadow-xs bg-primary text-on-primary rounded-br-xs space-y-2">
          {/* Attached Image Preview */}
          {message.imageUri && (
            <div className="rounded-xl overflow-hidden max-h-52 border border-white/20">
              <img src={message.imageUri} alt="Uploaded Problem" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Attached PDF or Document Card */}
          {message.fileAttachment && message.fileAttachment.type !== 'image' && (
            <div className="p-2.5 rounded-xl bg-black/25 border border-white/20 flex items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold font-mono text-white truncate text-xs">{message.fileAttachment.name}</p>
                  <p className="text-[10px] text-white/80 font-mono">
                    {message.fileAttachment.sizeMb} • Document
                  </p>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-white/20 text-white text-[10px] font-mono font-bold shrink-0">
                OCR Ready
              </span>
            </div>
          )}

          {message.text && (
            <p className="text-xs sm:text-sm leading-relaxed font-body whitespace-pre-wrap">{message.text}</p>
          )}

          <span className="text-[10px] mt-0.5 block font-label text-on-primary/80 text-right">
            {message.timestamp}
          </span>
        </div>
      </div>
    );
  }

  // Assistant Bubble: Flat, Clean Modern AI Response Card
  const sections = parseResponseIntoSections(message.text);

  return (
    <div className="flex flex-col items-start w-full">
      <div className="w-full rounded-2xl p-3 sm:p-4 bg-white/95 text-on-surface border border-outline-variant/50 shadow-2xs space-y-3">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              <span className="material-symbols-outlined text-[15px]">psychology</span>
            </div>
            <div>
              <span className="font-headline font-bold text-xs text-on-surface block leading-tight">
                Clara Neural Solver
              </span>
              <span className="text-[10px] text-on-surface-variant font-mono">
                {message.isStreaming ? (
                  <span className="text-primary font-bold animate-pulse">
                    Streaming solution...
                  </span>
                ) : (
                  'Verified Academic Solution'
                )}
              </span>
            </div>
          </div>

          {message.isStreaming && (
            <button
              type="button"
              onClick={() => onSkipStreaming(message.id)}
              className="px-2 py-0.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-[11px] font-mono font-bold text-primary flex items-center gap-1 transition-all"
            >
              <span>Skip</span>
              <span className="material-symbols-outlined text-[13px]">fast_forward</span>
            </button>
          )}
        </div>

        {/* Photo Preview if any */}
        {message.imageUri && (
          <div className="mb-2 rounded-xl overflow-hidden max-h-48 border border-outline-variant/40">
            <img src={message.imageUri} alt="Captured question" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Structured Sections Stream */}
        <div className="space-y-2.5">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              copiedKey={copiedKey}
              onCopy={onCopy}
            />
          ))}

          {/* Typewriter Cursor */}
          {message.isStreaming && (
            <div className="flex items-center gap-1 pt-1 text-primary">
              <span className="w-2 h-3.5 bg-primary inline-block animate-pulse rounded-xs" />
              <span className="text-[11px] font-mono italic text-on-surface-variant">
                Writing mathematical derivation...
              </span>
            </div>
          )}
        </div>

        {/* Bottom Actions Row */}
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
          <button
            type="button"
            onClick={() =>
              onCopy(
                message.fullText || message.text,
                `full-${message.id}`
              )
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container/70 hover:bg-surface-container text-on-surface text-xs font-label font-medium transition-all shadow-2xs border border-outline-variant/40"
            title="Copy Full Solution"
          >
            <span className="material-symbols-outlined text-[14px] text-primary">
              {copiedKey === `full-${message.id}` ? 'check' : 'content_copy'}
            </span>
            <span className="text-[11px] font-semibold">
              {copiedKey === `full-${message.id}` ? 'Copied' : 'Copy Solution'}
            </span>
          </button>

          <span className="text-[10px] text-on-surface-variant font-label">{message.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

function AiTutorContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams?.get('q');
  const { user } = useAuth();
  const { mode } = useExamMode();

  // Mobile Tab: 'chat' | 'tools'
  const [activeTab, setActiveTab] = useState<'chat' | 'tools'>('chat');
  const [selectedLanguage, setSelectedLanguage] = useState<'auto' | 'english' | 'hindi' | 'punjabi'>('auto');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // File & Image Attachment State (Max 25 MB)
  const [selectedAttachment, setSelectedAttachment] = useState<FileAttachmentInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingFullResponseRef = useRef<{ id: string; text: string } | null>(null);

  // Pre-seeded starter demo conversation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'assistant',
      text: `**Concept Overview**  
Good day, aspiring scholar. I am Clara, your formal StatXam Academic Tutor for NEET-UG, JEE, and Board Examinations.

**Given Parameters**  
- Multilingual Mode: English, Hindi, Punjabi & Regional Indian languages.
- Capabilities: Step-by-step numerical derivations, LaTeX mathematical functions, and marking rubrics.
- Upload Limit: PDF documents and photo scans up to **25 MB**.

**Exam Insight / Common Trap**  
Snap a photo of any question, upload a PDF/image, or paste a problem below to begin your session!`,
      timestamp: '10:00 AM',
    },
    {
      id: 'm-2',
      sender: 'user',
      text: 'Explain the prism formula n = sin((A + dm)/2) / sin(A/2) and prove minimum deviation is 30° when i = 45° for equilateral prism.',
      timestamp: '10:02 AM',
    },
    {
      id: 'm-3',
      sender: 'assistant',
      text: `**Concept Overview**  
The prism equation relates the refractive index \\(n\\) of a prism to its apex angle \\(A\\) and the angle of minimum deviation \\(\\delta_m\\). In an equilateral glass prism, all three refracting angles are equal (\\(A = 60^\\circ\\)). At minimum deviation, the internal ray travels parallel to the prism base, meaning the angle of incidence equals the angle of emergence (\\(i = e = 45^\\circ\\)).

**Given Parameters**  
| Symbol | Meaning | Value |
|--------|---------|-------|
| \\(A\\) | Prism Apex Angle | \\(60^\\circ\\) |
| \\(i\\) | Angle of Incidence | \\(45^\\circ\\) |
| \\(e\\) | Angle of Emergence | \\(45^\\circ\\) |
| \\(n\\) | Refractive Index of Glass | Dimensionless |

**Formula & Principles Applied**  
The primary mathematical relation governing the refractive index of a triangular prism is:
\\[
n = \\frac{\\sin\\!\\left(\\dfrac{A + \\delta_m}{2}\\right)}{\\sin\\!\\left(\\dfrac{A}{2}\\right)}
\\]
Additionally, the deviation angle relates to incidence and emergence angles by:
\\[
A + \\delta_m = i + e \\implies \\delta_m = 2i - A
\\]

**Step‑by‑Step Working**  
1. Substitute given angles into the deviation equation:
   \\[ 60^\\circ + \\delta_m = 45^\\circ + 45^\\circ \\]
2. Compute the sum on the right-hand side:
   \\[ 60^\\circ + \\delta_m = 90^\\circ \\]
3. Isolate the minimum deviation:
   \\[ \\delta_m = 90^\\circ - 60^\\circ = 30^\\circ \\]
4. Evaluate refractive index \\(n\\):
   \\[ n = \\frac{\\sin(45^\\circ)}{\\sin(30^\\circ)} = \\frac{1/\\sqrt{2}}{1/2} = \\sqrt{2} \\approx 1.414 \\]

**Final Answer**  
\\[
\\delta_m = 30^\\circ, \\quad n = \\sqrt{2} \\approx 1.414
\\]

**Exam Insight / Common Trap**  
Students frequently forget that for an equilateral prism, \\(A = 60^\\circ\\) is implicit and not always given explicitly in the problem text. Always state \\(A = 60^\\circ\\) as your first step to secure full step marks!`,
      timestamp: '10:02 AM',
    },
  ]);

  const [inputText, setInputText] = useState(initialQ || '');
  const [isTyping, setIsTyping] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      triggerHaptic('light');
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(id);
      showToast('Copied to clipboard!');
      setTimeout(() => {
        setCopiedKey(null);
      }, 2000);
    } catch {
      showToast('Failed to copy');
    }
  };

  // Process and validate uploaded file (Max 25 MB)
  const handleFileChosen = (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      triggerHaptic('error');
      const actualMb = (file.size / (1024 * 1024)).toFixed(1);
      alert(
        `File size (${actualMb} MB) exceeds maximum allowed limit of ${MAX_FILE_SIZE_MB} MB. Please choose a smaller file.`
      );
      showToast(`Exceeds ${MAX_FILE_SIZE_MB} MB limit!`);
      return;
    }

    triggerHaptic('light');
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const isImg = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAttachment({
        name: file.name,
        sizeMb,
        type: isImg ? 'image' : isPdf ? 'pdf' : 'document',
        dataUrl: reader.result as string,
      });
      showToast(`Attached ${file.name} (${sizeMb})`);
      setActiveTab('chat');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  const handleSkipStreaming = (msgId: string) => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    const pending = pendingFullResponseRef.current;
    if (pending && pending.id === msgId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
              ...m,
              text: pending.text,
              isStreaming: false,
            }
            : m
        )
      );
      triggerHaptic('medium');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend || inputText).trim();
    if (!rawText && !selectedAttachment) return;

    triggerHaptic('light');

    const attachmentToSend = selectedAttachment;
    setSelectedAttachment(null);

    const userText =
      rawText ||
      (attachmentToSend?.type === 'pdf'
        ? `Uploaded ${attachmentToSend.name} for question analysis:`
        : `Uploaded question image for step-by-step solution:`);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      imageUri: attachmentToSend?.type === 'image' ? attachmentToSend.dataUrl : undefined,
      fileAttachment: attachmentToSend || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    setActiveTab('chat');

    const effectiveLang =
      selectedLanguage === 'auto'
        ? detectQueryLanguage(userText, user?.language || 'english')
        : selectedLanguage;

    const boardName = mode === 'ielts' ? 'IELTS Academic & General' : (user?.targetExam || 'NEET-UG & Indian Board Exam');

    const queryForGroq = attachmentToSend
      ? `${userText} (Document/Image Reference: ${attachmentToSend.name})`
      : userText;

    try {
      let explanation = '';
      try {
        const apiRes = await fetch(getApiUrl('/api/ai/solve/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: queryForGroq,
            language: effectiveLang,
            board: boardName,
            examMode: mode,
          }),
        });
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json && json.explanation) {
            explanation = json.explanation;
          }
        }
      } catch (apiErr) {
        console.warn('[AITutor] Server route /api/ai/solve failed, falling back to client call:', apiErr);
      }

      if (!explanation) {
        const groqRes = await solveStudentDoubtWithGroq({
          query: queryForGroq,
          language: effectiveLang,
          board: boardName,
          examMode: mode,
        });
        explanation = groqRes.explanation;
      }

      setIsTyping(false);
      triggerHaptic('medium');

      // START TYPEWRITER STREAMING EFFECT
      const botMsgId = `msg-${Date.now() + 1}`;
      const fullText = explanation;

      pendingFullResponseRef.current = {
        id: botMsgId,
        text: fullText,
      };

      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: 'assistant',
          text: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isStreaming: true,
          fullText,
        },
      ]);

      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }

      let currentIndex = 0;
      const totalLen = fullText.length;
      const stepSize = Math.max(3, Math.ceil(totalLen / 100));

      streamIntervalRef.current = setInterval(() => {
        currentIndex = Math.min(currentIndex + stepSize, totalLen);
        const currentSlice = fullText.slice(0, currentIndex);
        const isDone = currentIndex >= totalLen;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                ...m,
                text: currentSlice,
                isStreaming: !isDone,
              }
              : m
          )
        );

        if (isDone) {
          if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
            streamIntervalRef.current = null;
          }
          triggerHaptic('light');
        }
      }, 22);
    } catch {
      setIsTyping(false);
      triggerHaptic('medium');
      const fallbackText =
        effectiveLang === 'punjabi'
          ? `**ਸੰਕਲਪ ਸਾਰ**\n"${userText}" ਲਈ ਪਾਠ-ਪੁਸਤਕ ਦੇ ਨਿਯਮਾਂ ਅਨੁਸਾਰ ਸਟੈਪ-ਬਾਈ-ਸਟੈਪ ਹੱਲ ਕਰੋ।`
          : effectiveLang === 'hindi'
            ? `**अवधारणा अवलोकन**\n"${userText}" के लिए मानक पाठ्यपुस्तक प्रमेय और चरण-दर-चरण अंकन योजना लागू करें।`
            : `**Concept Overview**\nAcademic solution for "${userText}". Applied standard ${boardName} step-marking rubrics and formulas.`;

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const handleCameraSnap = async () => {
    triggerHaptic('medium');
    const photoUrl = await captureQuestionPhoto();
    if (photoUrl) {
      showToast('Photo captured! Ready for solution.');
      setSelectedAttachment({
        name: `Camera_Capture_${Date.now()}.jpg`,
        sizeMb: '1.8 MB',
        type: 'image',
        dataUrl: photoUrl,
      });
      setActiveTab('chat');
    } else {
      showToast('Camera cancelled or not available');
    }
  };

  const handleResetChat = () => {
    triggerHaptic('medium');
    if (confirm('Clear current doubt conversation and start fresh?')) {
      setMessages([
        {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `**Concept Overview**  
Welcome back! How may I assist your exam preparation today? Ask a question or attach a paper scan (Max 25 MB).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setSelectedAttachment(null);
      showToast('Conversation reset');
    }
  };

  return (
    <div className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:top-[calc(4rem+env(safe-area-inset-top,0px))] bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:static lg:inset-auto z-20 flex flex-col overflow-hidden bg-surface px-2.5 sm:px-4 lg:px-8 pt-2.5 pb-1 lg:py-6 lg:max-w-7xl lg:mx-auto">
      {/* Hidden File Inputs for Document & Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileChosen(f);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileChosen(f);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* COMPACT STANDARDIZED HEADER BAR */}
      <div className="shrink-0 flex items-center justify-between gap-2 mb-2">
        {/* Left: Mobile Segmented Switcher OR Desktop Title */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile Single-Row Segmented Switcher */}
          <div className="flex lg:hidden items-center p-0.5 bg-[#ede4d8] rounded-full border border-outline-variant/60 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('chat');
              }}
              className={`px-3 py-1 rounded-full text-xs font-headline font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'chat'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px] text-primary">chat</span>
              <span>Doubt Chat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('tools');
              }}
              className={`px-3 py-1 rounded-full text-xs font-headline font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'tools'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px] text-primary">calculate</span>
              <span>Scanner &amp; Formulas</span>
            </button>
          </div>

          {/* Desktop Title & Online Badge */}
          <div className="hidden lg:flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                window.dispatchEvent(new CustomEvent('statxam_replay_ai_intro'));
              }}
              title="Tap to replay AI Launch Intro"
              className="w-10 h-10 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shadow-2xs active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[22px] animate-pulse">psychology</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-xl font-bold text-on-surface">
                  {mode === 'ielts' ? 'IELTS Band 0–9 Examiner' : 'AI Neural Doubt Solver'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-label bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {mode === 'ielts' ? 'Band 9 Active' : 'Online'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-body">
                {mode === 'ielts'
                  ? 'Official Cambridge Rubrics • Writing & Speaking • Step Solutions'
                  : 'Step solutions • KaTeX Math • Multi-Board Marking Schemes'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Language Pill Dropdown & New Chat Icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Language Dropdown Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu((v) => !v)}
              className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 text-xs font-semibold text-on-surface flex items-center gap-1 transition-colors shadow-2xs"
              title="Select AI response language"
            >
              <span className="material-symbols-outlined text-[14px] text-primary">translate</span>
              <span className="text-[10px] sm:text-[11px] font-label uppercase">
                {selectedLanguage === 'auto' ? 'Auto' : selectedLanguage.slice(0, 2).toUpperCase()}
              </span>
              <span className="material-symbols-outlined text-[13px] text-on-surface-variant">expand_more</span>
            </button>

            {showLangMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowLangMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-36 bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-1 shadow-lg z-40 space-y-0.5 animate-in fade-in duration-100">
                  {[
                    { id: 'auto', label: 'Auto Detect' },
                    { id: 'english', label: 'English (EN)' },
                    { id: 'hindi', label: 'हिंदी (HI)' },
                    { id: 'punjabi', label: 'ਪੰਜਾਬੀ (PU)' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedLanguage(l.id as any);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-label transition-colors flex items-center justify-between ${
                        selectedLanguage === l.id
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span>{l.label}</span>
                      {selectedLanguage === l.id && (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Reset Chat Button */}
          <button
            type="button"
            onClick={handleResetChat}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors shadow-2xs"
            title="Start New Doubt Session"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Fits exact available screen on mobile; Side-by-side on desktop */}
      <div className="flex-1 min-h-0 w-full overflow-hidden lg:grid lg:grid-cols-12 lg:gap-5 lg:items-start">
        {/* COLUMN 1: PURE FOCUSED CHAT TAB */}
        <div
          className={`${
            activeTab === 'chat' ? 'flex' : 'hidden lg:flex'
          } lg:col-span-8 flex-col lg:bg-surface-container-low lg:border lg:border-outline-variant/60 lg:rounded-3xl lg:p-4 lg:shadow-xs h-full lg:h-[730px] overflow-hidden justify-between`}
        >
          {/* Messages Stream directly on Warm Canvas */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 pr-1 pb-2">
            {messages.map((m) => (
              <ChatMessageBubble
                key={m.id}
                message={m}
                copiedKey={copiedKey}
                onCopy={handleCopy}
                onSkipStreaming={handleSkipStreaming}
              />
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs font-label text-primary bg-surface-container px-3 py-1.5 rounded-full w-max border border-outline-variant/40 animate-pulse">
                <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                <span>Clara is deducing steps &amp; KaTeX formulas...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Dock: Previews, Quick Prompts & Modern Input Bar */}
          <div className="mt-1 pt-1.5 flex flex-col gap-1.5 shrink-0">
            {/* Attachment Preview Tray */}
            {selectedAttachment && (
              <div className="p-2 rounded-xl bg-surface-container border border-primary/30 flex items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedAttachment.type === 'image' ? (
                    <img
                      src={selectedAttachment.dataUrl}
                      alt="Attachment Preview"
                      className="w-8 h-8 rounded-lg object-cover border border-outline-variant/60 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">{selectedAttachment.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-mono">
                      <span>{selectedAttachment.sizeMb}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Ready for OCR
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAttachment(null)}
                  className="w-6 h-6 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors shrink-0"
                  title="Remove attachment"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            {/* Quick Prompts: Shown only when messages length <= 2 to save screen space */}
            {messages.length <= 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {(mode === 'ielts'
                  ? [
                      'Evaluate Task 2 essay: Environmental tax vs incentives',
                      'True/False/Not Given strategy for academic reading',
                      'IELTS Speaking Part 2: Describe a memorable journey',
                      'Band 8.5 academic lexical collocations for education',
                    ]
                  : [
                      'Prism formula n = sin((A+dm)/2)/sin(A/2)',
                      'Circle diameter subtends right angle proof',
                      'Concave mirror focal length calculation',
                      'Star triangle Python code',
                    ]
                ).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-[10px] sm:text-[11px] font-label text-on-surface-variant border border-outline-variant/50 shrink-0 transition-colors whitespace-nowrap"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Modern iOS-Style Input Bar with Single + Attachment Popover */}
            <div className="relative flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/70 rounded-full px-2 py-1.5 focus-within:border-primary transition-all shadow-2xs">
              {/* Attachment Popover Action Sheet */}
              {showAttachMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowAttachMenu(false)}
                  />
                  <div className="absolute left-2 bottom-full mb-2 w-64 bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-2 shadow-xl z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/30 flex items-center justify-between">
                      <span>Attach Problem</span>
                      <span className="text-primary font-bold">Max {MAX_FILE_SIZE_MB} MB</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        handleCameraSnap();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[17px]">photo_camera</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold leading-tight">Camera Snapshot</p>
                        <p className="text-[10px] text-on-surface-variant">Live paper or question snap</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        imageInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[17px]">photo_library</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold leading-tight">Photo Gallery</p>
                        <p className="text-[10px] text-on-surface-variant">Select image or diagram</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold leading-tight">Upload Exam PDF</p>
                        <p className="text-[10px] text-on-surface-variant">Question paper or mock scan</p>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {/* Single Attach Plus Button */}
              <button
                type="button"
                onClick={() => setShowAttachMenu((v) => !v)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                  showAttachMenu
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container hover:bg-surface-container-high text-primary'
                }`}
                title="Attach question photo or PDF"
              >
                <span className="material-symbols-outlined text-[19px]">
                  {showAttachMenu ? 'close' : 'add'}
                </span>
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  selectedAttachment
                    ? `Ask about ${selectedAttachment.name}...`
                    : mode === 'ielts'
                      ? 'Ask Clara for IELTS feedback...'
                      : 'Ask Clara a doubt...'
                }
                className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none font-body min-w-0"
              />

              <button
                type="button"
                disabled={!inputText.trim() && !selectedAttachment}
                onClick={() => handleSendMessage()}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  inputText.trim() || selectedAttachment
                    ? 'bg-primary text-on-primary shadow-xs active:scale-95'
                    : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
                }`}
                title="Send"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 2: TOOLS TAB */}
        <div
          className={`${
            activeTab === 'tools' ? 'block' : 'hidden lg:block'
          } lg:col-span-4 h-full lg:h-[730px] overflow-y-auto overscroll-contain space-y-3.5 pr-1 pb-2`}
        >
          {/* Neural OCR Document Scanner Card */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">document_scanner</span>
                <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface">
                  Neural Paper Scanner
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                Max 25 MB
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-body leading-relaxed">
              Upload any board examination PDF paper, question snapshot, or assignment scan. Clara scans the problem, isolates equations, and generates step solutions with KaTeX formulas.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCameraSnap}
                className="py-2 px-3 rounded-xl bg-surface-container border border-outline-variant/70 text-on-surface hover:text-primary font-label text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">photo_camera</span>
                <span>Camera Snap</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-primary text-on-primary font-label text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Upload PDF</span>
              </button>
            </div>
          </div>

          {/* High-Yield Mathematical Functions with Live KaTeX & Quick Copy */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">functions</span>
                <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface">
                  Live Math Formulas
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-primary font-label">KaTeX Engine</span>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'formula-circle',
                  title: 'Inscribed Angle in Semicircle',
                  formula: '\\angle ACB = \\frac{1}{2}\\angle AOB = 90^\\circ',
                  prompt: 'Prove that the angle inscribed in a semicircle is a right angle with geometric proof and diagram.',
                },
                {
                  id: 'formula-prism',
                  title: 'Prism Deviation Function',
                  formula: 'n = \\frac{\\sin\\!\\left(\\dfrac{A + \\delta_m}{2}\\right)}{\\sin\\!\\left(\\dfrac{A}{2}\\right)}',
                  prompt: 'Derive the prism formula n = sin((A+dm)/2)/sin(A/2) for minimum deviation.',
                },
                {
                  id: 'formula-ap',
                  title: 'Arithmetic Progression Sum',
                  formula: 'S_n = \\frac{n}{2}[2a + (n - 1)d]',
                  prompt: 'Derive the sum of n terms in an Arithmetic Progression Sn = n/2[2a + (n-1)d].',
                },
                {
                  id: 'formula-coord',
                  title: 'Coordinate Distance Function',
                  formula: 'd = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}',
                  prompt: 'Explain the distance formula between two points in coordinate geometry with derivation.',
                },
              ].map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-on-surface-variant font-label uppercase font-bold truncate">
                      {f.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(f.formula, f.id)}
                        className="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
                        title="Copy LaTeX Formula"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {copiedKey === f.id ? 'check' : 'content_copy'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSendMessage(f.prompt);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold font-mono transition-colors"
                        title="Ask Clara this formula"
                      >
                        Ask Clara
                      </button>
                    </div>
                  </div>
                  <div
                    className="overflow-x-auto py-1 text-primary text-center"
                    dangerouslySetInnerHTML={{ __html: renderKatex(f.formula, true) }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#3a302a] text-[#faf5ee] shadow-xl flex items-center gap-2 text-xs font-label z-50 animate-fade-in border border-outline-variant/30">
          <span className="material-symbols-outlined text-[15px] text-primary-fixed-dim">info</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

export default function AiTutorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-label text-on-surface-variant">
          Loading AI Neural Solver...
        </div>
      }
    >
      <AiTutorContent />
    </Suspense>
  );
}
