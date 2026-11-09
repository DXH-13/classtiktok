/**
 * Engine tính điểm dựa trên thời gian trả lời
 */

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

/**
 * Kiểm tra đáp án trắc nghiệm (A/B/C/D)
 * @param {string} userAnswer
 * @param {string} correctAnswer
 * @returns {boolean}
 */
function checkMultipleChoice(userAnswer, correctAnswer) {
  if (!userAnswer) return false;
  const u = userAnswer.trim().toUpperCase();
  const c = correctAnswer.trim().toUpperCase();
  // Chấp nhận "A", "a", "đáp án A", "chọn A", v.v.
  const match = u.match(/\b([ABCD])\b/);
  return match ? match[1] === c : false;
}

/**
 * Kiểm tra đáp án text / vua tiếng Việt
 * Bỏ qua dấu, viết thường, khoảng trắng thừa
 * @param {string} userAnswer
 * @param {string} correctAnswer
 * @returns {boolean}
 */
function checkTextAnswer(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return false;
  const normalize = (s) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // bỏ dấu
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const u = normalize(userAnswer);
  const c = normalize(correctAnswer);
  return u === c || u.includes(c) || c.includes(u);
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

module.exports = { calculateScore, checkAnswer, checkMultipleChoice, checkTextAnswer };
