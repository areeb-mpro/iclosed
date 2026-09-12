import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuth } from './useAuth';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with base configuration
const createAxiosInstance = (token?: string | null): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor to include auth token
  instance.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired - clear auth
        localStorage.removeItem('lead_management_token');
        localStorage.removeItem('lead_management_user');
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// API methods type
type ApiMethods = {
  get: <T>(url: string, params?: any, config?: AxiosRequestConfig) => Promise<T>;
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => Promise<T>;
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => Promise<T>;
  del: <T>(url: string, config?: AxiosRequestConfig) => Promise<T>;
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => Promise<T>;
};

export const useApi = (): ApiMethods => {
  const { token } = useAuth();

  const instance = createAxiosInstance(token);

  return {
    get: async <T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> => {
      const response: AxiosResponse<T> = await instance.get(url, { params, ...config });
      return response.data;
    },

    post: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
      const response: AxiosResponse<T> = await instance.post(url, data, config);
      return response.data;
    },

    put: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
      const response: AxiosResponse<T> = await instance.put(url, data, config);
      return response.data;
    },

    del: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
      const response: AxiosResponse<T> = await instance.delete(url, config);
      return response.data;
    },

    patch: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
      const response: AxiosResponse<T> = await instance.patch(url, data, config);
      return response.data;
    },
  };
};

export default useApi;
