import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}
