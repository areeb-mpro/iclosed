import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { 
  useAppointments, 
  useAppointmentStats, 
  useDeleteAppointment,
  useConfirmAppointment,
  useCancelAppointment
} from '../../hooks/useAppointments';
import { useAuth } from '../../hooks/useAuth';
import { Appointment, AppointmentStatus, AppointmentFilterParams } from '../../types';
import { APPOINTMENT_STATUS_COLORS } from '../../utils/constants';
import { cn, formatDate, formatName } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

// Status filter options
const statusOptions: { value: AppointmentStatus | ''; label: string; count?: number }[] = [
  { value: '', label: 'All Status' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
];

// Sort options
const sortOptions = [
  { value: 'startTime:asc', label: 'Earliest first' },
  { value: 'startTime:desc', label: 'Latest first' },
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
];

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  
  // State for filters and pagination
  const [filters, setFilters] = useState<AppointmentFilterParams>({
    page: 1,
    limit: 10,
    sortBy: 'startTime',
    sortOrder: 'asc',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [meetingTypeFilter, setMeetingTypeFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);

  // Fetch appointments with filters
  const { data: appointmentsData, isLoading, isFetching } = useAppointments({
    ...filters,
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    meetingTypeId: meetingTypeFilter || undefined,
    assigneeId: assigneeFilter || undefined,
    startDate: dateRange ? new Date().toISOString() : undefined,
  });

  // Fetch stats for counts
  const { data: statsData } = useAppointmentStats();

  // Mutations
  const { mutate: deleteAppointment } = useDeleteAppointment();
  const { mutate: confirmAppointment } = useConfirmAppointment();
  const { mutate: cancelAppointment } = useCancelAppointment();

  // Update status options with counts from stats
  const statusOptionsWithCounts = useMemo(() => {
    if (!statsData?.byStatus) return statusOptions;
    
    return statusOptions.map(option => {
      if (option.value && statsData.byStatus[option.value as AppointmentStatus]) {
        return {
          ...option,
          count: statsData.byStatus[option.value as AppointmentStatus],
        };
      }
      return option;
    });
  }, [statsData]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<AppointmentFilterParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  // Handle status filter change
  const handleStatusChange = (value: AppointmentStatus | '') => {
    setStatusFilter(value);
    setFilters(prev => ({ ...prev, status: value || undefined, page: 1 }));
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split(':');
    setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as any, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Handle delete
  const handleDelete = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (appointmentToDelete) {
      deleteAppointment(appointmentToDelete.id, {
        onSuccess: () => {
          setShowDeleteModal(false);
          setAppointmentToDelete(null);
        },
      });
    }
  };

  // Handle confirm
  const handleConfirm = (appointmentId: string) => {
    confirmAppointment(appointmentId);
  };

  // Handle cancel
  const handleCancel = (appointmentId: string) => {
    cancelAppointment({ id: appointmentId, reason: 'Cancelled by admin' });
  };

  // Refresh data
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
  };

  // Get status badge
  const getStatusBadge = (status: AppointmentStatus) => {
    const colors = APPOINTMENT_STATUS_COLORS[status] || APPOINTMENT_STATUS_COLORS.SCHEDULED;
    return (
      <span className={cn('badge', colors.bg, colors.text)}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  // Format appointment title
  const formatAppointmentTitle = (appointment: Appointment) => {
    return appointment.title || appointment.meetingType?.name || 'Untitled Meeting';
  };

  // Format appointment time
  const formatAppointmentTime = (appointment: Appointment) => {
    const start = new Date(appointment.startTime);
    const end = new Date(appointment.endTime);
    
    return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Format lead name
  const formatLeadName = (appointment: Appointment) => {
    return formatName(appointment.lead?.firstName, appointment.lead?.lastName) || 'Unknown';
  };

  // Format assignee name
  const formatAssigneeName = (appointment: Appointment) => {
    return formatName(appointment.assignee?.firstName, appointment.assignee?.lastName) || 'Unassigned';
  };

  // Calculate total pages
  const totalPages = appointmentsData?.pagination?.totalPages || 1;

  // Date range options
  const dateRangeOptions = [
    { value: '', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">
            Manage all appointments. Total: {appointmentsData?.pagination?.total || 0} appointments
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            className="btn btn-secondary btn-sm"
            disabled={isFetching}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
          
          <button
            onClick={() => navigate('/appointments/new')}
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Appointment
          </button>
          
          <button
            className="btn btn-outline btn-sm"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: statsData?.total || 0, status: 'SCHEDULED' },
          { label: 'Confirmed', value: statsData?.byStatus?.CONFIRMED || 0, status: 'CONFIRMED' },
          { label: 'Scheduled', value: statsData?.byStatus?.SCHEDULED || 0, status: 'SCHEDULED' },
          { label: 'Completed', value: statsData?.byStatus?.COMPLETED || 0, status: 'COMPLETED' },
          { label: 'Cancelled', value: statsData?.byStatus?.CANCELLED || 0, status: 'CANCELLED' },
          { label: 'No Show', value: statsData?.byStatus?.NO_SHOW || 0, status: 'NO_SHOW' },
        ].map((stat) => (
          <Link
            key={stat.label}
            to={`/appointments?status=${stat.status.toLowerCase()}`}
            className="stat-card text-center p-3 hover:shadow-md transition-shadow"
          >
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            <div className="mt-2">
              {getStatusBadge(stat.status as AppointmentStatus)}
            </div>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value as AppointmentStatus | '')}
                className="input appearance-none pr-10"
              >
                {statusOptionsWithCounts.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}{' '}
                    {option.count !== undefined && `(${option.count})`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Date Range Filter */}
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="input appearance-none pr-10"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Sort */}
            <div className="relative">
              <select
                value={`${filters.sortBy}:${filters.sortOrder}`}
                onChange={(e) => handleSortChange(e.target.value)}
                className="input appearance-none pr-10"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Submit search */}
            <button
              type="submit"
              className="btn btn-primary btn-sm"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          
          {/* Additional filters (toggleable) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"
            >
              <Filter className="h-4 w-4" />
              Advanced Filters
              {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 transform -rotate-90" />}
            </button>
          </div>
          
          {/* Advanced filters (collapsible) */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="label">Meeting Type</label>
                <select
                  value={meetingTypeFilter}
                  onChange={(e) => setMeetingTypeFilter(e.target.value)}
                  className="input"
                >
                  <option value="">All Meeting Types</option>
                  {/* In a real app, you would populate this with actual meeting types */}
                </select>
              </div>
              
              <div>
                <label className="label">Assignee</label>
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="input"
                >
                  <option value="">All Assignees</option>
                  {/* In a real app, you would populate this with actual users */}
                </select>
              </div>
              
              <div>
                <label className="label">Lead</label>
                <select className="input">
                  <option value="">All Leads</option>
                  {/* In a real app, you would populate this with actual leads */}
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {appointmentsData?.pagination?.page || 1} of {appointmentsData?.pagination?.totalPages || 1} pages
              {appointmentsData?.pagination?.total && ` (${appointmentsData.pagination.total} total)`}
            </p>
          </div>

          {/* Appointments Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th>Appointment</th>
                  <th>Date & Time</th>
                  <th>Lead</th>
                  <th>Assignee</th>
                  <th>Meeting Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="w-12">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointmentsData?.data?.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/appointments/${appointment.id}`)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm">
                          {formatLeadName(appointment).charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {formatAppointmentTitle(appointment)}
                          </div>
                          {appointment.description && (
                            <div className="text-xs text-gray-500 truncate-2">
                              {appointment.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {formatDate(appointment.startTime)}
                        </div>
                        <div className="text-gray-500">
                          {formatAppointmentTime(appointment)}
                        </div>
                      </div>
                    </td>
                    <td>
                      {appointment.lead ? (
                        <Link
                          to={`/leads/${appointment.lead.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {formatLeadName(appointment)}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      {appointment.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="avatar avatar-sm">
                            {formatAssigneeName(appointment).charAt(0)}
                          </div>
                          <span className="text-gray-900">
                            {formatAssigneeName(appointment)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">
                        {appointment.meetingType?.name || 'N/A'}
                      </span>
                    </td>
                    <td>{getStatusBadge(appointment.status)}</td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {formatDate(appointment.createdAt)}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setShowMoreMenu(appointment.id)}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-400" />
                      </button>
                      
                      {/* More menu dropdown */}
                      {showMoreMenu === appointment.id && (
                        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white border border-gray-200 z-50">
                          <div className="p-2">
                            <Link
                              to={`/appointments/${appointment.id}`}
                              className="dropdown-item"
                              onClick={() => setShowMoreMenu(null)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                            
                            <Link
                              to={`/appointments/${appointment.id}/edit`}
                              className="dropdown-item"
                              onClick={() => setShowMoreMenu(null)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                            
                            {appointment.status === 'SCHEDULED' && (
                              <button
                                onClick={() => {
                                  handleConfirm(appointment.id);
                                  setShowMoreMenu(null);
                                }}
                                className="dropdown-item text-green-600 hover:text-green-700 w-full text-left"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm
                              </button>
                            )}
                            
                            {appointment.status === 'SCHEDULED' && (
                              <button
                                onClick={() => {
                                  handleCancel(appointment.id);
                                  setShowMoreMenu(null);
                                }}
                                className="dropdown-item text-orange-600 hover:text-orange-700 w-full text-left"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </button>
                            )}
                            
                            {(isAdmin || user?.id === appointment.assigneeId) && (
                              <button
                                onClick={() => {
                                  handleDelete(appointment);
                                  setShowMoreMenu(null);
                                }}
                                className="dropdown-item text-red-600 hover:text-red-700 w-full text-left"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {appointmentsData?.data?.length === 0 && (
            <div className="empty-state">
              <Calendar className="empty-state-icon" />
              <h3 className="empty-state-title">No appointments found</h3>
              <p className="empty-state-description">
                {searchQuery || statusFilter || meetingTypeFilter || assigneeFilter || dateRange
                  ? 'No appointments match your search criteria. Try adjusting your filters.'
                  : 'No appointments have been created yet. Click "New Appointment" to get started.'}
              </p>
              <button
                onClick={() => navigate('/appointments/new')}
                className="btn btn-primary mt-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Appointment
              </button>
            </div>
          )}

          {/* Pagination */}
          {appointmentsData?.pagination && appointmentsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {appointmentsData.pagination.page} of {appointmentsData.pagination.totalPages}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page <= 1}
                  className="btn btn-sm btn-outline disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, filters.page - 2) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={cn(
                        'btn btn-sm min-w-[36px]',
                        filters.page === pageNum 
                          ? 'btn-primary' 
                          : 'btn-outline'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page >= totalPages}
                  className="btn btn-sm btn-outline disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && appointmentToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div 
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Appointment
              </h3>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{formatAppointmentTitle(appointmentToDelete)}"? 
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                
                <button
                  onClick={confirmDelete}
                  className="btn btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
