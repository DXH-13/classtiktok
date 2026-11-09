const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');
const { gameState } = require('../quiz/gameState');
const { tiktokManager } = require('../tiktok/manager');

// Tạo session mới
router.post('/', async (req, res) => {
  try {
    const { quizSetId, tiktokUsername } = req.body;
    if (!quizSetId || !tiktokUsername) {
      return res.status(400).json({ error: 'Thiếu quizSetId hoặc tiktokUsername' });
    }

    const sessionId = uuidv4();
    const session = await prisma.gameSession.create({
      data: { id: sessionId, quizSetId, tiktokUsername, status: 'waiting', startedAt: new Date() },
    });

    // Khởi tạo game state trong memory
    gameState.initSession(sessionId, quizSetId);

    // Kết nối TikTok Live
    tiktokManager.connect(tiktokUsername, sessionId).catch((err) => {
      console.error('TikTok connect error:', err.message);
    });

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy thông tin session
router.get('/:id', async (req, res) => {
  try {
    const session = await prisma.gameSession.findUnique({
      where: { id: req.params.id },
      include: {
        quizSet: { include: { questions: { orderBy: { order: 'asc' } } } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Không tìm thấy session' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kết quả session (leaderboard cuối)
router.get('/:id/results', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      where: { sessionId: req.params.id },
      orderBy: { totalScore: 'desc' },
      include: {
        answers: {
          include: { question: { select: { questionText: true, correctAnswer: true } } },
        },
      },
    });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tất cả sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.gameSession.findMany({
      include: {
        quizSet: { select: { title: true } },
        _count: { select: { players: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
