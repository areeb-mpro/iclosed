import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { Lead, Appointment, User } from '../types';
import { formatDate, formatCurrency, formatPercentage, formatNumber } from '../utils/helpers';
import { LEAD_STATUS_COLORS, APPOINTMENT_STATUS_COLORS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Chart colors
const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#1f2937',
];

export default function AnalyticsPage() {
  const api = useApi();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Fetch analytics data
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['analytics', timeRange, filterStatus],
    queryFn: async () => {
      const response = await api.get<any>(`/api/analytics?timeRange=${timeRange}&status=${filterStatus}`);
      return response;
    },
  });
  
  // Fetch leads
  const { data: leads, isLoading: isLoadingLeads } = useQuery({
    queryKey: ['leads-analytics'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Lead>>('/api/leads', {
        limit: 1000,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      return response;
    },
  });
  
  // Fetch appointments
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['appointments-analytics'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Appointment>>('/api/appointments', {
        limit: 1000,
        sortBy: 'startTime',
        sortOrder: 'desc'
      });
      return response;
    },
  });
  
  // Fetch users for salesperson performance
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-analytics'],
    queryFn: async () => {
      const response = await api.get<User[]>('/api/users');
      return response;
    },
  });
  
  // Calculate metrics
  const metrics = useMemo(() => {
    if (!leads || !appointments) {
      return {
        totalLeads: 0,
        qualifiedLeads: 0,
        disqualifiedLeads: 0,
        bookedAppointments: 0,
        completedAppointments: 0,
        noShows: 0,
        closedWon: 0,
        closedLost: 0,
        bookingRate: 0,
        showUpRate: 0,
        closingRate: 0,
        conversionRate: 0,
      };
    }
    
    const totalLeads = leads.data?.length || 0;
    const qualifiedLeads = leads.data?.filter(l => l.status === 'QUALIFIED').length || 0;
    const disqualifiedLeads = leads.data?.filter(l => l.status === 'DISQUALIFIED').length || 0;
    const bookedAppointments = appointments.data?.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length || 0;
    const completedAppointments = appointments.data?.filter(a => a.status === 'COMPLETED').length || 0;
    const noShows = appointments.data?.filter(a => a.status === 'NO_SHOW').length || 0;
    const closedWon = leads.data?.filter(l => l.status === 'CLOSED_WON').length || 0;
    const closedLost = leads.data?.filter(l => l.status === 'CLOSED_LOST').length || 0;
    
    // Calculate rates
    const bookingRate = totalLeads > 0 ? (bookedAppointments / totalLeads) * 100 : 0;
    const showUpRate = bookedAppointments > 0 ? ((bookedAppointments - noShows) / bookedAppointments) * 100 : 0;
    const closingRate = qualifiedLeads > 0 ? ((closedWon + closedLost) / qualifiedLeads) * 100 : 0;
    const conversionRate = totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0;
    
    return {
      totalLeads,
      qualifiedLeads,
      disqualifiedLeads,
      bookedAppointments,
      completedAppointments,
      noShows,
      closedWon,
      closedLost,
      bookingRate,
      showUpRate,
      closingRate,
      conversionRate,
    };
  }, [leads, appointments]);
  
  // Lead status distribution chart data
  const leadStatusData = useMemo(() => {
    if (!leads) return [];
    
    const statusCounts: Record<string, number> = {};
    leads.data?.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      label: status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    }));
  }, [leads]);
  
  // Appointment status distribution
  const appointmentStatusData = useMemo(() => {
    if (!appointments) return [];
    
    const statusCounts: Record<string, number> = {};
    appointments.data?.forEach(appt => {
      statusCounts[appt.status] = (statusCounts[appt.status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      label: status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    }));
  }, [appointments]);
  
  // Leads by date (for line chart)
  const leadsByDate = useMemo(() => {
    if (!leads) return [];
    
    const dateCounts: Record<string, number> = {};
    leads.data?.forEach(lead => {
      const date = formatDate(lead.createdAt).split(',')[0]; // Get just the date part
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    
    return Object.entries(dateCounts)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, count]) => ({ date, count }));
  }, [leads]);
  
  // Salesperson performance
  const salespersonPerformance = useMemo(() => {
    if (!leads || !users) return [];
    
    const performance: Record<string, { leads: number; qualified: number; closedWon: number; closedLost: number }> = {};
    
    // Initialize with all users
    users.forEach(user => {
      performance[user.id] = { leads: 0, qualified: 0, closedWon: 0, closedLost: 0 };
    });
    
    // Count leads by assignee
    leads.data?.forEach(lead => {
      if (lead.assigneeId && performance[lead.assigneeId]) {
        performance[lead.assigneeId].leads++;
        if (lead.status === 'QUALIFIED') performance[lead.assigneeId].qualified++;
        if (lead.status === 'CLOSED_WON') performance[lead.assigneeId].closedWon++;
        if (lead.status === 'CLOSED_LOST') performance[lead.assigneeId].closedLost++;
      }
    });
    
    return Object.entries(performance).map(([userId, stats]) => {
      const user = users.find(u => u.id === userId);
      return {
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        leads: stats.leads,
        qualified: stats.qualified,
        closedWon: stats.closedWon,
        closedLost: stats.closedLost,
        conversionRate: stats.leads > 0 ? (stats.closedWon / stats.leads) * 100 : 0,
      };
    }).filter(u => u.leads > 0);
  }, [leads, users]);
  
  // Loading state
  if (isLoadingAnalytics || isLoadingLeads || isLoadingAppointments || isLoadingUsers) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your sales performance and metrics</p>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Time Range:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="NEW">New</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="DISQUALIFIED">Disqualified</option>
                <option value="BOOKED">Booked</option>
                <option value="CLOSED_WON">Closed Won</option>
                <option value="CLOSED_LOST">Closed Lost</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Leads</h3>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(metrics.totalLeads)}</div>
            <div className="text-sm text-green-600 mt-1">
              <span className="font-medium">+12%</span> vs last period
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Qualified Leads</h3>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(metrics.qualifiedLeads)}</div>
            <div className="text-sm text-green-600 mt-1">
              <span className="font-medium">{formatPercentage(metrics.qualifiedLeads / Math.max(metrics.totalLeads, 1))}</span> conversion rate
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Booked Appointments</h3>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(metrics.bookedAppointments)}</div>
            <div className="text-sm text-blue-600 mt-1">
              <span className="font-medium">{formatPercentage(metrics.bookingRate)}</span> booking rate
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Closed Deals</h3>
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(metrics.closedWon)}</div>
            <div className="text-sm text-emerald-600 mt-1">
              <span className="font-medium">{formatPercentage(metrics.closingRate)}</span> closing rate
            </div>
          </div>
        </div>
        
        {/* Additional Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Show-up Rate</h3>
              <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatPercentage(metrics.showUpRate)}</div>
            <div className="text-sm text-gray-500 mt-1">
              {metrics.completedAppointments} completed / {metrics.bookedAppointments} booked
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">No-shows</h3>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(metrics.noShows)}</div>
            <div className="text-sm text-gray-500 mt-1">
              {formatPercentage(metrics.noShows / Math.max(metrics.bookedAppointments, 1))} no-show rate
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Disqualified</h3>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(metrics.disqualifiedLeads)}</div>
            <div className="text-sm text-gray-500 mt-1">
              {formatPercentage(metrics.disqualifiedLeads / Math.max(metrics.totalLeads, 1))} of total
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
              <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatPercentage(metrics.conversionRate)}</div>
            <div className="text-sm text-gray-500 mt-1">
              {metrics.closedWon} won / {metrics.totalLeads} total
            </div>
          </div>
        </div>
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Lead Status Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Status Distribution</h3>
            {leadStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leadStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ label }) => label}
                  >
                    {leadStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No lead data available
              </div>
            )}
          </div>
          
          {/* Appointment Status Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Status Distribution</h3>
            {appointmentStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={appointmentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ label }) => label}
                  >
                    {appointmentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No appointment data available
              </div>
            )}
          </div>
        </div>
        
        {/* Line Chart - Leads Over Time */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads Over Time</h3>
          {leadsByDate.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={leadsByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Leads"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="#3b82f6"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>
        
        {/* Salesperson Performance */}
        {salespersonPerformance.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Salesperson Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salespersonPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" name="Total Leads" fill="#3b82f6" />
                <Bar dataKey="qualified" name="Qualified" fill="#10b981" />
                <Bar dataKey="closedWon" name="Closed Won" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Performance table */}
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesperson</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qualified</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closed Won</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salespersonPerformance.map((user, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.leads}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.qualified}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.closedWon}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPercentage(user.conversionRate / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Type for paginated response
interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
