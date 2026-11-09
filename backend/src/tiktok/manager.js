const { WebcastPushConnection } = require('tiktok-live-connector');
const { gameState } = require('../quiz/gameState');
const { checkAnswer, calculateScore } = require('../quiz/scoreEngine');
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
   */
  async _handleComment(data) {
    const sessionId = this.activeSessionId;
    if (!sessionId) return;

    const session = gameState.getSession(sessionId);
    if (!session || session.status !== 'active') return;

    const { question } = session.currentQuestion ? { question: session.currentQuestion } : {};
    if (!session.currentQuestion) return;

    const q = session.currentQuestion;
    const tiktokUserId = String(data.userId);
    const nickname = data.nickname || 'Ẩn danh';
    const avatarUrl = data.profilePictureUrl || '';
    const commentText = data.comment || '';

    // Kiểm tra đáp án
    const isCorrect = checkAnswer(q.type, commentText, q.correctAnswer);
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
