import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Quiz Sets
export const getQuizSets = () => api.get('/quiz/sets').then(r => r.data);
export const getQuizSet = (id) => api.get(`/quiz/sets/${id}`).then(r => r.data);
export const createQuizSet = (data) => api.post('/quiz/sets', data).then(r => r.data);
export const addQuestion = (setId, data) => api.post(`/quiz/sets/${setId}/questions`, data).then(r => r.data);
export const updateQuestion = (id, data) => api.put(`/quiz/questions/${id}`, data).then(r => r.data);
export const deleteQuestion = (id) => api.delete(`/quiz/questions/${id}`).then(r => r.data);

// Sessions
export const createSession = (data) => api.post('/session', data).then(r => r.data);
export const getSession = (id) => api.get(`/session/${id}`).then(r => r.data);
export const getSessionResults = (id) => api.get(`/session/${id}/results`).then(r => r.data);
export const getSessions = () => api.get('/session').then(r => r.data);
