import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('lead_management_token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Handle success responses
    return response;
  },
  (error: AxiosError) => {
    // Handle errors
    const message = 
      (error.response?.data as any)?.error ||
      (error.response?.data as any)?.message ||
      error.message ||
      'An error occurred';
    
    const code = (error.response?.data as any)?.code || 'ERROR';
    
    // Don't show toast for 401 errors (handled by auth hook)
    if (error.response?.status !== 401) {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

// Create a hook for using the API with auth headers
export const useApi = () => {
  const { getHeaders } = useAuth();
  
  const get = async <T>(url: string, params?: any): Promise<T> => {
    const response = await api.get<T>(url, { params });
    return response.data.data || response.data;
  };
  
  const post = async <T>(url: string, data?: any): Promise<T> => {
    const response = await api.post<T>(url, data);
    return response.data.data || response.data;
  };
  
  const put = async <T>(url: string, data?: any): Promise<T> => {
    const response = await api.put<T>(url, data);
    return response.data.data || response.data;
  };
  
  const patch = async <T>(url: string, data?: any): Promise<T> => {
    const response = await api.patch<T>(url, data);
    return response.data.data || response.data;
  };
  
  const del = async <T>(url: string): Promise<T> => {
    const response = await api.delete<T>(url);
    return response.data.data || response.data;
  };
  
  return { get, post, put, patch, del, api };
};

// Standalone API functions (for components outside React context)
export const apiService = {
  get: async <T>(url: string, params?: any, headers?: any): Promise<T> => {
    const response = await api.get<T>(url, { params, headers });
    return response.data.data || response.data;
  },
  
  post: async <T>(url: string, data?: any, headers?: any): Promise<T> => {
    const response = await api.post<T>(url, data, { headers });
    return response.data.data || response.data;
  },
  
  put: async <T>(url: string, data?: any, headers?: any): Promise<T> => {
    const response = await api.put<T>(url, data, { headers });
    return response.data.data || response.data;
  },
  
  patch: async <T>(url: string, data?: any, headers?: any): Promise<T> => {
    const response = await api.patch<T>(url, data, { headers });
    return response.data.data || response.data;
  },
  
  del: async <T>(url: string, headers?: any): Promise<T> => {
    const response = await api.delete<T>(url, { headers });
    return response.data.data || response.data;
  },
};

// Export the axios instance
export default api;
