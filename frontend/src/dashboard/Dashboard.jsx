import React, { useState, useEffect } from 'react';
import { getSocket } from '../shared/socket';
import { getQuizSets, createSession } from '../shared/api';
import GameControl from './components/GameControl';
import QuestionManager from './components/QuestionManager';

export default function Dashboard() {
  const [page, setPage] = useState('home'); // home | game | questions
  const [quizSets, setQuizSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tiktokStatus, setTiktokStatus] = useState('disconnected');

  useEffect(() => {
    loadQuizSets();
    const socket = getSocket();
    socket.on('tiktok:connected', () => setTiktokStatus('connected'));
    socket.on('tiktok:disconnected', () => setTiktokStatus('disconnected'));
    socket.on('tiktok:error', () => setTiktokStatus('error'));
    return () => {
      socket.off('tiktok:connected');
      socket.off('tiktok:disconnected');
      socket.off('tiktok:error');
    };
  }, []);

  async function loadQuizSets() {
    try {
      const sets = await getQuizSets();
      setQuizSets(sets);
    } catch {
      setError('Không thể tải danh sách bộ câu hỏi');
    }
  }

  async function handleStartSession() {
    if (!selectedSet || !tiktokUsername.trim()) {
      setError('Vui lòng chọn bộ câu hỏi và nhập username TikTok');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const session = await createSession({
        quizSetId: selectedSet.id,
        tiktokUsername: tiktokUsername.trim().replace('@', ''),
      });
      setActiveSession(session);
      setPage('game');
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể tạo session');
    } finally {
      setLoading(false);
    }
  }

  const statusColors = { connected: '#10b981', disconnected: '#6b7280', error: '#ef4444' };
  const statusLabels = { connected: '● Đã kết nối TikTok Live', disconnected: '○ Chưa kết nối', error: '✕ Lỗi kết nối' };

  if (page === 'game' && activeSession) {
    return <GameControl session={activeSession} quizSet={selectedSet} onBack={() => setPage('home')} />;
  }

  if (page === 'questions') {
    return <QuestionManager quizSets={quizSets} onBack={() => { setPage('home'); loadQuizSets(); }} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 36 }}>🏫</span>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>ClassTikTok</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0 }}>Dashboard Giáo Viên</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setPage('questions')}
            style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', padding: '10px 20px', borderRadius: 12, cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            📚 Quản lý câu hỏi
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        {/* TikTok Status */}
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: 16,
          padding: '14px 20px', marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 10,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ color: statusColors[tiktokStatus], fontSize: 16, fontWeight: 600 }}>
            {statusLabels[tiktokStatus]}
          </span>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Bắt đầu buổi học mới</h2>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#fca5a5',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* TikTok Username */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.8)' }}>
            Username TikTok của bạn
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              borderRight: 'none', padding: '12px 16px', borderRadius: '12px 0 0 12px',
              color: 'rgba(255,255,255,0.6)', fontSize: 16,
            }}>@</span>
            <input
              type="text"
              value={tiktokUsername}
              onChange={e => setTiktokUsername(e.target.value)}
              placeholder="your_tiktok_username"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0 12px 12px 0',
                color: '#fff', padding: '12px 16px', fontSize: 16, outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Chọn bộ câu hỏi */}
        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.8)' }}>
            Chọn bộ câu hỏi
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {quizSets.map(set => (
              <div
                key={set.id}
                onClick={() => setSelectedSet(set)}
                style={{
                  background: selectedSet?.id === set.id
                    ? 'linear-gradient(135deg, rgba(79,70,229,0.4), rgba(124,58,237,0.4))'
                    : 'rgba(255,255,255,0.05)',
                  border: selectedSet?.id === set.id
                    ? '2px solid #4f46e5'
                    : '2px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: '20px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: selectedSet?.id === set.id ? '0 0 20px rgba(79,70,229,0.3)' : 'none',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>
                  {set.type === 'multiple_choice' ? '📝' : set.type === 'vua_tieng_viet' ? '🇻🇳' : '✍️'}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>{set.title}</h3>
                {set.description && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>{set.description}</p>
                )}
                <span style={{
                  background: 'rgba(255,255,255,0.1)', borderRadius: 8,
                  padding: '4px 10px', fontSize: 12, color: 'rgba(255,255,255,0.7)',
                }}>
                  {set._count?.questions ?? 0} câu hỏi
                </span>
              </div>
            ))}

            {quizSets.length === 0 && (
              <div style={{
                gridColumn: '1/-1', textAlign: 'center', padding: 40,
                color: 'rgba(255,255,255,0.4)', fontSize: 16,
              }}>
                Chưa có bộ câu hỏi nào. Hãy tạo trong "Quản lý câu hỏi".
              </div>
            )}
          </div>
        </div>

        {/* Nút bắt đầu */}
        <button
          onClick={handleStartSession}
          disabled={loading || !selectedSet || !tiktokUsername.trim()}
          style={{
            width: '100%', padding: '18px',
            background: loading || !selectedSet || !tiktokUsername.trim()
              ? 'rgba(255,255,255,0.1)'
              : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border: 'none', borderRadius: 16, color: '#fff',
            fontSize: 18, fontWeight: 700, cursor: loading || !selectedSet ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: loading || !selectedSet ? 'none' : '0 8px 25px rgba(79,70,229,0.5)',
          }}
        >
          {loading ? '⏳ Đang khởi động...' : '🚀 Bắt đầu buổi học'}
        </button>
      </div>
    </div>
  );
}
