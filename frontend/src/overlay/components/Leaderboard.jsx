import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RANK_STYLES = [
  { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', emoji: '🥇', shadow: '0 0 20px rgba(245,158,11,0.6)' },
  { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', emoji: '🥈', shadow: '0 0 15px rgba(148,163,184,0.4)' },
  { bg: 'linear-gradient(135deg, #f97316, #ea580c)', emoji: '🥉', shadow: '0 0 15px rgba(249,115,22,0.4)' },
];

export default function Leaderboard({ players }) {
  if (!players || players.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(15,15,26,0.9)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 24 }}>🏆</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Bảng Xếp Hạng</span>
        <span style={{
          marginLeft: 'auto',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 20,
          padding: '2px 12px',
          fontSize: 14,
          color: '#fff',
        }}>Top {players.length}</span>
      </div>

      {/* Players */}
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence>
          {players.map((player, i) => {
            const rankStyle = RANK_STYLES[i] || null;
            return (
              <motion.div
                key={player.tiktokUserId}
                layout
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: rankStyle
                    ? rankStyle.bg
                    : 'rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  boxShadow: rankStyle?.shadow || 'none',
                  border: !rankStyle ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                {/* Rank */}
                <span style={{ fontSize: rankStyle ? 24 : 20, minWidth: 30, textAlign: 'center', fontWeight: 800, color: '#fff' }}>
                  {rankStyle ? rankStyle.emoji : `#${i + 1}`}
                </span>

                {/* Avatar */}
                {player.avatarUrl ? (
                  <img
                    src={player.avatarUrl}
                    alt=""
                    style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }}
                  />
                ) : (
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: '#fff', fontWeight: 700,
                  }}>
                    {player.nickname?.[0]?.toUpperCase() || '?'}
                  </div>
                )}

                {/* Name + correct count */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: '#fff',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {player.nickname}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                    ✅ {player.correctCount} đúng
                  </div>
                </div>

                {/* Score */}
                <div style={{
                  fontSize: 22, fontWeight: 900, color: '#fff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  minWidth: 60, textAlign: 'right',
                }}>
                  {player.totalScore.toLocaleString()}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
