import React from 'react';
import { motion } from 'framer-motion';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function SessionEndScreen({ leaderboard }) {
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 10);

  return (
    <div style={{
      background: 'rgba(15,15,26,0.97)',
      borderRadius: 28,
      overflow: 'hidden',
      boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(30px)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b, #ef4444, #4f46e5)',
        padding: '28px 40px',
        textAlign: 'center',
      }}>
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ fontSize: 64, marginBottom: 8 }}
        >
          🏆
        </motion.div>
        <h1 style={{ fontSize: 48, fontWeight: 900, color: '#fff', margin: 0, textShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
          Kết Quả Buổi Học
        </h1>
      </div>

      <div style={{ padding: 32 }}>
        {/* Top 3 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, alignItems: 'flex-end' }}>
          {[top3[1], top3[0], top3[2]].map((player, visualIdx) => {
            if (!player) return <div key={visualIdx} style={{ flex: 1 }} />;
            const realIdx = visualIdx === 1 ? 0 : visualIdx === 0 ? 1 : 2;
            const heights = [200, 250, 180];
            return (
              <motion.div
                key={player.tiktokUserId}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: realIdx * 0.2 }}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: 20,
                  padding: '20px 16px',
                  textAlign: 'center',
                  height: heights[visualIdx],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  border: visualIdx === 1 ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: visualIdx === 1 ? '0 0 40px rgba(245,158,11,0.4)' : 'none',
                }}
              >
                <span style={{ fontSize: 40 }}>{MEDALS[realIdx]}</span>
                {player.avatarUrl ? (
                  <img src={player.avatarUrl} alt="" style={{
                    width: 60, height: 60, borderRadius: '50%', margin: '12px auto',
                    border: `3px solid ${realIdx === 0 ? '#f59e0b' : 'rgba(255,255,255,0.3)'}`,
                  }} />
                ) : (
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%', margin: '12px auto',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, color: '#fff', fontWeight: 700,
                  }}>{player.nickname?.[0]}</div>
                )}
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{player.nickname}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b' }}>
                  {player.totalScore.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>điểm</div>
              </motion.div>
            );
          })}
        </div>

        {/* Hạng 4-10 */}
        {rest.map((player, i) => (
          <motion.div
            key={player.tiktokUserId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              marginBottom: 8,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.6)', minWidth: 28 }}>
              #{i + 4}
            </span>
            {player.avatarUrl
              ? <img src={player.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{player.nickname?.[0]}</div>
            }
            <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: '#fff' }}>{player.nickname}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
              {player.totalScore.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
