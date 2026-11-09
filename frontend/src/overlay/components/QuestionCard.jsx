import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const OPTION_COLORS = {
  A: { bg: '#ef4444', light: '#fef2f2', emoji: '🔴' },
  B: { bg: '#3b82f6', light: '#eff6ff', emoji: '🔵' },
  C: { bg: '#f59e0b', light: '#fffbeb', emoji: '🟡' },
  D: { bg: '#10b981', light: '#f0fdf4', emoji: '🟢' },
};

export default function QuestionCard({ question, startTime, revealAnswer, explanation, isResult }) {
  const [timeLeft, setTimeLeft] = useState(question.timeLimit);

  useEffect(() => {
    if (isResult) { setTimeLeft(0); return; }
    const interval = setInterval(() => {
      if (!startTime) return;
      const elapsed = (Date.now() - startTime) / 1000;
      const left = Math.max(0, question.timeLimit - elapsed);
      setTimeLeft(Math.ceil(left));
      if (left <= 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, question.timeLimit, isResult]);

  const progress = startTime ? Math.max(0, (timeLeft / question.timeLimit) * 100) : 100;
  const isMultipleChoice = question.type === 'multiple_choice';
  const isTextType = question.type === 'text_answer' || question.type === 'vua_tieng_viet';

  const timerColor = timeLeft > 10 ? '#10b981' : timeLeft > 5 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      background: 'rgba(15, 15, 26, 0.95)',
      borderRadius: 24,
      overflow: 'hidden',
      boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(20px)',
    }}>
      {/* Header: loại câu hỏi + timer */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>
            {question.type === 'multiple_choice' ? '📝' : question.type === 'vua_tieng_viet' ? '🇻🇳' : '✍️'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 600 }}>
            {question.type === 'multiple_choice' ? 'Trắc nghiệm' : question.type === 'vua_tieng_viet' ? 'Vua Tiếng Việt' : 'Điền đáp án'}
          </span>
        </div>

        {/* Đồng hồ đếm ngược */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 16,
          padding: '8px 20px',
        }}>
          <span style={{ fontSize: 22 }}>⏱️</span>
          <span style={{
            fontSize: 40,
            fontWeight: 900,
            color: timerColor,
            minWidth: 52,
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 20px ${timerColor}`,
          }}>
            {isResult ? '⏹' : timeLeft}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>s</span>
        </div>
      </div>

      {/* Thanh tiến trình thời gian */}
      <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', position: 'relative' }}>
        <motion.div
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${timerColor}, ${timerColor}88)`,
            transformOrigin: 'left',
          }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Câu hỏi */}
      <div style={{ padding: '32px 40px' }}>
        <h2 style={{
          fontSize: 34,
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.3,
          margin: '0 0 28px',
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {question.questionText}
        </h2>

        {/* Hình ảnh nếu có */}
        {question.imageUrl && (
          <img src={question.imageUrl} alt="question" style={{ width: '100%', borderRadius: 12, marginBottom: 24 }} />
        )}

        {/* Đáp án trắc nghiệm */}
        {isMultipleChoice && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {['A', 'B', 'C', 'D'].map((opt) => {
              const text = question[`option${opt}`];
              if (!text) return null;
              const c = OPTION_COLORS[opt];
              const isCorrect = isResult && revealAnswer?.toUpperCase() === opt;
              return (
                <motion.div
                  key={opt}
                  animate={isCorrect ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 0.4, repeat: isCorrect ? 3 : 0 }}
                  style={{
                    background: isCorrect
                      ? `linear-gradient(135deg, ${c.bg}, ${c.bg}cc)`
                      : 'rgba(255,255,255,0.07)',
                    borderRadius: 16,
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    border: isCorrect ? `2px solid ${c.bg}` : '2px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s',
                    boxShadow: isCorrect ? `0 0 30px ${c.bg}66` : 'none',
                  }}
                >
                  <span style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: isCorrect ? '#fff' : c.bg,
                    minWidth: 36,
                    textAlign: 'center',
                  }}>{opt}</span>
                  <span style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: isCorrect ? '#fff' : 'rgba(255,255,255,0.85)',
                  }}>{text}</span>
                  {isCorrect && <span style={{ marginLeft: 'auto', fontSize: 28 }}>✅</span>}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Đáp án text / vua tiếng Việt */}
        {isTextType && isResult && revealAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: 20,
              padding: '24px 32px',
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(16,185,129,0.5)',
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, margin: '0 0 8px' }}>✅ Đáp án đúng</p>
            <p style={{ fontSize: 40, fontWeight: 900, color: '#fff', margin: 0 }}>{revealAnswer}</p>
          </motion.div>
        )}

        {isTextType && !isResult && (
          <div style={{
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '20px 28px',
            textAlign: 'center',
            border: '2px dashed rgba(255,255,255,0.2)',
          }}>
            <p style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              💬 Comment đáp án của bạn!
            </p>
          </div>
        )}

        {/* Giải thích */}
        {isResult && explanation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: 20,
              background: 'rgba(79,70,229,0.2)',
              borderRadius: 14,
              padding: '16px 24px',
              borderLeft: '4px solid #4f46e5',
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, margin: 0 }}>
              💡 {explanation}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
