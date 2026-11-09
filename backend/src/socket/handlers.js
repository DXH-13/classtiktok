const { gameState } = require('../quiz/gameState');
const { tiktokManager } = require('../tiktok/manager');
const { prisma } = require('../db/prisma');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client kết nối: ${socket.id}`);

    // Dashboard join vào session
    socket.on('dashboard:joinSession', ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      const session = gameState.getSession(sessionId);
      if (session) {
        socket.emit('game:state', buildStateSnapshot(session));
      }
    });

    // Overlay join
    socket.on('overlay:joinSession', ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      const session = gameState.getSession(sessionId);
      if (session) {
        socket.emit('game:state', buildStateSnapshot(session));
        socket.emit('game:leaderboard', {
          sessionId,
          leaderboard: gameState.getLeaderboard(sessionId),
        });
      }
    });

    // ─── Game Control từ Dashboard ───────────────────────────────────────────

    // Bắt đầu câu hỏi
    socket.on('dashboard:startQuestion', async ({ sessionId, questionId }) => {
      try {
        const session = gameState.getSession(sessionId);
        if (!session) return socket.emit('error', { message: 'Session không tồn tại' });

        const question = await prisma.question.findUnique({ where: { id: questionId } });
        if (!question) return socket.emit('error', { message: 'Câu hỏi không tồn tại' });

        gameState.startQuestion(sessionId, question);

        // Cập nhật DB
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: { currentQuestionId: questionId },
        });

        // Phát cho tất cả trong session (overlay + dashboard)
        io.to(`session:${sessionId}`).emit('game:questionStart', {
          sessionId,
          question: sanitizeQuestion(question),
          startTime: Date.now(),
        });

        console.log(`▶️  Câu hỏi bắt đầu: [${questionId}] ${question.questionText}`);

        // Tự động kết thúc sau timeLimit giây
        setTimeout(async () => {
          const s = gameState.getSession(sessionId);
          if (s && s.status === 'active' && s.currentQuestion?.id === questionId) {
            gameState.endQuestion(sessionId);
            const results = gameState.getQuestionResults(sessionId);
            const leaderboard = gameState.getLeaderboard(sessionId);
            io.to(`session:${sessionId}`).emit('game:questionEnd', {
              sessionId,
              questionId,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              results,
              leaderboard,
            });
          }
        }, question.timeLimit * 1000);

      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Kết thúc câu hỏi thủ công (dashboard bấm dừng sớm)
    socket.on('dashboard:endQuestion', ({ sessionId }) => {
      const session = gameState.getSession(sessionId);
      if (!session) return;
      if (session.status !== 'active') return;

      gameState.endQuestion(sessionId);
      const q = session.currentQuestion;
      const results = gameState.getQuestionResults(sessionId);
      const leaderboard = gameState.getLeaderboard(sessionId);

      io.to(`session:${sessionId}`).emit('game:questionEnd', {
        sessionId,
        questionId: q?.id,
        correctAnswer: q?.correctAnswer,
        explanation: q?.explanation,
        results,
        leaderboard,
      });
    });

    // Kết thúc game
    socket.on('dashboard:endSession', async ({ sessionId }) => {
      gameState.endSession(sessionId);

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'ended', endedAt: new Date() },
      }).catch(() => {});

      await tiktokManager.disconnect();

      const leaderboard = gameState.getLeaderboard(sessionId, 20);
      io.to(`session:${sessionId}`).emit('game:sessionEnd', { sessionId, leaderboard });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client ngắt kết nối: ${socket.id}`);
    });
  });
}

/**
 * Xây dựng snapshot state hiện tại để gửi cho client mới join
 */
function buildStateSnapshot(session) {
  return {
    sessionId: session.sessionId,
    status: session.status,
    currentQuestion: session.currentQuestion ? sanitizeQuestion(session.currentQuestion) : null,
    questionStartTime: session.questionStartTime,
    playerCount: session.players.size,
  };
}

/**
 * Ẩn đáp án đúng khi gửi xuống client
 */
function sanitizeQuestion(q) {
  return {
    id: q.id,
    type: q.type,
    questionText: q.questionText,
    imageUrl: q.imageUrl,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    timeLimit: q.timeLimit,
    baseScore: q.baseScore,
    // correctAnswer KHÔNG gửi xuống overlay!
  };
}

module.exports = { setupSocketHandlers };
