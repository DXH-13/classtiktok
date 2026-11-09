import React, { useState, useEffect } from 'react';
import { getQuizSets, getQuizSet, createQuizSet, addQuestion, updateQuestion, deleteQuestion } from '../../shared/api';

export default function QuestionManager({ onBack }) {
  const [quizSets, setQuizSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showAddSet, setShowAddSet] = useState(false);
  const [showAddQ, setShowAddQ] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [loading, setLoading] = useState(false);

  const [newSet, setNewSet] = useState({ title: '', description: '', type: 'multiple_choice' });
  const emptyQ = { type: 'multiple_choice', questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: '', explanation: '', timeLimit: 30, baseScore: 100 };
  const [qForm, setQForm] = useState(emptyQ);

  useEffect(() => { loadSets(); }, []);

  async function loadSets() {
    const sets = await getQuizSets();
    setQuizSets(sets);
  }

  async function loadSet(set) {
    const full = await getQuizSet(set.id);
    setSelectedSet(full);
    setQuestions(full.questions || []);
  }

  async function handleCreateSet() {
    if (!newSet.title.trim()) return;
    setLoading(true);
    await createQuizSet(newSet);
    setNewSet({ title: '', description: '', type: 'multiple_choice' });
    setShowAddSet(false);
    await loadSets();
    setLoading(false);
  }

  async function handleSaveQ() {
    if (!qForm.questionText.trim() || !qForm.correctAnswer.trim()) return;
    setLoading(true);
    if (editingQ) {
      await updateQuestion(editingQ.id, qForm);
    } else {
      await addQuestion(selectedSet.id, qForm);
    }
    setQForm(emptyQ);
    setShowAddQ(false);
    setEditingQ(null);
    await loadSet(selectedSet);
    setLoading(false);
  }

  async function handleDeleteQ(id) {
    if (!confirm('Xóa câu hỏi này?')) return;
    await deleteQuestion(id);
    await loadSet(selectedSet);
  }

  function openEdit(q) {
    setQForm({ ...q });
    setEditingQ(q);
    setShowAddQ(true);
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10, color: '#fff', padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'rgba(255,255,255,0.7)' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>← Về</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📚 Quản lý câu hỏi</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0, minHeight: 'calc(100vh - 66px)' }}>
        {/* Left: Quiz Sets */}
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.08)', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Bộ câu hỏi</span>
            <button
              onClick={() => setShowAddSet(!showAddSet)}
              style={{ background: '#4f46e5', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >+ Tạo mới</button>
          </div>

          {showAddSet && (
            <div style={{ background: 'rgba(79,70,229,0.1)', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid rgba(79,70,229,0.3)' }}>
              <label style={labelStyle}>Tên bộ câu hỏi</label>
              <input style={{ ...inputStyle, marginBottom: 8 }} value={newSet.title} onChange={e => setNewSet(p => ({ ...p, title: e.target.value }))} placeholder="Ví dụ: Kiến thức địa lý" />
              <label style={labelStyle}>Loại</label>
              <select style={{ ...inputStyle, marginBottom: 8 }} value={newSet.type} onChange={e => setNewSet(p => ({ ...p, type: e.target.value }))}>
                <option value="multiple_choice">Trắc nghiệm</option>
                <option value="vua_tieng_viet">Vua Tiếng Việt</option>
                <option value="text_answer">Điền đáp án</option>
              </select>
              <label style={labelStyle}>Mô tả</label>
              <input style={{ ...inputStyle, marginBottom: 10 }} value={newSet.description} onChange={e => setNewSet(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả ngắn" />
              <button onClick={handleCreateSet} disabled={loading} style={{ width: '100%', background: '#4f46e5', border: 'none', color: '#fff', padding: '9px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {loading ? 'Đang tạo...' : 'Tạo bộ câu hỏi'}
              </button>
            </div>
          )}

          {quizSets.map(set => (
            <div
              key={set.id}
              onClick={() => loadSet(set)}
              style={{
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                background: selectedSet?.id === set.id ? 'rgba(79,70,229,0.25)' : 'rgba(255,255,255,0.04)',
                border: selectedSet?.id === set.id ? '1px solid rgba(79,70,229,0.5)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{set.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {set.type === 'multiple_choice' ? '📝' : set.type === 'vua_tieng_viet' ? '🇻🇳' : '✍️'} {set._count?.questions ?? 0} câu
              </div>
            </div>
          ))}
        </div>

        {/* Right: Questions */}
        <div style={{ padding: 24 }}>
          {!selectedSet ? (
            <div style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👈</div>
              <p style={{ fontSize: 16 }}>Chọn một bộ câu hỏi để xem và chỉnh sửa</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>{selectedSet.title}</h2>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{questions.length} câu hỏi</span>
                </div>
                <button
                  onClick={() => { setEditingQ(null); setQForm(emptyQ); setShowAddQ(true); }}
                  style={{ background: '#4f46e5', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                >
                  + Thêm câu hỏi
                </button>
              </div>

              {/* Form thêm/sửa câu hỏi */}
              {showAddQ && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 24, marginBottom: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{editingQ ? '✏️ Sửa câu hỏi' : '➕ Thêm câu hỏi mới'}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Loại câu hỏi</label>
                      <select style={inputStyle} value={qForm.type} onChange={e => setQForm(p => ({ ...p, type: e.target.value }))}>
                        <option value="multiple_choice">Trắc nghiệm A/B/C/D</option>
                        <option value="vua_tieng_viet">Vua Tiếng Việt (điền từ)</option>
                        <option value="text_answer">Điền đáp án tự do</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Nội dung câu hỏi *</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                        value={qForm.questionText}
                        onChange={e => setQForm(p => ({ ...p, questionText: e.target.value }))}
                        placeholder="Nhập câu hỏi..."
                      />
                    </div>

                    {qForm.type === 'multiple_choice' && (
                      <>
                        {['A', 'B', 'C', 'D'].map(opt => (
                          <div key={opt}>
                            <label style={labelStyle}>Đáp án {opt}</label>
                            <input style={inputStyle} value={qForm[`option${opt}`]} onChange={e => setQForm(p => ({ ...p, [`option${opt}`]: e.target.value }))} placeholder={`Đáp án ${opt}`} />
                          </div>
                        ))}
                      </>
                    )}

                    <div>
                      <label style={labelStyle}>Đáp án đúng * {qForm.type === 'multiple_choice' ? '(A/B/C/D)' : '(text)'}</label>
                      <input style={inputStyle} value={qForm.correctAnswer} onChange={e => setQForm(p => ({ ...p, correctAnswer: e.target.value }))} placeholder={qForm.type === 'multiple_choice' ? 'A' : 'Đáp án đúng'} />
                    </div>
                    <div>
                      <label style={labelStyle}>Thời gian (giây)</label>
                      <input type="number" style={inputStyle} value={qForm.timeLimit} onChange={e => setQForm(p => ({ ...p, timeLimit: Number(e.target.value) }))} min={5} max={120} />
                    </div>
                    <div>
                      <label style={labelStyle}>Điểm cơ bản</label>
                      <input type="number" style={inputStyle} value={qForm.baseScore} onChange={e => setQForm(p => ({ ...p, baseScore: Number(e.target.value) }))} min={10} max={1000} step={10} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Giải thích đáp án (tuỳ chọn)</label>
                      <input style={inputStyle} value={qForm.explanation} onChange={e => setQForm(p => ({ ...p, explanation: e.target.value }))} placeholder="Hiển thị sau khi kết thúc câu hỏi" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={handleSaveQ} disabled={loading} style={{ background: '#4f46e5', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                      {loading ? 'Đang lưu...' : editingQ ? '💾 Lưu' : '➕ Thêm'}
                    </button>
                    <button onClick={() => { setShowAddQ(false); setEditingQ(null); setQForm(emptyQ); }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Danh sách câu hỏi */}
              {questions.map((q, i) => (
                <div key={q.id} style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '16px 20px',
                  marginBottom: 10, border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 700, minWidth: 28, paddingTop: 2 }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 14 }}>
                        {q.type === 'multiple_choice' ? '📝' : q.type === 'vua_tieng_viet' ? '🇻🇳' : '✍️'}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{q.questionText}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {q.type === 'multiple_choice' && ['A', 'B', 'C', 'D'].map(opt => q[`option${opt}`] && (
                        <span key={opt} style={{
                          fontSize: 12, padding: '3px 10px', borderRadius: 6,
                          background: q.correctAnswer?.toUpperCase() === opt ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)',
                          color: q.correctAnswer?.toUpperCase() === opt ? '#10b981' : 'rgba(255,255,255,0.7)',
                          border: q.correctAnswer?.toUpperCase() === opt ? '1px solid rgba(16,185,129,0.4)' : '1px solid transparent',
                        }}>
                          {opt}: {q[`option${opt}`]}
                        </span>
                      ))}
                      {q.type !== 'multiple_choice' && (
                        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                          ✅ {q.correctAnswer}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>⏱ {q.timeLimit}s · {q.baseScore}đ</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(q)} style={{ background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.4)', color: '#a5b4fc', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✏️</button>
                    <button onClick={() => handleDeleteQ(q.id)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>🗑️</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
