/**
 * Engine tính điểm dựa trên thời gian trả lời
 */

// --- Chuẩn hoá tiếng Việt: viết thường, bỏ dấu, đ -> d, bỏ dấu câu ---
function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Khoảng cách Levenshtein (đo sai chính tả), dùng cho đáp án điền từ
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const cur = [i];
    for (let j = 1; j <= n; j += 1) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * Tính điểm cho 1 câu trả lời
 * @param {boolean} isCorrect - Đúng hay sai
 * @param {number} responseTime - Thời gian trả lời (giây, tính từ lúc câu hỏi bắt đầu)
 * @param {number} timeLimit - Tổng thời gian cho phép (giây)
 * @param {number} baseScore - Điểm cơ bản nếu trả lời đúng
 * @returns {number} điểm
 */
function calculateScore(isCorrect, responseTime, timeLimit, baseScore = 100) {
  if (!isCorrect) return 0;

  // Clamp responseTime vào [0, timeLimit]
  const t = Math.max(0, Math.min(responseTime, timeLimit));

  // Hệ số thời gian: trả lời ngay = 1.0, trả lời muộn nhất = 0.2
  // Công thức: timeFactor = 0.2 + 0.8 * ((timeLimit - t) / timeLimit)
  const timeFactor = 0.2 + 0.8 * ((timeLimit - t) / timeLimit);

  return Math.round(baseScore * timeFactor);
}

// Map số 1-4 -> A-D (người xem hay trả lời bằng số)
const DIGIT_TO_LETTER = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };

// Lấy các chữ A-D / số 1-4 xuất hiện như 1 "từ" riêng trong comment.
// Ví dụ: "đáp án A" -> ['A'], "A hoặc B" -> ['A','B'], "1" -> ['A'], "AB" -> [].
function extractChoices(userAnswer) {
  const u = String(userAnswer || '').trim().toUpperCase();
  const letters = [...u.matchAll(/\b([ABCD])\b/g)].map((m) => m[1]);
  const digits = [...u.matchAll(/\b([1234])\b/g)].map((m) => DIGIT_TO_LETTER[m[1]]);
  return [...new Set([...letters, ...digits])];
}

/**
 * Kiểm tra đáp án trắc nghiệm (A/B/C/D)
 * @param {string} userAnswer
 * @param {string} correctAnswer
 * @returns {boolean}
 */
function checkMultipleChoice(userAnswer, correctAnswer) {
  if (!userAnswer) return false;
  const c = String(correctAnswer || '').trim().toUpperCase();
  const choices = extractChoices(userAnswer);
  // Chỉ đúng khi comment nêu ĐÚNG 1 lựa chọn và đó là đáp án đúng.
  // Nêu 2 lựa chọn ("A hoặc B") -> không tính đúng, để AI phân xử.
  return choices.length === 1 && choices[0] === c;
}

/**
 * Kiểm tra đáp án text / vua tiếng Việt
 * Bỏ qua dấu, viết thường, khoảng trắng thừa, chấp nhận sai chính tả nhẹ.
 * ĐÃ BỎ kiểu cũ "u.includes(c) || c.includes(u)" vì nó nhận nhầm quá nhiều
 * (ví dụ đáp án "an" thì "bàn" cũng thành đúng).
 * @param {string} userAnswer
 * @param {string} correctAnswer
 * @returns {boolean}
 */
function checkTextAnswer(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return false;
  const u = normalizeText(userAnswer);
  const c = normalizeText(correctAnswer);
  if (!u || !c) return false;
  if (u === c) return true;
  // Sai chính tả nhẹ: khoảng cách Levenshtein nhỏ so với độ dài đáp án.
  const dist = levenshtein(u, c);
  const allowed = c.length <= 3 ? 0 : Math.max(1, Math.floor(c.length * 0.2));
  return dist <= allowed;
}

/**
 * Phân loại 1 comment để biết luật đã chắc chưa, hay cần Gemini xem thêm.
 * @returns {{verdict: 'correct'|'wrong'|'ambiguous', confidence: number, ruleIsCorrect: boolean}}
 *  - correct/wrong: luật đã đủ chắc, Gemini chỉ để đối chiếu (per-comment).
 *  - ambiguous: luật không kết luận được, NHẤT ĐỊNH cần Gemini
 *    (ví dụ: "A hoặc B", không có chữ A-D, đáp án điền từ thừa/thiếu từ).
 */
function classifyAnswer(questionType, userAnswer, correctAnswer) {
  const text = String(userAnswer || '').trim();
  if (!text) return { verdict: 'wrong', confidence: 1, ruleIsCorrect: false };

  if (questionType === 'text_answer' || questionType === 'vua_tieng_viet') {
    const u = normalizeText(text);
    const c = normalizeText(correctAnswer);
    if (!u || !c) return { verdict: 'wrong', confidence: 1, ruleIsCorrect: false };
    if (u === c) return { verdict: 'correct', confidence: 0.95, ruleIsCorrect: true };
    const dist = levenshtein(u, c);
    const allowed = c.length <= 3 ? 0 : Math.max(1, Math.floor(c.length * 0.2));
    if (dist <= allowed) return { verdict: 'correct', confidence: 0.8, ruleIsCorrect: true };
    // Chứa nhau nhưng không khớp hẳn ("cái bàn" vs "bàn", "cần" vs "cần cù")
    // -> mơ hồ, để Gemini quyết chứ không tự nhận đúng như trước.
    if (u.includes(c) || c.includes(u)) {
      return { verdict: 'ambiguous', confidence: 0.5, ruleIsCorrect: false };
    }
    return { verdict: 'wrong', confidence: 0.9, ruleIsCorrect: false };
  }

  // multiple_choice (mặc định)
  const choices = extractChoices(text);
  const c = String(correctAnswer || '').trim().toUpperCase();
  if (choices.length === 1) {
    const ok = choices[0] === c;
    return { verdict: ok ? 'correct' : 'wrong', confidence: 0.95, ruleIsCorrect: ok };
  }
  if (choices.length > 1) {
    return { verdict: 'ambiguous', confidence: 0.5, ruleIsCorrect: false };
  }
  // Không nêu chữ/số nào ("Hà Nội" thay vì "B", "đáp án đầu tiên"...)
  // -> mơ hồ, để Gemini đối chiếu với nội dung các lựa chọn.
  return { verdict: 'ambiguous', confidence: 0.5, ruleIsCorrect: false };
}

/**
 * Kiểm tra đáp án theo loại câu hỏi
 * @param {string} questionType
 * @param {string} userAnswer
 * @param {string} correctAnswer
 * @returns {boolean}
 */
function checkAnswer(questionType, userAnswer, correctAnswer) {
  switch (questionType) {
    case 'multiple_choice':
      return checkMultipleChoice(userAnswer, correctAnswer);
    case 'text_answer':
    case 'vua_tieng_viet':
      return checkTextAnswer(userAnswer, correctAnswer);
    default:
      return checkMultipleChoice(userAnswer, correctAnswer);
  }
}

module.exports = {
  calculateScore,
  checkAnswer,
  checkMultipleChoice,
  checkTextAnswer,
  classifyAnswer,
  normalizeText,
  levenshtein,
};
