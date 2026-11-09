/**
 * Quản lý trạng thái game trong memory (realtime)
 * DB chỉ dùng để lưu kết quả lâu dài
 */

class GameState {
  constructor() {
    // Map sessionId -> state
    this.sessions = new Map();
  }

  /**
   * Khởi tạo session mới
   */
  initSession(sessionId, quizSetId) {
    this.sessions.set(sessionId, {
      sessionId,
      quizSetId,
      status: 'waiting', // waiting | active | paused | ended
      currentQuestion: null,     // Question object
      questionStartTime: null,   // Date.now() khi câu hỏi bắt đầu
      questionIndex: -1,
      players: new Map(),        // tiktokUserId -> Player object
      questionAnswers: new Map(), // tiktokUserId -> { answer, time, score, isCorrect }
    });
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Bắt đầu 1 câu hỏi mới
   */
  startQuestion(sessionId, question) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.currentQuestion = question;
    session.questionStartTime = Date.now();
    session.questionAnswers = new Map();
    session.status = 'active';
  }

  /**
   * Kết thúc câu hỏi hiện tại
   */
  endQuestion(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = 'paused';
  }

  /**
   * Ghi nhận đáp án của người chơi
   * @returns {object|null} kết quả { isCorrect, score, responseTime } hoặc null nếu đã trả lời
   */
  recordAnswer(sessionId, tiktokUserId, nickname, avatarUrl, answerText, isCorrect, score) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active' || !session.questionStartTime) return null;

    // Mỗi người chỉ trả lời 1 lần mỗi câu
    if (session.questionAnswers.has(tiktokUserId)) return null;

    const responseTime = (Date.now() - session.questionStartTime) / 1000;

    const result = { answerText, isCorrect, score, responseTime, nickname, avatarUrl };
    session.questionAnswers.set(tiktokUserId, result);

    // Cập nhật player
    if (!session.players.has(tiktokUserId)) {
      session.players.set(tiktokUserId, {
        tiktokUserId,
        nickname,
        avatarUrl,
        totalScore: 0,
        correctCount: 0,
        wrongCount: 0,
      });
    }
    const player = session.players.get(tiktokUserId);
    player.totalScore += score;
    if (isCorrect) player.correctCount += 1;
    else player.wrongCount += 1;

    return result;
  }

  /**
   * Sửa lại 1 đáp án đã ghi nhận — dùng khi Gemini kết luận khác luật.
   * Chỉ cộng/trừ phần chênh lệch điểm, KHÔNG tính lại responseTime
   * (thời gian trả lời vẫn là lúc comment tới).
   * @returns {object|null} entry đã sửa, hoặc null nếu không có gì thay đổi
   */
  reviseAnswer(sessionId, tiktokUserId, isCorrect, score) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const entry = session.questionAnswers.get(tiktokUserId);
    if (!entry) return null;
    if (entry.isCorrect === isCorrect && entry.score === score) return null;

    const player = session.players.get(tiktokUserId);
    if (player) {
      player.totalScore += score - entry.score;
      if (entry.isCorrect && !isCorrect) {
        player.correctCount -= 1;
        player.wrongCount += 1;
      } else if (!entry.isCorrect && isCorrect) {
        player.wrongCount -= 1;
        player.correctCount += 1;
      }
    }
    entry.isCorrect = isCorrect;
    entry.score = score;
    return { tiktokUserId, ...entry };
  }

  /**
   * Lấy leaderboard (top 10)
   */
  getLeaderboard(sessionId, limit = 10) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return [...session.players.values()]
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }

  /**
   * Lấy kết quả câu hỏi vừa rồi (ai đúng)
   */
  getQuestionResults(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return [...session.questionAnswers.entries()].map(([uid, r]) => ({
      tiktokUserId: uid,
      ...r,
    }));
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) session.status = 'ended';
  }

  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }
}

// Singleton
const gameState = new GameState();
module.exports = { gameState };
