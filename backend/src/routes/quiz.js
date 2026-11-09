const express = require('express');
const router = express.Router();
const { prisma } = require('../db/prisma');

// Lấy tất cả quiz sets
router.get('/sets', async (req, res) => {
  try {
    const sets = await prisma.quizSet.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy 1 quiz set + câu hỏi
router.get('/sets/:id', async (req, res) => {
  try {
    const set = await prisma.quizSet.findUnique({
      where: { id: Number(req.params.id) },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!set) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(set);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tạo quiz set mới
router.post('/sets', async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const set = await prisma.quizSet.create({ data: { title, description, type } });
    res.status(201).json(set);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm câu hỏi vào quiz set
router.post('/sets/:id/questions', async (req, res) => {
  try {
    const quizSetId = Number(req.params.id);
    const { type, questionText, imageUrl, optionA, optionB, optionC, optionD,
            correctAnswer, explanation, timeLimit, baseScore } = req.body;

    // Tính order tiếp theo
    const count = await prisma.question.count({ where: { quizSetId } });

    const question = await prisma.question.create({
      data: {
        quizSetId, type, questionText, imageUrl,
        optionA, optionB, optionC, optionD,
        correctAnswer, explanation,
        timeLimit: timeLimit ?? 30,
        baseScore: baseScore ?? 100,
        order: count + 1,
      },
    });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật câu hỏi
router.put('/questions/:id', async (req, res) => {
  try {
    const q = await prisma.question.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa câu hỏi
router.delete('/questions/:id', async (req, res) => {
  try {
    await prisma.question.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
