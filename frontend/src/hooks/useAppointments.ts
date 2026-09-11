import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './useApi';
import { 
  Appointment, 
  AppointmentFilterParams, 
  AppointmentStats,
  PaginatedResponse,
  ApiResponse
} from '../types';

const API_URL = '/api';

export const useAppointments = (params?: AppointmentFilterParams) => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<Appointment>, Error>({
    queryKey: ['appointments', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Appointment>>(
        `${API_URL}/appointments`, 
        params
      );
      return response;
    },
  });
};

export const useAppointment = (appointmentId: string) => {
  const api = useApi();
  
  return useQuery<Appointment, Error>({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const response = await api.get<Appointment>(
        `${API_URL}/appointments/${appointmentId}`
      );
      return response;
    },
    enabled: !!appointmentId,
  });
};

export const useAppointmentStats = () => {
  const api = useApi();
  
  return useQuery<AppointmentStats, Error>({
    queryKey: ['appointment-stats'],
    queryFn: async () => {
      const response = await api.get<AppointmentStats>(
        `${API_URL}/appointments/stats`
      );
      return response;
    },
  });
};

export const useAppointmentsByStatus = (
  status: string, 
  params?: Omit<AppointmentFilterParams, 'status'>
) => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<Appointment>, Error>({
    queryKey: ['appointments-by-status', status, params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Appointment>>(
        `${API_URL}/appointments/status/${status}`,
        params
      );
      return response;
    },
    enabled: !!status,
  });
};

export const useTodayAppointments = (params?: Omit<AppointmentFilterParams, 'startDate' | 'endDate'>) => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<Appointment>, Error>({
    queryKey: ['today-appointments', params],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get<PaginatedResponse<Appointment>>(
        `${API_URL}/appointments`, 
        { 
          ...params,
          startDate: today,
          endDate: today,
        }
      );
      return response;
    },
  });
};

export const useUpcomingAppointments = (params?: Omit<AppointmentFilterParams, 'startDate'>) => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<Appointment>, Error>({
    queryKey: ['upcoming-appointments', params],
    queryFn: async () => {
      const today = new Date().toISOString();
      const response = await api.get<PaginatedResponse<Appointment>>(
        `${API_URL}/appointments/upcoming`,
        params
      );
      return response;
    },
  });
};

export const useCreateAppointment = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Appointment, Error, Partial<Appointment>>({
    mutationFn: async (appointmentData) => {
      const response = await api.post<Appointment>(
        `${API_URL}/appointments`,
        appointmentData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-appointments'] });
    },
  });
};

export const useUpdateAppointment = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Appointment, Error, { id: string; data: Partial<Appointment> }>({
    mutationFn: async ({ id, data }) => {
      const response = await api.put<Appointment>(
        `${API_URL}/appointments/${id}`,
        data
      );
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
    },
  });
};

export const useDeleteAppointment = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Appointment, Error, string>({
    mutationFn: async (appointmentId) => {
      const response = await api.del<Appointment>(
        `${API_URL}/appointments/${appointmentId}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
    },
  });
};

export const useConfirmAppointment = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Appointment, Error, string>({
    mutationFn: async (appointmentId) => {
      const response = await api.post<Appointment>(
        `${API_URL}/appointments/${appointmentId}/confirm`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
    },
  });
};

export const useCancelAppointment = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Appointment, Error, { id: string; reason?: string }>({
    mutationFn: async ({ id, reason }) => {
      const response = await api.post<Appointment>(
        `${API_URL}/appointments/${id}/cancel`,
        { reason }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
    },
  });
};

export const useMarkAppointmentNoShow = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Appointment, Error, string>({
    mutationFn: async (appointmentId) => {
      const response = await api.post<Appointment>(
        `${API_URL}/appointments/${appointmentId}/no-show`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
    },
  });
};

export const useCompleteAppointment = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<Appointment, Error, string>({
    mutationFn: async (appointmentId) => {
      const response = await api.post<Appointment>(
        `${API_URL}/appointments/${appointmentId}/complete`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
    },
  });
};

export const useGetAvailability = (meetingTypeId: string, date?: string) => {
  const api = useApi();
  
  return useQuery<string[], Error>({
    queryKey: ['availability', meetingTypeId, date],
    queryFn: async () => {
      const params: Record<string, string> = { meetingTypeId };
      if (date) params.date = date;
      
      const response = await api.get<string[]>(
        `${API_URL}/appointments/availability`,
        params
      );
      return response;
    },
    enabled: !!meetingTypeId,
  });
};

export const useMeetingTypes = () => {
  const api = useApi();
  
  return useQuery<PaginatedResponse<any>, Error>({
    queryKey: ['meeting-types'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<any>>(
        `${API_URL}/meeting-types`
      );
      return response;
    },
  });
};

export const useCreateMeetingType = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, Partial<any>>({
    mutationFn: async (meetingTypeData) => {
      const response = await api.post<any>(
        `${API_URL}/meeting-types`,
        meetingTypeData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-types'] });
    },
  });
};

export const useUpdateMeetingType = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, { id: string; data: Partial<any> }>({
    mutationFn: async ({ id, data }) => {
      const response = await api.put<any>(
        `${API_URL}/meeting-types/${id}`,
        data
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-types'] });
    },
  });
};

export const useDeleteMeetingType = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, string>({
    mutationFn: async (meetingTypeId) => {
      const response = await api.del<any>(
        `${API_URL}/meeting-types/${meetingTypeId}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-types'] });
    },
  });
};
