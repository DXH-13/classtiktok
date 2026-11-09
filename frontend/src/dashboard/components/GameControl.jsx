import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../../shared/socket';
import { getQuizSet } from '../../shared/api';

export default function GameControl({ session, quizSet: initialQuizSet, onBack }) {
  const [quizSet, setQuizSet] = useState(initialQuizSet);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [gamePhase, setGamePhase] = useState('waiting'); // waiting | question | result | ended
  const [leaderboard, setLeaderboard] = useState([]);
  const [answerCount, setAnswerCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [tiktokStatus, setTiktokStatus] = useState('connecting');
  const [viewerCount, setViewerCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const overlayUrl = `${window.location.origin}/overlay/${session.id}`;

  useEffect(() => {
    loadQuizSet();
    setupSocket();
    return () => clearTimer();
  }, []);

  async function loadQuizSet() {
    try {
      const set = await getQuizSet(session.quizSetId);
      setQuizSet(set);
      setQuestions(set.questions || []);
    } catch {}
  }

  function setupSocket() {
    const socket = getSocket();
    socket.emit('dashboard:joinSession', { sessionId: session.id });

    socket.on('tiktok:connected', () => setTiktokStatus('connected'));
    socket.on('tiktok:disconnected', () => setTiktokStatus('disconnected'));
    socket.on('tiktok:error', (e) => { setTiktokStatus('error'); console.error(e); });
    socket.on('tiktok:viewerCount', ({ count }) => setViewerCount(count));

    socket.on('game:newAnswer', (data) => {
      setAnswerCount(p => p + 1);
      if (data.isCorrect) setCorrectCount(p => p + 1);
    });

    socket.on('game:leaderboard', ({ leaderboard }) => setLeaderboard(leaderboard));

    socket.on('game:questionEnd', ({ leaderboard }) => {
      setGamePhase('result');
      setLeaderboard(leaderboard);
      clearTimer();
    });

    socket.on('game:sessionEnd', () => setGamePhase('ended'));
  }

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function startQuestion(idx) {
    if (idx < 0 || idx >= questions.length) return;
    const q = questions[idx];
    setCurrentIdx(idx);
    setGamePhase('question');
    setAnswerCount(0);
    setCorrectCount(0);
    setTimeLeft(q.timeLimit);

    const socket = getSocket();
    socket.emit('dashboard:startQuestion', { sessionId: session.id, questionId: q.id });

    clearTimer();
    const endTime = Date.now() + q.timeLimit * 1000;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, (endTime - Date.now()) / 1000);
      setTimeLeft(Math.ceil(left));
      if (left <= 0) { clearTimer(); }
    }, 200);
  }

  function endQuestion() {
    const socket = getSocket();
    socket.emit('dashboard:endQuestion', { sessionId: session.id });
    clearTimer();
  }

  function endSession() {
    const socket = getSocket();
    socket.emit('dashboard:endSession', { sessionId: session.id });
    setGamePhase('ended');
    clearTimer();
  }

  const currentQ = questions[currentIdx];
  const statusC = { connected: '#10b981', disconnected: '#6b7280', error: '#ef4444', connecting: '#f59e0b' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>
            ← Về
          </button>
          <span style={{ fontSize: 20, fontWeight: 800 }}>🎮 Đang phát sóng</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
          <span style={{ color: statusC[tiktokStatus], fontWeight: 600 }}>
            ● TikTok: {tiktokStatus === 'connected' ? `@${session.tiktokUsername}` : tiktokStatus}
          </span>
          {viewerCount > 0 && <span style={{ color: 'rgba(255,255,255,0.8)' }}>👁 {viewerCount.toLocaleString()}</span>}
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>ID: {session.id.slice(0, 8)}...</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Main Controls */}
        <div>
          {/* Overlay URL */}
          <div style={{
            background: 'rgba(16,185,129,0.1)', borderRadius: 14,
            padding: '14px 20px', marginBottom: 20,
            border: '1px solid rgba(16,185,129,0.3)',
          }}>
            <p style={{ fontSize: 12, color: '#10b981', margin: '0 0 6px', fontWeight: 600 }}>🖥️ URL Overlay cho OBS Browser Source (1920×1080):</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <code style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 8, fontSize: 13, color: '#a5f3fc', wordBreak: 'break-all' }}>
                {overlayUrl}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(overlayUrl)}
                style={{ background: '#10b981', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                📋 Copy
              </button>
            </div>
          </div>

          {/* Current Question Display */}
          {currentQ && gamePhase !== 'waiting' && (
            <div style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24,
              marginBottom: 20, border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    Câu {currentIdx + 1} / {questions.length}
                  </span>
                  <p style={{ fontSize: 20, fontWeight: 700, margin: '4px 0 0', lineHeight: 1.4 }}>{currentQ.questionText}</p>
                </div>
                {gamePhase === 'question' && (
                  <div style={{
                    background: timeLeft <= 5 ? 'rgba(239,68,68,0.2)' : 'rgba(79,70,229,0.2)',
                    borderRadius: 12, padding: '8px 16px', textAlign: 'center', minWidth: 80,
                    border: `1px solid ${timeLeft <= 5 ? 'rgba(239,68,68,0.4)' : 'rgba(79,70,229,0.4)'}`,
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: timeLeft <= 5 ? '#ef4444' : '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>
                      {timeLeft}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>giây</div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{answerCount}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>trả lời</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: 10, padding: '10px 18px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{correctCount}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>đúng</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 18px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{answerCount - correctCount}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>sai</div>
                </div>
                {currentQ.correctAnswer && (
                  <div style={{ background: 'rgba(245,158,11,0.15)', borderRadius: 10, padding: '10px 18px', textAlign: 'center', border: '1px solid rgba(245,158,11,0.3)', marginLeft: 'auto' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{currentQ.correctAnswer}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>đáp án đúng</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            {gamePhase === 'question' && (
              <button
                onClick={endQuestion}
                style={{
                  background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)',
                  color: '#fca5a5', padding: '12px 24px', borderRadius: 12,
                  cursor: 'pointer', fontSize: 15, fontWeight: 600,
                }}
              >
                ⏹ Dừng câu hỏi
              </button>
            )}

            {(gamePhase === 'waiting' || gamePhase === 'result') && currentIdx + 1 < questions.length && (
              <button
                onClick={() => startQuestion(currentIdx + 1)}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  border: 'none', color: '#fff', padding: '12px 28px', borderRadius: 12,
                  cursor: 'pointer', fontSize: 15, fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(79,70,229,0.4)',
                }}
              >
                {gamePhase === 'waiting' ? '▶ Bắt đầu câu 1' : `▶ Câu tiếp theo (${currentIdx + 2}/${questions.length})`}
              </button>
            )}

            {gamePhase === 'result' && currentIdx + 1 >= questions.length && (
              <button
                onClick={endSession}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  border: 'none', color: '#fff', padding: '12px 28px', borderRadius: 12,
                  cursor: 'pointer', fontSize: 15, fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
                }}
              >
                🏆 Kết thúc & Hiển thị kết quả
              </button>
            )}

            {gamePhase !== 'ended' && (
              <button
                onClick={endSession}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.6)', padding: '12px 20px', borderRadius: 12,
                  cursor: 'pointer', fontSize: 14,
                }}
              >
                Kết thúc buổi học
              </button>
            )}
          </div>

          {/* Questions List */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>
              Danh sách câu hỏi
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  onClick={() => gamePhase !== 'question' && startQuestion(i)}
                  style={{
                    background: i === currentIdx ? 'rgba(79,70,229,0.2)' : 'rgba(255,255,255,0.04)',
                    border: i === currentIdx ? '1px solid rgba(79,70,229,0.5)' : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, padding: '12px 16px',
                    cursor: gamePhase !== 'question' ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: i === currentIdx ? '#4f46e5' : 'rgba(255,255,255,0.4)',
                    minWidth: 24,
                  }}>#{i + 1}</span>
                  <span style={{ fontSize: 16 }}>
                    {q.type === 'multiple_choice' ? '📝' : q.type === 'vua_tieng_viet' ? '🇻🇳' : '✍️'}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 14,
                    color: i === currentIdx ? '#fff' : 'rgba(255,255,255,0.75)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{q.questionText}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                    ⏱ {q.timeLimit}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard Sidebar */}
        <div>
          <div style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 16, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 24,
          }}>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '14px 20px' }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>🏆 Bảng xếp hạng</span>
            </div>
            <div style={{ padding: 12 }}>
              {leaderboard.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '30px 0', fontSize: 14 }}>
                  Chưa có người chơi
                </p>
              ) : leaderboard.map((p, i) => (
                <div key={p.tiktokUserId} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 10, marginBottom: 6,
                  background: i === 0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                  border: i === 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: 16, minWidth: 26 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: '50%' }} />
                    : <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700 }}>{p.nickname?.[0]}</div>
                  }
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nickname}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: i === 0 ? '#f59e0b' : '#fff' }}>
                    {p.totalScore.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
