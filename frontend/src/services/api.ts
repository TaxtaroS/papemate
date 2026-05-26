// @ts-nocheck
// 초보자 안내: 프론트엔드에서 백엔드 API를 호출할 때 공통으로 사용하는 axios 설정 파일입니다.

import axios from 'axios';

const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_BASE_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== 'undefined' && ['3000', '3001', '5173', '5174'].includes(window.location.port)) {
    return `http://${window.location.hostname}:8000`;
  }

  return '';
};

const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 모든 API 요청을 보내기 직전에 실행됩니다.
// 로그인 토큰이 있으면 Authorization 헤더에 자동으로 붙여서 백엔드가 사용자를 알아볼 수 있게 합니다.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 백엔드가 401을 보내면 로그인 정보가 만료되었거나 잘못된 상태입니다.
// 이때 저장된 로그인 값을 지우고 새로고침해서 다시 로그인하도록 만듭니다.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('username');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (username, password) =>
    apiClient.post('/api/auth/signup', { username, password }),

  login: (username, password) =>
    apiClient.post('/api/auth/login', { username, password }),

  healthCheck: () => apiClient.get('/api/health'),

  updateProfile: (username) =>
    apiClient.patch('/api/auth/profile', { username }),

  changePassword: (currentPassword, newPassword) =>
    apiClient.patch('/api/auth/password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  deleteAccount: () => apiClient.delete('/api/auth/account'),
};

export const analysisAPI = {
  chat: (question, files, options = {}) => {
    const formData = new FormData();
    formData.append('question', question);
    formData.append('llm_provider', options.provider || 'openai');
    if (options.openaiApiKey) formData.append('openai_api_key', options.openaiApiKey);
    if (options.googleApiKey) formData.append('google_api_key', options.googleApiKey);
    files.forEach((file) => formData.append('files', file));

    return apiClient.post('/api/analysis/chat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  createVisual: (type, files, analysisText = '') => {
    const formData = new FormData();
    formData.append('analysis_text', analysisText);
    files.forEach((file) => formData.append('files', file));

    return apiClient.post(`/api/visuals/${encodeURIComponent(type)}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const projectAPI = {
  list: () => apiClient.get('/api/projects'),
  sync: (projects) => apiClient.put('/api/projects/sync', { projects }),
  save: (project) => apiClient.post('/api/projects', { project }),
  delete: (projectId) => apiClient.delete(`/api/projects/${encodeURIComponent(projectId)}`),
  findByInviteCode: (inviteCode) => apiClient.get(`/api/projects/invite/${encodeURIComponent(inviteCode)}`),
};

export default apiClient;
