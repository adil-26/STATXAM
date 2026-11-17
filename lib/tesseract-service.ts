/**
 * Tesseract.js Client-Side OCR Service
 * Performs high-precision optical character recognition on images, scans, and PDFs.
 */

/**
 * Extract raw text from text-based or hybrid PDF ArrayBuffer
 */
export function extractTextFromPdfArrayBuffer(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(bytes);

    const extractedChunks: string[] = [];

    // Extract text blocks between BT (Begin Text) and ET (End Text)
    const btMatches = content.match(/BT[\s\S]*?ET/g) || [];
    for (const bt of btMatches) {
      // Find strings inside parentheses ( ... ) followed by Tj or TJ
      const stringMatches = bt.match(/\(([^()]*)\)\s*T[jJ]/g) || [];
      for (const sm of stringMatches) {
        const cleaned = sm
          .replace(/^\(/, '')
          .replace(/\)\s*T[jJ]$/, '')
          .replace(/\\([()\\])/g, '$1')
          .trim();
        if (cleaned.length > 0) {
          extractedChunks.push(cleaned);
        }
      }

      // Also match hex strings < ... > followed by Tj or TJ
      const hexMatches = bt.match(/<([0-9a-fA-F]+)>\s*T[jJ]/g) || [];
      for (const hm of hexMatches) {
        const hex = hm.replace(/^</, '').replace(/>\s*T[jJ]$/, '');
        let decoded = '';
        for (let i = 0; i < hex.length; i += 2) {
          const code = parseInt(hex.substr(i, 2), 16);
          if (code >= 32 && code <= 126) {
            decoded += String.fromCharCode(code);
          }
        }
        if (decoded.length > 0) {
          extractedChunks.push(decoded);
        }
      }
    }

    const result = extractedChunks.join(' ').replace(/\s+/g, ' ').trim();
    return result;
  } catch (err) {
    console.warn('[PdfTextExtractor] Failed extracting raw text stream from PDF buffer:', err);
    return '';
  }
}

/**
 * Execute Tesseract OCR on an image file, scan, or canvas
 */
export async function recognizeTextWithTesseract(
  fileOrBlob: File | Blob | string,
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  // Wrap with a 20-second timeout so it never hangs indefinitely
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('Tesseract OCR engine timed out (20s limit).')), 20000);
  });

  const ocrPromise = (async () => {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (onProgress && typeof m.progress === 'number') {
            onProgress(Math.round(m.progress * 100), m.status || 'Extracting characters');
          }
        },
      });

      const ret = await worker.recognize(fileOrBlob);
      await worker.terminate();
      return ret.data.text.trim();
    } catch (err) {
      console.warn('[TesseractService] Tesseract worker execution failed:', err);
      throw err;
    }
  })();

  return Promise.race([ocrPromise, timeoutPromise]);
}
