import axios from 'axios';
import { getToken } from '../utils/storage';

export const axiosInstance = axios.create({
  baseURL: 'http://192.168.29.96:5166', // 🔴 PUT YOUR API URL HERE
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
});
axiosInstance.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;
