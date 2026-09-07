import mammoth from 'mammoth';
import { Question } from '../types';

/**
 * Extracts text from DOCX, PDF or TXT files in browser.
 * For DOCX, preserves formatting markers (bold, underline) to detect teacher-highlighted answers.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();

    // 1. Try converting to HTML to capture bold and underline styling (often used to mark correct options)
    try {
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const html = htmlResult.value;

      if (html && html.trim().length > 20) {
        // Tag bolded or underlined text with special markers
        // E.g. <strong>A.</strong> or <b>A.</b> or <u>A.</u> or <strong>A</strong>
        let tagged = html
          // Mark bold/underlined option letters or entire options:
          .replace(/<(?:strong|b|u)>\s*([A-Da-d][\.\:\)\-])\s*<\/(?:strong|b|u)>/gi, ' __CORRECT_KEY__ $1 ')
          .replace(/<(?:strong|b|u)>([\s\S]*?)<\/(?:strong|b|u)>/gi, (_, content) => {
            // If the bold/underlined segment starts with an option letter like "A." or "A -", mark it
            if (/^\s*[A-Da-d][\.\:\)\-]/.test(content)) {
              return ` __CORRECT_KEY__ ${content}`;
            }
            return ` ${content} `;
          })
          // Replace line-breaking HTML tags with newlines
          .replace(/<\/(?:p|div|h[1-6]|tr|li)>/gi, '\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/td>/gi, '\t')
          // Strip all remaining HTML tags
          .replace(/<[^>]+>/g, '')
          // Decode common HTML entities
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'");

        return tagged;
      }
    } catch {
      // Fallback to raw text extraction if HTML conversion fails
    }

    const rawResult = await mammoth.extractRawText({ arrayBuffer });
    return rawResult.value;
  } else if (extension === 'txt') {
    return await file.text();
  } else if (extension === 'pdf') {
    // For PDFs in pure browser client without heavy external worker:
    try {
      const text = await file.text();
      // Extract visible text stream objects if uncompressed
      const matches = text.match(/\(([^)]+)\)\s*Tj/g) || text.match(/\[([^\]]+)\]\s*TJ/g);
      if (matches && matches.length > 5) {
        const extracted = matches
          .map((m) => m.replace(/^[\(\[]/, '').replace(/[\)\]]\s*T[jJ]$/, ''))
          .join(' ');
        if (extracted.trim().length > 30) {
          return extracted;
        }
      }
    } catch {
      // Fallback
    }
    return await file.text();
  } else {
    throw new Error('Định dạng file không hỗ trợ. Vui lòng tải file Word (.docx), PDF hoặc .txt');
  }
}

/**
 * Extracts an Answer Key Map (e.g. { 1: 0, 2: 1, 3: 2, ... })
 * from answer tables or summary lists commonly placed at the end of exam documents.
 */
function extractAnswerKeyMap(text: string): Record<number, number> {
  const map: Record<number, number> = {};

  // Find where answer key section starts
  const keyHeaderRegex =
    /(?:BẢNG\s*ĐÁP\s*ÁN|ĐÁP\s*ÁN|HƯỚNG\s*DẪN\s*CHẤM|HƯỚNG\s*DẪN\s*GIẢI|LỜI\s*GIẢI|PHẦN\s*ĐÁP\s*ÁN|KEY|ANSWERS?)[:\s\*\#\_\-]*/i;

  const match = text.search(keyHeaderRegex);
  if (match === -1) return map;

  const keySection = text.slice(match);

  // Pattern: "1.A", "1-A", "1: A", "Câu 1: A", "1A", "1 B", etc.
  const pairRegex = /(?:Câu\s*)?(\d+)[\.\:\-\s]+([A-Da-d])\b/g;
  let pairMatch: RegExpExecArray | null;

  while ((pairMatch = pairRegex.exec(keySection)) !== null) {
    const qNum = parseInt(pairMatch[1], 10);
    const letter = pairMatch[2].toUpperCase();
    const idx = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
    if (qNum > 0 && idx >= 0 && idx <= 3) {
      map[qNum] = idx;
    }
  }

  // Also check compact grid: "1A 2B 3C 4D"
  if (Object.keys(map).length === 0) {
    const compactRegex = /\b(\d+)([A-Da-d])\b/g;
    let compactMatch: RegExpExecArray | null;
    while ((compactMatch = compactRegex.exec(keySection)) !== null) {
      const qNum = parseInt(compactMatch[1], 10);
      const idx = compactMatch[2].toUpperCase().charCodeAt(0) - 65;
      if (qNum > 0 && idx >= 0 && idx <= 3) {
        map[qNum] = idx;
      }
    }
  }

  return map;
}

/**
 * Parses raw text into structured Questions.
 * Automatically recognizes correct answers from:
 * 1. Dedicated answer lines ("Đáp án: A", "Đ/a: B", "Key: C", "Chọn D", "Lời giải: A"...)
 * 2. Word bold/underline formatting markers (__CORRECT_KEY__)
 * 3. Option prefixes (*A., [x] A., ✓ A., A*.)
 * 4. Option suffixes ("(Đúng)", "(Đáp án đúng)", "[x]", "*")
 * 5. Inline question markers ("Câu 1 (Đáp án B): ...")
 * 6. Bottom Answer Key tables/lists (Bảng đáp án: 1.A 2.B 3.C...)
 *
 * Cleans all marker artifacts so students don't see spoiled answers during the game.
 */
export function parseQuestionsFromText(rawText: string): Question[] {
  const answerKeyMap = extractAnswerKeyMap(rawText);

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const questions: Question[] = [];
  let currentQNumber: number | null = null;
  let currentQText = '';
  let currentOptions: string[] = [];
  let currentCorrect = -1;
  let hasExplicitAnswer = false;

  // Regular expressions for question detection
  const qStartRegex = /^(?:Câu\s*(\d+)[:.]|Bài\s*(\d+)[:.]|(\d+)[\.\)]|\?\s+)/i;

  // Options A. B. C. D.
  const optRegex = /^(?:__CORRECT_KEY__\s*)?(?:[\*✓✔√►▶●\-\+]|\([xXvV]\)|\[[xXvV]\])?\s*([A-Da-d])[\.\)\:\-]\s*(.*)$/;

  // Answer indicator lines:
  // "Đáp án: A", "Đáp án đúng là: B", "Đ/a: C", "Đ/A: D", "ĐA: A", "Key: B", "Chọn: C", "Lời giải: D", etc.
  const ansRegex =
    /(?:Đáp\s*án(?:\s*đúng)?(?:\s*là)?|Đ\/[aA]|ĐA|Đ\.A|Key|Answer|Ans|Trả\s*lời|Câu\s*trả\s*lời|Câu\s*đúng|Chọn(?:\s*đáp\s*án|\s*phương\s*án)?|Lời\s*giải(?:\s*chọn)?|Hướng\s*dẫn(?:\s*giải)?(?:\s*chọn)?|Đúng)[:\s\-\.]*([A-Da-d])\b/i;

  // Inline question answer marker: e.g. "Câu 1 (Đáp án B): ..." or "(Đ/a: C)"
  const inlineQuestionAnsRegex =
    /[\(\[\{](?:Đáp\s*án(?:\s*đúng)?|Đ\/[aA]|ĐA|Key|Answer)[:\s\-]*([A-Da-d])[\)\]\}]/i;

  // Suffix markers on option text indicating correct answer: e.g. "(Đúng)", "(Đáp án đúng)", "[x]"
  const optionCorrectSuffixRegex =
    /\s*(?:[\(\[](?:đúng|đáp\s*án\s*đúng|chính\s*xác|true|[xXvV])[\)\]]|\*|✓|✔|√)\s*$/i;

  const saveCurrent = () => {
    if (currentQText.trim().length > 0) {
      let finalOptions = [...currentOptions];
      if (finalOptions.length < 2) {
        finalOptions = ['Đúng', 'Sai'];
      }

      // Check if answer can be resolved from the bottom Answer Key Map
      const qIndex = questions.length + 1;
      const numToLookup = currentQNumber || qIndex;
      if (!hasExplicitAnswer && answerKeyMap[numToLookup] !== undefined) {
        const mappedAns = answerKeyMap[numToLookup];
        if (mappedAns >= 0 && mappedAns < finalOptions.length) {
          currentCorrect = mappedAns;
          hasExplicitAnswer = true;
        }
      }

      // Clean any answer markers that might have leaked into question text
      let cleanedQText = currentQText.replace(inlineQuestionAnsRegex, '').trim();

      // Clean any markers from final options
      finalOptions = finalOptions.map((opt) =>
        opt
          .replace(/^__CORRECT_KEY__\s*/, '')
          .replace(optionCorrectSuffixRegex, '')
          .replace(/^\*+\s*/, '')
          .replace(/\*+$/, '')
          .trim()
      );

      const needsConfirm =
        !hasExplicitAnswer || currentCorrect < 0 || currentCorrect >= finalOptions.length;

      questions.push({
        id: 'q_parsed_' + Math.random().toString(36).substring(2, 9),
        text: cleanedQText,
        options: finalOptions,
        correctOptionIndex: needsConfirm ? 0 : currentCorrect,
        needsConfirmation: needsConfirm,
      });
    }

    currentQNumber = null;
    currentQText = '';
    currentOptions = [];
    currentCorrect = -1;
    hasExplicitAnswer = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line indicates an answer key
    const ansMatch = line.match(ansRegex);
    if (ansMatch) {
      const letter = ansMatch[1].toUpperCase();
      const idx = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      if (idx >= 0 && idx <= 3) {
        currentCorrect = idx;
        hasExplicitAnswer = true;
      }
      continue;
    }

    // Check if line starts a new question
    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      saveCurrent();
      const qNum = parseInt(qMatch[1] || qMatch[2] || qMatch[3] || '0', 10);
      if (qNum > 0) currentQNumber = qNum;

      // Check if question title contains inline answer
      const inlineMatch = line.match(inlineQuestionAnsRegex);
      if (inlineMatch) {
        const letter = inlineMatch[1].toUpperCase();
        currentCorrect = letter.charCodeAt(0) - 65;
        hasExplicitAnswer = true;
      }

      currentQText = line.replace(qStartRegex, '').replace(inlineQuestionAnsRegex, '').trim();
      continue;
    }

    // Check if line starts an option
    const optMatch = line.match(optRegex);
    if (optMatch) {
      const letter = optMatch[1].toUpperCase();
      const letterIdx = letter.charCodeAt(0) - 65;
      let optText = optMatch[2].trim();

      // Check all possible indicators of a correct option:
      // a) Has Word bold/underline marker __CORRECT_KEY__
      // b) Starts with asterisk or checkmark: "*A.", "✓ A."
      // c) Has asterisk immediately after letter: "A*.", "A.*"
      // d) Ends with "(Đúng)", "(Đáp án đúng)", "[x]", "*"
      const isWordMarked = line.includes('__CORRECT_KEY__');
      const isPrefixMarked = /^[\*✓✔√►▶●]/.test(line) || /^[\[\(][xXvV][\]\)]/.test(line);
      const isLetterMarked = /^[A-Da-d]\s*\*[\.\)\:\-]/.test(line);
      const isSuffixMarked = optionCorrectSuffixRegex.test(optText);

      if (isWordMarked || isPrefixMarked || isLetterMarked || isSuffixMarked) {
        currentCorrect = letterIdx;
        hasExplicitAnswer = true;
        optText = optText.replace(optionCorrectSuffixRegex, '').replace(/\*+/g, '').trim();
      }

      // Check if option line contains inline answer note (e.g. "A. Chuột - Đáp án đúng")
      const inlineAns = optText.match(ansRegex);
      if (inlineAns) {
        const char = inlineAns[1].toUpperCase();
        currentCorrect = char.charCodeAt(0) - 65;
        hasExplicitAnswer = true;
        optText = optText.replace(ansRegex, '').trim();
      }

      currentOptions.push(optText || `Phương án ${letter}`);
      continue;
    }

    // Also handle multiple options on a single line:
    // e.g.: "A. con chuột   *B. bàn phím   C. màn hình   D. thân máy"
    if (line.includes('B.') && (line.includes('C.') || line.includes('D.'))) {
      const parts = line.split(/(?=[A-D]\.)/g);
      if (parts.length >= 2) {
        for (const p of parts) {
          const trimmedP = p.trim();
          const match = trimmedP.match(optRegex);
          if (match) {
            const letter = match[1].toUpperCase();
            const letterIdx = letter.charCodeAt(0) - 65;
            let optText = match[2].trim();

            if (
              trimmedP.includes('__CORRECT_KEY__') ||
              trimmedP.startsWith('*') ||
              optionCorrectSuffixRegex.test(optText)
            ) {
              currentCorrect = letterIdx;
              hasExplicitAnswer = true;
              optText = optText.replace(optionCorrectSuffixRegex, '').replace(/\*+/g, '').trim();
            }

            currentOptions.push(optText);
          }
        }
        continue;
      }
    }

    // Continuation line
    if (currentOptions.length > 0) {
      // Append to last option
      currentOptions[currentOptions.length - 1] += ' ' + line;
    } else if (currentQText.length > 0) {
      // Append to question text
      currentQText += ' ' + line;
    } else {
      // Standalone question without "Câu X:" prefix
      currentQText = line;
    }
  }

  // Save the last pending question
  saveCurrent();

  return questions;
}
