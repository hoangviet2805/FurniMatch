import axios from 'axios';
import { repairResponseText } from './text';

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

api.interceptors.response.use((response) => {
  response.data = repairResponseText(response.data);
  return response;
});

export default api;

export const verifyRegistration = (data: { email: string; code: string }) => api.post('/auth/verify-registration', data);

export const getShopInfo = (sellerId: string) => api.get(`/shops/${sellerId}`);
export const getShopProducts = (sellerId: string) => api.get(`/shops/${sellerId}/products`);
export const updateProduct = (id: number, data: any) => api.put(`/products/${id}`, data);
