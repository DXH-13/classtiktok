const { WebcastPushConnection } = require('tiktok-live-connector');
const { gameState } = require('../quiz/gameState');
const { calculateScore, classifyAnswer } = require('../quiz/scoreEngine');
const { checkWithGemini, isAIEnabled, AI_MIN_CONFIDENCE } = require('../quiz/aiChecker');
const { prisma } = require('../db/prisma');

class TikTokManager {
  constructor() {
    this.connection = null;
    this.io = null;
    this.activeSessionId = null;
    this.isConnected = false;
  }

  setIO(io) {
    this.io = io;
  }

  /**
   * Kết nối vào TikTok Live của 1 username
   */
  async connect(tiktokUsername, sessionId) {
    if (this.connection) {
      await this.disconnect();
    }

    console.log(`📡 Đang kết nối TikTok Live: @${tiktokUsername}`);
    this.activeSessionId = sessionId;

    this.connection = new WebcastPushConnection(tiktokUsername, {
      processInitialData: false,
      fetchRoomInfoOnConnect: true,
      enableExtendedGiftInfo: false,
      requestPollingIntervalMs: 1000,
      sessionId: undefined,
    });

    this.connection.on('connect', (state) => {
      this.isConnected = true;
      console.log(`✅ Kết nối TikTok Live thành công! Room: ${state.roomId}`);
      this.io?.emit('tiktok:connected', { username: tiktokUsername, roomId: state.roomId });
    });

    this.connection.on('disconnect', () => {
      this.isConnected = false;
      console.log('❌ Mất kết nối TikTok Live');
      this.io?.emit('tiktok:disconnected');
    });

    this.connection.on('error', (err) => {
      console.error('TikTok error:', err.message);
      this.io?.emit('tiktok:error', { message: err.message });
    });

    // Lắng nghe comment
    this.connection.on('chat', (data) => {
      this._handleComment(data);
    });

    // Viewer count
    this.connection.on('roomUser', (data) => {
      this.io?.emit('tiktok:viewerCount', { count: data.viewerCount });
    });

    try {
      await this.connection.connect();
    } catch (err) {
      console.error('Không thể kết nối TikTok:', err.message);
      this.io?.emit('tiktok:error', { message: `Không thể kết nối: ${err.message}` });
      throw err;
    }
  }

  async disconnect() {
    if (this.connection) {
      try {
        this.connection.disconnect();
      } catch {}
      this.connection = null;
      this.isConnected = false;
      console.log('🔌 Đã ngắt kết nối TikTok');
    }
  }

  /**
   * Xử lý comment từ TikTok
   *
   * Luồng AI-per-comment (Gemini):
   *  1. Luật chấm NGAY (classifyAnswer) -> ghi điểm + phát leaderboard luôn,
   *     không đợi AI. Điểm theo thời gian tính từ lúc comment tới.
   *  2. Gemini chạy NỀN cho mỗi comment mới (không await, không chặn comment
   *     tiếp theo). Comment giống nhau trong cùng 1 câu hỏi được cache nên
   *     chỉ gọi 1 lần (xem aiChecker.js).
   *  3. Nếu Gemini kết luận khác luật và đủ tự tin -> sửa điểm + leaderboard
   *     và phát sự kiện 'game:answerUpdated'. Gemini lỗi/timeout/không có key
   *     -> giữ nguyên kết quả luật.
   */
  async _handleComment(data) {
    const sessionId = this.activeSessionId;
    if (!sessionId) return;

    const session = gameState.getSession(sessionId);
    if (!session || session.status !== 'active') return;

    if (!session.currentQuestion) return;

    const q = session.currentQuestion;
    const tiktokUserId = String(data.userId);
    const nickname = data.nickname || 'Ẩn danh';
    const avatarUrl = data.profilePictureUrl || '';
    const commentText = data.comment || '';

    // 1. Luật chấm ngay
    const classification = classifyAnswer(q.type, commentText, q.correctAnswer);
    const isCorrect = classification.verdict === 'correct';
    const responseTime = (Date.now() - session.questionStartTime) / 1000;
    const score = calculateScore(isCorrect, responseTime, q.timeLimit, q.baseScore);

    // Ghi nhận (trả về null nếu đã trả lời rồi)
    const result = gameState.recordAnswer(
      sessionId, tiktokUserId, nickname, avatarUrl,
      commentText, isCorrect, score
    );

    if (result === null) return; // đã trả lời rồi, bỏ qua

    // Phát sự kiện realtime
    this.io?.emit('game:newAnswer', {
      sessionId,
      tiktokUserId,
      nickname,
      avatarUrl,
      commentText,
      isCorrect,
      score,
      responseTime: result.responseTime,
    });

    // Cập nhật leaderboard
    const leaderboard = gameState.getLeaderboard(sessionId);
    this.io?.emit('game:leaderboard', { sessionId, leaderboard });

    // Lưu vào DB (background, không await để không block)
    this._saveAnswerToDB(sessionId, q.id, tiktokUserId, nickname, avatarUrl, commentText, isCorrect, score, result.responseTime).catch(() => {});

    // 2. Gemini chạy nền cho comment này (không await)
    if (isAIEnabled()) {
      this._aiCheckAndRevise(sessionId, q, tiktokUserId, nickname, commentText, isCorrect, result.responseTime).catch(() => {});
    }
  }

  /**
   * Gemini chấm lại 1 comment; nếu khác luật và đủ tự tin thì sửa điểm.
   * Lưu ý: nếu Gemini trả về sau khi câu hỏi đã chốt (questionEnd đã phát),
   * điểm/leaderboard vẫn được sửa (dashboard + DB), nhưng bảng kết quả của
   * câu đó đã hiện thì không phát lại — lần sau nên để AI timeout < timeLimit.
   */
  async _aiCheckAndRevise(sessionId, q, tiktokUserId, nickname, commentText, ruleIsCorrect, responseTime) {
    const session = gameState.getSession(sessionId);
    // Chỉ sửa khi vẫn đang ở cùng câu hỏi đó (kể cả khi câu vừa hết giờ).
    if (!session || !session.currentQuestion || session.currentQuestion.id !== q.id) return;

    const ai = await checkWithGemini({
      questionId: q.id,
      questionType: q.type,
      questionText: q.questionText,
      options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
      userAnswer: commentText,
      correctAnswer: q.correctAnswer,
    });
    if (!ai) return; // lỗi/timeout -> giữ kết quả luật
    if (ai.confidence < AI_MIN_CONFIDENCE) return;
    if (ai.isCorrect === ruleIsCorrect) return; // Gemini đồng ý với luật

    const newScore = calculateScore(ai.isCorrect, responseTime, q.timeLimit, q.baseScore);
    const revised = gameState.reviseAnswer(sessionId, tiktokUserId, ai.isCorrect, newScore);
    if (!revised) return;

    console.log(`🤖 AI sửa đáp án @${nickname}: ${ruleIsCorrect} -> ${ai.isCorrect} (${ai.reason || 'Gemini'})`);

    this.io?.emit('game:answerUpdated', {
      sessionId,
      tiktokUserId,
      nickname,
      commentText,
      isCorrect: ai.isCorrect,
      score: newScore,
      responseTime,
      aiReason: ai.reason || '',
      aiConfidence: ai.confidence,
    });

    const leaderboard = gameState.getLeaderboard(sessionId);
    this.io?.emit('game:leaderboard', { sessionId, leaderboard });

    this._updateAnswerInDB(sessionId, q.id, tiktokUserId, ai.isCorrect, newScore).catch(() => {});
  }

  // Cập nhật lại DB sau khi AI sửa (cộng/trừ phần chênh lệch điểm)
  async _updateAnswerInDB(sessionId, questionId, tiktokUserId, isCorrect, newScore) {
    try {
      const player = await prisma.player.findUnique({
        where: { sessionId_tiktokUserId: { sessionId, tiktokUserId } },
      });
      if (!player) return;
      const answer = await prisma.answer.findUnique({
        where: { sessionId_questionId_playerId: { sessionId, questionId, playerId: player.id } },
      });
      if (!answer) return;
      const delta = newScore - answer.score;
      await prisma.answer.update({
        where: { id: answer.id },
        data: { isCorrect, score: newScore },
      });
      await prisma.player.update({
        where: { id: player.id },
        data: {
          totalScore: { increment: delta },
          correctCount: !answer.isCorrect && isCorrect ? { increment: 1 } : answer.isCorrect && !isCorrect ? { decrement: 1 } : undefined,
          wrongCount: answer.isCorrect && !isCorrect ? { increment: 1 } : !answer.isCorrect && isCorrect ? { decrement: 1 } : undefined,
        },
      });
    } catch {}
  }

  async _saveAnswerToDB(sessionId, questionId, tiktokUserId, nickname, avatarUrl, commentText, isCorrect, score, responseTime) {
    try {
      // Upsert player
      const player = await prisma.player.upsert({
        where: { sessionId_tiktokUserId: { sessionId, tiktokUserId } },
        update: {
          totalScore: { increment: score },
          correctCount: isCorrect ? { increment: 1 } : undefined,
          wrongCount: !isCorrect ? { increment: 1 } : undefined,
        },
        create: {
          sessionId,
          tiktokUserId,
          nickname,
          avatarUrl,
          totalScore: score,
          correctCount: isCorrect ? 1 : 0,
          wrongCount: isCorrect ? 0 : 1,
        },
      });

      // Lưu đáp án (bỏ qua nếu đã tồn tại)
      await prisma.answer.upsert({
        where: { sessionId_questionId_playerId: { sessionId, questionId, playerId: player.id } },
        update: {},
        create: {
          sessionId,
          questionId,
          playerId: player.id,
          answerText: commentText,
          isCorrect,
          score,
          responseTime,
        },
      });
    } catch (err) {
      // Duplicate hoặc lỗi DB - bỏ qua
    }
  }
}

const tiktokManager = new TikTokManager();
module.exports = { tiktokManager };
