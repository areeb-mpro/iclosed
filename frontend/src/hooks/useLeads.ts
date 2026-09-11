import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './useApi';
import { Lead, LeadFilterParams, LeadStats, PaginatedResponse, ApiResponse } from '../types';

const API_URL = '/api';

export const useLeads = (params?: LeadFilterParams) => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<Lead>, Error>({
    queryKey: ['leads', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Lead>>(`${API_URL}/leads`, params);
      return response;
    },
  });
};

export const useLead = (leadId: string) => {
  const api = useApi();
  
  return useQuery<Lead, Error>({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const response = await api.get<Lead>(`${API_URL}/leads/${leadId}`);
      return response;
    },
    enabled: !!leadId,
  });
};

export const useLeadStats = () => {
  const api = useApi();
  
  return useQuery<LeadStats, Error>({
    queryKey: ['lead-stats'],
    queryFn: async () => {
      const response = await api.get<LeadStats>(`${API_URL}/leads/stats`);
      return response;
    },
  });
};

export const useQualifiedLeads = (params?: Omit<LeadFilterParams, 'status'>) => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<Lead>, Error>({
    queryKey: ['qualified-leads', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Lead>>(`${API_URL}/leads/qualified`, params);
      return response;
    },
  });
};

export const useDisqualifiedLeads = (params?: Omit<LeadFilterParams, 'status'>) => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<Lead>, Error>({
    queryKey: ['disqualified-leads', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Lead>>(`${API_URL}/leads/disqualified`, params);
      return response;
    },
  });
};

export const useLeadsByStatus = (status: string, params?: Omit<LeadFilterParams, 'status'>) => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<Lead>, Error>({
    queryKey: ['leads-by-status', status, params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Lead>>(`${API_URL}/leads/status/${status}`, params);
      return response;
    },
    enabled: !!status,
  });
};

export const useCreateLead = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Lead, Error, Partial<Lead>>({
    mutationFn: async (leadData) => {
      const response = await api.post<Lead>(`${API_URL}/leads`, leadData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
};

export const useUpdateLead = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Lead, Error, { id: string; data: Partial<Lead> }>({
    mutationFn: async ({ id, data }) => {
      const response = await api.put<Lead>(`${API_URL}/leads/${id}`, data);
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
};

export const useDeleteLead = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Lead, Error, string>({
    mutationFn: async (leadId) => {
      const response = await api.del<Lead>(`${API_URL}/leads/${leadId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
};

export const useAddLeadNote = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Lead, Error, { leadId: string; content: string }>({
    mutationFn: async ({ leadId, content }) => {
      const response = await api.post<Lead>(`${API_URL}/leads/${leadId}/notes`, { content });
      return response;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};

export const useExportLeads = (format: 'json' | 'csv' = 'json') => {
  const api = useApi();
  
  return useMutation<Blob, Error, void>({
    mutationFn: async () => {
      const response = await api.get<Blob>(`${API_URL}/leads/export?format=${format}`);
      return response;
    },
  });
};
