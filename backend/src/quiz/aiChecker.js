/**
 * aiChecker.js — Chấm đáp án bằng Gemini, chạy cho MỖI comment mới.
 *
 * Luồng (xem thêm manager.js):
 *  1. Luật (scoreEngine.classifyAnswer) chấm ngay lập tức để overlay/
 *     leaderboard không phải đợi AI — điểm theo thời gian được tính từ
 *     lúc comment tới, không phải lúc AI trả về.
 *  2. Gemini chạy nền, không chặn (async). Nếu Gemini kết luận khác luật
 *     và confidence >= AI_MIN_CONFIDENCE (mặc định 0.8) thì manager sẽ
 *     sửa lại điểm + leaderboard qua gameState.reviseAnswer().
 *  3. Gemini lỗi / hết timeout / không có key -> giữ nguyên kết quả luật.
 *
 * Không cần cài thêm package: dùng fetch có sẵn của Node 18+.
 * Key đọc từ env GEMINI_API_KEY (file backend/.env, đã có trong .gitignore).
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 8000);
const AI_MIN_CONFIDENCE = Number(process.env.AI_MIN_CONFIDENCE || 0.8);
const AI_MAX_CONCURRENT = Number(process.env.AI_MAX_CONCURRENT || 5);

function isAIEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// --- Cache: cùng 1 câu hỏi + cùng 1 nội dung comment -> khỏi gọi lại ---
// Key: `${questionId}|${normalizedUserAnswer}|${normalizedCorrectAnswer}`
const cache = new Map();
const CACHE_MAX = 500;
function cacheGet(key) {
  return cache.get(key) || null;
}
function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
}
function clearCache() {
  cache.clear();
}

// --- Giới hạn số call Gemini chạy cùng lúc (live đông không bắn ồ ạt) ---
let running = 0;
const waiters = [];
function acquireSlot() {
  if (running < AI_MAX_CONCURRENT) {
    running += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(resolve));
}
function releaseSlot() {
  running -= 1;
  if (waiters.length > 0) {
    running += 1;
    waiters.shift()();
  }
}

function buildPrompt({ questionType, questionText, options, userAnswer, correctAnswer }) {
  const optionLines = options
    ? ['A. ' + options.A, 'B. ' + options.B, 'C. ' + options.C, 'D. ' + options.D]
        .filter(Boolean)
        .join('\n')
    : '';
  return [
    'Bạn là giám khảo chấm đáp án quiz trên TikTok Live. Chỉ trả về JSON, không giải thích dài.',
    '',
    'Câu hỏi: ' + (questionText || '(không có nội dung)'),
    optionLines ? 'Các lựa chọn:\n' + optionLines : '',
    'Đáp án đúng (chỉ giám khảo biết, KHÔNG tiết lộ cho thí sinh): ' + correctAnswer,
    'Câu trả lời của thí sinh trong comment: ' + JSON.stringify(userAnswer),
    '',
    'Quy tắc:',
    '- Trắc nghiệm: thí sinh có thể viết "A", "đáp án A", "chọn A nhé", "1" (= A), "câu A ạ".',
    '  Viết 2 đáp án khác nhau ("A hoặc B", "A/B") là KHÔNG rõ ràng -> isCorrect=false, confidence thấp.',
    '- Điền từ / Vua Tiếng Việt: chấp nhận sai chính tả nhẹ, thiếu/thừa dấu, viết tắt quen thuộc,',
    '  thêm từ đệm ("cái bàn" cho đáp án "bàn"). Không chấp nhận từ khác nghĩa hoặc chỉ chứa 1 phần',
    '  của đáp án dài (ví dụ đáp án "cần cù" mà chỉ viết "cần" là chưa đủ).',
    '- Tiếng Việt: "dap an a" (không dấu) tương đương "đáp án A".',
    '',
    'Chỉ trả về đúng JSON này (không thêm markdown, không thêm chữ ngoài JSON):',
    '{"isCorrect": true, "confidence": 0.9, "reason": "lý do ngắn gọn bằng tiếng Việt"}',
  ]
    .filter(Boolean)
    .join('\n');
}

function parseGeminiJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (typeof obj.isCorrect !== 'boolean') return null;
    const confidence = Number(obj.confidence);
    return {
      isCorrect: obj.isCorrect,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
      reason: typeof obj.reason === 'string' ? obj.reason : '',
    };
  } catch {
    return null;
  }
}

/**
 * Gọi Gemini chấm 1 đáp án.
 * @returns {Promise<{isCorrect, confidence, reason, source}|null>}
 *  null = không gọi được (hết key/timeout/lỗi) -> caller giữ kết quả luật.
 */
async function checkWithGemini({ questionId, questionType, questionText, options, userAnswer, correctAnswer }) {
  if (!isAIEnabled()) return null;
  if (!userAnswer || !String(userAnswer).trim()) return null;

  const cacheKey = [
    questionId ?? '?',
    String(userAnswer).trim().toLowerCase(),
    String(correctAnswer || '').trim().toLowerCase(),
  ].join('|');
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  await acquireSlot();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt({ questionType, questionText, options, userAnswer, correctAnswer }) }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 200 },
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.error(`[AI] Gemini HTTP ${res.status} (giữ kết quả luật)`);
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const parsed = parseGeminiJson(text);
    if (!parsed) {
      console.error('[AI] Gemini trả về không parse được JSON (giữ kết quả luật)');
      return null;
    }
    const result = { ...parsed, source: 'gemini' };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[AI] Gemini lỗi (giữ kết quả luật):', err.name === 'AbortError' ? 'timeout' : err.message);
    return null;
  } finally {
    releaseSlot();
  }
}

module.exports = { isAIEnabled, checkWithGemini, clearCache, AI_MIN_CONFIDENCE };
