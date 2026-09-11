import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthState,
  ApiResponse,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'lead_management_token';
const USER_KEY = 'lead_management_user';

// Helper function to decode JWT token
const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

// Helper function to check if token is expired
const isTokenExpired = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  
  // Add 10 second buffer
  const expirationTime = payload.exp * 1000 - 10000;
  return Date.now() >= expirationTime;
};

// Helper function to get auth headers
const getAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const user = localStorage.getItem(USER_KEY);

      if (token && user) {
        try {
          if (!isTokenExpired(token)) {
            setAuthState({
              user: JSON.parse(user),
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }
        } catch {
          // Token is invalid
        }
      }

      // Clear invalid auth data
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<User | null> => {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
        
        if (response.data.success) {
          const { user, token } = response.data.data;
          
          // Store auth data
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          toast.success(response.data.message || 'Login successful');
          return user;
        }
        
        toast.error(response.data.error || 'Login failed');
        return null;
      } catch (error: any) {
        const message = 
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Login failed';
        
        toast.error(message);
        return null;
      }
    },
    []
  );

  // Register function
  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<User | null> => {
      try {
        const response = await axios.post(`${API_URL}/auth/register`, credentials);
        
        if (response.data.success) {
          const { user, token } = response.data.data;
          
          // Store auth data
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          toast.success(response.data.message || 'Registration successful');
          return user;
        }
        
        toast.error(response.data.error || 'Registration failed');
        return null;
      } catch (error: any) {
        const message = 
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Registration failed';
        
        toast.error(message);
        return null;
      }
    },
    []
  );

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    navigate('/login');
    toast.success('Logged out successfully');
  }, [navigate]);

  // Forgot password function
  const forgotPassword = useCallback(
    async (email: string): Promise<boolean> => {
      try {
        const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
        
        if (response.data.success) {
          toast.success(response.data.message || 'Password reset email sent');
          return true;
        }
        
        toast.error(response.data.error || 'Failed to send reset email');
        return false;
      } catch (error: any) {
        const message = 
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Failed to send reset email';
        
        toast.error(message);
        return false;
      }
    },
    []
  );

  // Reset password function
  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<boolean> => {
      try {
        const response = await axios.post(`${API_URL}/auth/reset-password`, {
          token,
          newPassword,
        });
        
        if (response.data.success) {
          toast.success(response.data.message || 'Password reset successful');
          return true;
        }
        
        toast.error(response.data.error || 'Failed to reset password');
        return false;
      } catch (error: any) {
        const message = 
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Failed to reset password';
        
        toast.error(message);
        return false;
      }
    },
    []
  );

  // Change password function
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<boolean> => {
      try {
        const response = await axios.post(
          `${API_URL}/auth/change-password`,
          { currentPassword, newPassword },
          { headers: getAuthHeaders(authState.token || '') }
        );
        
        if (response.data.success) {
          toast.success(response.data.message || 'Password changed successfully');
          return true;
        }
        
        toast.error(response.data.error || 'Failed to change password');
        return false;
      } catch (error: any) {
        const message = 
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Failed to change password';
        
        toast.error(message);
        return false;
      }
    },
    [authState.token]
  );

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await axios.post(`${API_URL}/auth/refresh-token`, {
        token: authState.token,
      });
      
      if (response.data.success) {
        const { token } = response.data.data;
        localStorage.setItem(TOKEN_KEY, token);
        
        setAuthState((prev) => ({
          ...prev,
          token,
        }));
        
        return token;
      }
      
      return null;
    } catch {
      return null;
    }
  }, [authState.token]);

  // Get profile function
  const getProfile = useCallback(async (): Promise<User | null> => {
    try {
      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: getAuthHeaders(authState.token || ''),
      });
      
      if (response.data.success) {
        const user = response.data.data;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        
        setAuthState((prev) => ({
          ...prev,
          user,
        }));
        
        return user;
      }
      
      return null;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired, try to refresh
        const newToken = await refreshToken();
        if (newToken) {
          return getProfile();
        }
        
        // If refresh fails, logout
        logout();
      }
      return null;
    }
  }, [authState.token, refreshToken, logout]);

  // Update profile function
  const updateProfile = useCallback(
    async (data: Partial<User>): Promise<User | null> => {
      try {
        const response = await axios.put(`${API_URL}/auth/profile`, data, {
          headers: getAuthHeaders(authState.token || ''),
        });
        
        if (response.data.success) {
          const user = response.data.data;
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          
          setAuthState((prev) => ({
            ...prev,
            user,
          }));
          
          toast.success(response.data.message || 'Profile updated successfully');
          return user;
        }
        
        toast.error(response.data.error || 'Failed to update profile');
        return null;
      } catch (error: any) {
        const message = 
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Failed to update profile';
        
        toast.error(message);
        return null;
      }
    },
    [authState.token]
  );

  // Check if user has specific role
  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!authState.user) return false;
      
      const userRoles = Array.isArray(roles) ? roles : [roles];
      return userRoles.includes(authState.user.role);
    },
    [authState.user]
  );

  // Check if user is admin
  const isAdmin = useCallback((): boolean => {
    return authState.user?.role === 'ADMIN';
  }, [authState.user]);

  // Get auth headers for API requests
  const getHeaders = useCallback(
    (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...additionalHeaders,
      };
      
      if (authState.token) {
        headers.Authorization = `Bearer ${authState.token}`;
      }
      
      return headers;
    },
    [authState.token]
  );

  return {
    // State
    user: authState.user,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    
    // Functions
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    refreshToken,
    getProfile,
    updateProfile,
    hasRole,
    isAdmin,
    getHeaders,
  };
};

export default useAuth;
