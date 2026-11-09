import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnswerFeed({ answers }) {
  if (!answers || answers.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header */}
      <div style={{
        background: 'rgba(16,185,129,0.2)',
        borderRadius: 14,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        border: '1px solid rgba(16,185,129,0.3)',
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{ fontSize: 20 }}>⚡</span>
        <span style={{ color: '#10b981', fontSize: 16, fontWeight: 700 }}>Trả lời đúng!</span>
      </div>

      <AnimatePresence>
        {answers.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: 60, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              background: 'rgba(15,15,26,0.92)',
              borderRadius: 16,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: '1px solid rgba(16,185,129,0.4)',
              boxShadow: '0 4px 20px rgba(16,185,129,0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Avatar */}
            {a.avatarUrl ? (
              <img
                src={a.avatarUrl}
                alt=""
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981' }}
              />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: '#fff', fontWeight: 700,
              }}>
                {a.nickname?.[0]?.toUpperCase() || '?'}
              </div>
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {a.nickname}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                🕐 {a.responseTime?.toFixed(1)}s
              </div>
            </div>

            {/* Score */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: 12,
                padding: '6px 12px',
                fontSize: 16,
                fontWeight: 900,
                color: '#fff',
              }}
            >
              +{a.score}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
