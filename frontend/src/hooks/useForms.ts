import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './useApi';
import { BookingForm, PaginatedResponse, ApiResponse } from '../types';

const API_URL = '/api';

export const useForms = (params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: string }) => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<BookingForm>, Error>({
    queryKey: ['forms', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<BookingForm>>(
        `${API_URL}/forms`, 
        params
      );
      return response;
    },
  });
};

export const useForm = (formId: string) => {
  const api = useApi();
  
  return useQuery<BookingForm, Error>({
    queryKey: ['form', formId],
    queryFn: async () => {
      const response = await api.get<BookingForm>(`${API_URL}/forms/${formId}`);
      return response;
    },
    enabled: !!formId,
  });
};

export const usePublicForm = (formId: string) => {
  const api = useApi();
  
  return useQuery<BookingForm, Error>({
    queryKey: ['public-form', formId],
    queryFn: async () => {
      const response = await api.get<BookingForm>(`${API_URL}/forms/${formId}/public`);
      return response;
    },
    enabled: !!formId,
  });
};

export const useFormStats = () => {
  const api = useApi();
  
  return useQuery<{ total: number; byForm: Record<string, number>; recentSubmissions: number }, Error>({
    queryKey: ['form-stats'],
    queryFn: async () => {
      const response = await api.get<{ total: number; byForm: Record<string, number>; recentSubmissions: number }>(
        `${API_URL}/forms/stats`
      );
      return response;
    },
  });
};

export const useCreateForm = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<BookingForm, Error, Partial<BookingForm>>({
    mutationFn: async (formData) => {
      const response = await api.post<BookingForm>(`${API_URL}/forms`, formData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form-stats'] });
    },
  });
};

export const useUpdateForm = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<BookingForm, Error, { id: string; data: Partial<BookingForm> }>({
    mutationFn: async ({ id, data }) => {
      const response = await api.put<BookingForm>(`${API_URL}/forms/${id}`, data);
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form', id] });
      queryClient.invalidateQueries({ queryKey: ['public-form', id] });
      queryClient.invalidateQueries({ queryKey: ['form-stats'] });
    },
  });
};

export const useDeleteForm = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<BookingForm, Error, string>({
    mutationFn: async (formId) => {
      const response = await api.del<BookingForm>(`${API_URL}/forms/${formId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form-stats'] });
    },
  });
};

export const useSubmitForm = (formId: string) => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<{ lead: any; appointment?: any }, Error, Record<string, any>>({
    mutationFn: async (submissionData) => {
      const response = await api.post<{ lead: any; appointment?: any }>(
        `${API_URL}/forms/${formId}/submit`,
        submissionData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-stats'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};

export const useFormSubmissions = (formId: string, params?: { page?: number; limit?: number }) => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<any>, Error>({
    queryKey: ['form-submissions', formId, params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<any>>(
        `${API_URL}/forms/${formId}/submissions`,
        params
      );
      return response;
    },
    enabled: !!formId,
  });
};

export const useToggleFormStatus = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<BookingForm, Error, { id: string; isActive: boolean }>({
    mutationFn: async ({ id, isActive }) => {
      const response = await api.patch<BookingForm>(`${API_URL}/forms/${id}/status`, { isActive });
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form', id] });
    },
  });
};
