import axios from 'axios';
import { repairResponseText } from './text';

const rawApiUrl = (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim() : '');
const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ? String(import.meta.env.VITE_API_BASE_URL).trim() : '');

export const API_BASE_URL = rawBaseUrl || (rawApiUrl ? rawApiUrl.replace(/\/api\/?$/, '') : 'https://furnimatch-1.onrender.com');
export const API_URL = rawApiUrl || `${API_BASE_URL}/api`;

export const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If sending FormData, delete Content-Type so browser sets boundary automatically
    if (config.data instanceof FormData && config.headers) {
      if (typeof (config.headers as any).delete === 'function') {
        (config.headers as any).delete('Content-Type');
        (config.headers as any).delete('content-type');
      }
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
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

export const getChatConversations = () => api.get('/chat/conversations');
export const getChatMessages = (otherUserId: number) => api.get(`/chat/messages/${otherUserId}`);
export const sendChatMessage = (data: { receiverId: number; content?: string; productId?: number; productPrice?: number }) => api.post('/chat/send', data);
export const getChatUnreadCount = () => api.get('/chat/unread-count');
export const getChatUser = (otherUserId: number) => api.get(`/chat/user/${otherUserId}`);


