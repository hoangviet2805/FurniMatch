import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5234/api', // Adjust if your .NET port is different
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

export const verifyRegistration = (data: { email: string; code: string }) => api.post('/auth/verify-registration', data);
