import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessTokenMemory: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessTokenMemory = token;
};

export const getAccessToken = () => accessTokenMemory;

api.interceptors.request.use((config) => {
  if (accessTokenMemory) {
    config.headers.Authorization = `Bearer ${accessTokenMemory}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const storedRefreshToken = localStorage.getItem('dcspms_refresh_token');
      if (storedRefreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', {
            refreshToken: storedRefreshToken,
          });
          setAccessToken(data.accessToken);
          localStorage.setItem('dcspms_refresh_token', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch (_refreshErr) {
          localStorage.removeItem('dcspms_refresh_token');
          setAccessToken(null);
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
