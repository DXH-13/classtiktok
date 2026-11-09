import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../shared/socket';
import QuestionCard from './components/QuestionCard';
import Leaderboard from './components/Leaderboard';
import AnswerFeed from './components/AnswerFeed';
import SessionEndScreen from './components/SessionEndScreen';

export default function Overlay() {
  const { sessionId } = useParams();
  const [phase, setPhase] = useState('waiting'); // waiting | question | result | ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [answerFeed, setAnswerFeed] = useState([]); // stream đáp án mới
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);

  const feedRef = useRef([]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('overlay:joinSession', { sessionId });

    socket.on('game:state', (state) => {
      if (state.currentQuestion) {
        setCurrentQuestion(state.currentQuestion);
        setQuestionStartTime(state.questionStartTime);
        setPhase(state.status === 'active' ? 'question' : 'waiting');
      }
    });

    socket.on('game:questionStart', ({ question, startTime }) => {
      setCurrentQuestion(question);
      setQuestionStartTime(startTime);
      setCorrectAnswer(null);
      setExplanation(null);
      feedRef.current = [];
      setAnswerFeed([]);
      setPhase('question');
    });

    socket.on('game:newAnswer', (data) => {
      if (!data.isCorrect) return; // chỉ hiển thị đúng trên feed
      const entry = { ...data, id: Date.now() + Math.random() };
      feedRef.current = [entry, ...feedRef.current].slice(0, 8);
      setAnswerFeed([...feedRef.current]);
    });

    socket.on('game:leaderboard', ({ leaderboard }) => {
      setLeaderboard(leaderboard);
    });

    socket.on('game:questionEnd', ({ correctAnswer, explanation, leaderboard }) => {
      setCorrectAnswer(correctAnswer);
      setExplanation(explanation);
      setLeaderboard(leaderboard);
      setPhase('result');
    });

    socket.on('game:sessionEnd', ({ leaderboard }) => {
      setFinalLeaderboard(leaderboard);
      setPhase('ended');
    });

    return () => {
      socket.off('game:state');
      socket.off('game:questionStart');
      socket.off('game:newAnswer');
      socket.off('game:leaderboard');
      socket.off('game:questionEnd');
      socket.off('game:sessionEnd');
    };
  }, [sessionId]);

  return (
    // Kích thước cố định 1920x1080 cho OBS, nền trong suốt
    <div
      className="overlay-mode"
      style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Leaderboard bên trái - luôn hiển thị */}
      <div style={{ position: 'absolute', left: 24, top: 24, width: 340 }}>
        <Leaderboard players={leaderboard} />
      </div>

      {/* Phần chính giữa */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 900 }}>
        <AnimatePresence mode="wait">
          {phase === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{
                background: 'linear-gradient(135deg, rgba(79,70,229,0.9), rgba(16,185,129,0.9))',
                borderRadius: 24,
                padding: '48px 64px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              }}>
                <div style={{ fontSize: 80 }}>🏫</div>
                <h1 style={{ fontSize: 56, fontWeight: 900, margin: '16px 0 8px', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                  ClassTikTok
                </h1>
                <p style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                  Hãy comment đáp án để tham gia! 🎯
                </p>
              </div>
            </motion.div>
          )}

          {phase === 'question' && currentQuestion && (
            <motion.div
              key={`q-${currentQuestion.id}`}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -60 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              <QuestionCard
                question={currentQuestion}
                startTime={questionStartTime}
              />
            </motion.div>
          )}

          {phase === 'result' && currentQuestion && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 20 }}
            >
              <QuestionCard
                question={currentQuestion}
                startTime={questionStartTime}
                revealAnswer={correctAnswer}
                explanation={explanation}
                isResult
              />
            </motion.div>
          )}

          {phase === 'ended' && (
            <motion.div
              key="ended"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <SessionEndScreen leaderboard={finalLeaderboard} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feed đáp án đúng - bên phải */}
      <div style={{ position: 'absolute', right: 24, top: 24, width: 340 }}>
        <AnswerFeed answers={answerFeed} />
      </div>
    </div>
  );
}
