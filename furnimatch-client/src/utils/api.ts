import axios from 'axios';
import { repairResponseText } from './text';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '') : 'http://localhost:5234');

export const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `${API_BASE_URL}/api`,
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

api.interceptors.response.use((response) => {
  response.data = repairResponseText(response.data);
  return response;
});

export default api;

export const verifyRegistration = (data: { email: string; code: string }) => api.post('/auth/verify-registration', data);

export const getShopInfo = (sellerId: string) => api.get(`/shops/${sellerId}`);
export const getShopProducts = (sellerId: string) => api.get(`/shops/${sellerId}/products`);
export const updateProduct = (id: number, data: any) => api.put(`/products/${id}`, data);
