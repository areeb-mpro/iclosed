import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Clock,
  Users,
  Filter,
  RefreshCw,
  Today,
  ViewDay,
  ViewWeek,
  ViewMonth
} from 'lucide-react';
import { useAppointments, useTodayAppointments, useUpcomingAppointments } from '../hooks/useAppointments';
import { useAuth } from '../hooks/useAuth';
import { Appointment, AppointmentStatus } from '../types';
import { APPOINTMENT_STATUS_COLORS } from '../utils/constants';
import { cn, formatDate, formatName, formatDateTime } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';

// View types
const VIEW_TYPES = [
  { id: 'day', label: 'Day', icon: ViewDay },
  { id: 'week', label: 'Week', icon: ViewWeek },
  { id: 'month', label: 'Month', icon: ViewMonth },
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('week');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | ''>('');

  // Fetch appointments
  const { data: appointmentsData, isLoading } = useAppointments({
    startDate: currentDate.toISOString().split('T')[0],
    limit: 100,
  });

  const { data: todayAppointments } = useTodayAppointments();
  const { data: upcomingAppointments } = useUpcomingAppointments();

  // Refresh data
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
    queryClient.invalidateQueries({ queryKey: ['upcoming-appointments'] });
  };

  // Get status color
  const getStatusColor = (status: AppointmentStatus) => {
    return APPOINTMENT_STATUS_COLORS[status] || APPOINTMENT_STATUS_COLORS.SCHEDULED;
  };

  // Navigate date
  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      
      if (viewType === 'day') {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
      } else if (viewType === 'week') {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      } else if (viewType === 'month') {
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      }
      
      return newDate;
    });
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format time
  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format lead name
  const formatLeadName = (appointment: Appointment) => {
    return formatName(appointment.lead?.firstName, appointment.lead?.lastName) || 'Unknown';
  };

  // Format assignee name
  const formatAssigneeName = (appointment: Appointment) => {
    return formatName(appointment.assignee?.firstName, appointment.assignee?.lastName) || 'Unassigned';
  };

  // Get appointments for current view
  const currentAppointments = useMemo(() => {
    if (!appointmentsData?.data) return [];
    
    let filtered = [...appointmentsData.data];
    
    // Filter by status
    if (filterStatus) {
      filtered = filtered.filter(appt => appt.status === filterStatus);
    }
    
    return filtered;
  }, [appointmentsData, filterStatus]);

  // Generate calendar grid for month view
  const generateMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const grid: { date: Date | null; day: number; isCurrentMonth: boolean }[] = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      grid.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({
        date: new Date(year, month, i),
        day: i,
        isCurrentMonth: true,
      });
    }
    
    // Next month days
    const remainingDays = 42 - grid.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      grid.push({
        date: new Date(year, month + 1, i),
        day: i,
        isCurrentMonth: false,
      });
    }
    
    return grid;
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return currentAppointments.filter(appt => 
      appt.startTime.split('T')[0] === dateString
    );
  };

  // Week view: Get dates for the current week
  const getWeekDates = () => {
    const dates: Date[] = [];
    const current = new Date(currentDate);
    
    // Find the first day of the week (Sunday)
    current.setDate(current.getDate() - current.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(current);
      date.setDate(current.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">
            View and manage your appointments
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            className="btn btn-secondary btn-sm"
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
        </div>
      </div>

      {/* Today's Appointments Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Today</h3>
            <span className="text-xs text-gray-500">{formatDate(new Date())}</span>
          </div>
          
          <div className="space-y-2">
            {todayAppointments?.data?.slice(0, 3).map((appt) => (
              <button
                key={appt.id}
                onClick={() => {
                  setSelectedAppointment(appt);
                  setShowAppointmentModal(true);
                }}
                className={cn(
                  'w-full p-2 rounded-lg text-left text-sm transition-colors',
                  getStatusColor(appt.status).bg,
                  getStatusColor(appt.status).text
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatTime(appt.startTime)}</span>
                  <span className="text-xs">-</span>
                  <span className="font-medium">{formatTime(appt.endTime)}</span>
                </div>
                <div className="truncate-2 mt-1">
                  {appt.title || appt.meetingType?.name || 'Untitled'}
                </div>
              </button>
            ))}
            
            {todayAppointments?.data?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                No appointments today
              </p>
            )}
          </div>
        </div>

        {/* Upcoming */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Upcoming</h3>
            <span className="text-xs text-gray-500">Next 7 days</span>
          </div>
          
          <div className="space-y-2">
            {upcomingAppointments?.data?.slice(0, 3).map((appt) => (
              <button
                key={appt.id}
                onClick={() => {
                  setSelectedAppointment(appt);
                  setShowAppointmentModal(true);
                }}
                className={cn(
                  'w-full p-2 rounded-lg text-left text-sm transition-colors',
                  getStatusColor(appt.status).bg,
                  getStatusColor(appt.status).text
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatDate(appt.startTime)}</span>
                </div>
                <div className="truncate-2 mt-1">
                  {appt.title || appt.meetingType?.name || 'Untitled'}
                </div>
              </button>
            ))}
            
            {upcomingAppointments?.data?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                No upcoming appointments
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">This Month</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {appointmentsData?.pagination?.total || 0}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">
                {appointmentsData?.data?.filter(a => a.status === 'CONFIRMED').length || 0}
              </div>
              <div className="text-xs text-gray-500">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">
                {appointmentsData?.data?.filter(a => a.status === 'COMPLETED').length || 0}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600">
                {appointmentsData?.data?.filter(a => a.status === 'SCHEDULED').length || 0}
              </div>
              <div className="text-xs text-gray-500">Scheduled</div>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Filter by Status</h3>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AppointmentStatus | '')}
            className="input w-full"
          >
            <option value="">All Status</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>
        </div>
      </div>

      {/* Calendar View */}
      <div className="card">
        {/* Calendar Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {viewType === 'day' && formatDate(currentDate)}
                {viewType === 'week' && (
                  <>
                    {formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay()))}
                    {' - '}
                    {formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay() + 6))}
                  </>
                )}
                {viewType === 'month' && (
                  <>
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </>
                )}
              </h2>
              <p className="text-sm text-gray-500">
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)} View
              </p>
            </div>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            
            <button
              onClick={goToToday}
              className="btn btn-outline btn-sm"
            >
              <Today className="h-4 w-4 mr-1" />
              Today
            </button>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {VIEW_TYPES.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setViewType(view.id as 'day' | 'week' | 'month')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewType === view.id 
                      ? 'bg-white shadow-sm text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar Views */}
        <div className="border-t border-gray-200 pt-4">
          {viewType === 'month' && (
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50"
                >
                  {day}
                </div>
              ))}
              
              {/* Days */}
              {generateMonthGrid().map((dayInfo, index) => {
                const dateString = dayInfo.date?.toISOString().split('T')[0];
                const isToday = dayInfo.date && 
                  dayInfo.date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                const appointments = dayInfo.date ? getAppointmentsForDate(dayInfo.date) : [];
                const hasAppointments = appointments.length > 0;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      'relative min-h-[100px] p-2',
                      !dayInfo.isCurrentMonth && 'bg-gray-50 text-gray-400',
                      isToday && 'bg-primary-50',
                      hasAppointments && 'bg-blue-50'
                    )}
                  >
                    {/* Day number */}
                    <div className="text-right">
                      <span className={cn(
                        'text-sm font-medium',
                        !dayInfo.isCurrentMonth && 'text-gray-400',
                        isToday && 'text-primary-600'
                      )}>
                        {dayInfo.day}
                      </span>
                    </div>
                    
                    {/* Appointments */}
                    {appointments.slice(0, 2).map((appt) => (
                      <button
                        key={appt.id}
                        onClick={() => {
                          setSelectedAppointment(appt);
                          setShowAppointmentModal(true);
                        }}
                        className={cn(
                          'mt-1 w-full p-1 rounded text-xs text-left truncate-2 transition-colors',
                          getStatusColor(appt.status).bg,
                          getStatusColor(appt.status).text
                        )}
                      >
                        <div className="font-medium">{formatTime(appt.startTime)}</div>
                        <div className="truncate-2">
                          {appt.title || appt.meetingType?.name || 'Untitled'}
                        </div>
                      </button>
                    ))}
                    
                    {appointments.length > 2 && (
                      <button
                        onClick={() => {
                          // Show all appointments for this day
                          const allAppointments = getAppointmentsForDate(dayInfo.date!);
                          if (allAppointments.length > 0) {
                            setSelectedAppointment(allAppointments[0]);
                            setShowAppointmentModal(true);
                          }
                        }}
                        className="mt-1 w-full p-1 rounded text-xs text-center text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        +{appointments.length - 2} more
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {viewType === 'week' && (
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {/* Day headers */}
              {getWeekDates().map((date, index) => {
                const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                return (
                  <div
                    key={index}
                    className="p-2 text-center text-sm font-medium text-gray-700 bg-gray-50"
                  >
                    <div className={cn(isToday && 'bg-primary-500 text-white rounded')}>
                      {formatDate(date)}
                    </div>
                  </div>
                );
              })}
              
              {/* Time slots and appointments */}
              <div className="col-span-7">
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourStart = new Date(currentDate);
                  hourStart.setHours(hour, 0, 0, 0);
                  const hourEnd = new Date(hourStart);
                  hourEnd.setHours(hour + 1, 0, 0, 0);
                  
                  // Find appointments that overlap with this hour
                  const hourAppointments = currentAppointments.filter(appt => {
                    const apptStart = new Date(appt.startTime);
                    const apptEnd = new Date(appt.endTime);
                    return apptStart < hourEnd && apptEnd > hourStart;
                  });
                  
                  return (
                    <div key={hour} className="grid grid-cols-7 gap-px bg-gray-100 py-2">
                      {/* Time label */}
                      <div className="text-xs text-gray-500 text-right pr-2">
                        {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                      </div>
                      
                      {/* Each day column */}
                      {getWeekDates().map((date, dayIndex) => {
                        const dateString = date.toISOString().split('T')[0];
                        const dayAppointments = hourAppointments.filter(appt => 
                          appt.startTime.split('T')[0] === dateString
                        );
                        
                        return (
                          <div key={dayIndex} className="relative min-h-[40px] p-1">
                            {dayAppointments.map((appt) => {
                              const startHour = new Date(appt.startTime).getHours();
                              const durationMinutes = (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / (1000 * 60);
                              const heightPercentage = (durationMinutes / 60) * 100;
                              
                              return (
                                <button
                                  key={appt.id}
                                  onClick={() => {
                                    setSelectedAppointment(appt);
                                    setShowAppointmentModal(true);
                                  }}
                                  className={cn(
                                    'absolute left-1 right-1 rounded text-xs p-1 overflow-hidden transition-colors',
                                    getStatusColor(appt.status).bg,
                                    getStatusColor(appt.status).text
                                  )}
                                  style={{
                                    top: `${(startHour - hour) * 100}%`,
                                    height: `${Math.min(heightPercentage, 100)}%`,
                                  }}
                                >
                                  <div className="font-medium truncate-2">
                                    {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                                  </div>
                                  <div className="truncate-2">
                                    {appt.title || appt.meetingType?.name || 'Untitled'}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewType === 'day' && (
            <div className="space-y-2">
              {Array.from({ length: 24 }, (_, hour) => {
                const hourStart = new Date(currentDate);
                hourStart.setHours(hour, 0, 0, 0);
                const hourEnd = new Date(hourStart);
                hourEnd.setHours(hour + 1, 0, 0, 0);
                
                const hourAppointments = currentAppointments.filter(appt => {
                  const apptStart = new Date(appt.startTime);
                  const apptEnd = new Date(appt.endTime);
                  return apptStart < hourEnd && apptEnd > hourStart;
                });
                
                return (
                  <div key={hour} className="flex gap-2 py-2 border-b border-gray-200 last:border-0">
                    <div className="w-20 text-xs text-gray-500 text-right pr-2">
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      {hourAppointments.map((appt) => {
                        const startHour = new Date(appt.startTime).getHours();
                        const durationMinutes = (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / (1000 * 60);
                        
                        return (
                          <button
                            key={appt.id}
                            onClick={() => {
                              setSelectedAppointment(appt);
                              setShowAppointmentModal(true);
                            }}
                            className={cn(
                              'w-full p-2 rounded-lg text-left text-sm transition-colors',
                              getStatusColor(appt.status).bg,
                              getStatusColor(appt.status).text
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatTime(appt.startTime)}</span>
                              <span className="text-xs">-</span>
                              <span className="font-medium">{formatTime(appt.endTime)}</span>
                              <span className={cn(
                                'px-2 py-0.5 rounded text-xs',
                                getStatusColor(appt.status).bg,
                                getStatusColor(appt.status).text
                              )}>
                                {appt.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="mt-1">
                              <span className="font-medium">{appt.title || appt.meetingType?.name || 'Untitled'}</span>
                              {appt.lead && (
                                <span className="text-xs text-gray-600 ml-2">
                                  with {formatLeadName(appt)}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      
                      {hourAppointments.length === 0 && (
                        <div className="text-sm text-gray-400 py-2">
                          No appointments
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Appointment Details Modal */}
      {showAppointmentModal && selectedAppointment && (
        <div className="modal-overlay" onClick={() => setShowAppointmentModal(false)}>
          <div 
            className="modal-panel max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="avatar avatar-lg">
                  {formatLeadName(selectedAppointment).charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedAppointment.title || selectedAppointment.meetingType?.name || 'Untitled Meeting'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowAppointmentModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p className="text-gray-900">{formatDate(selectedAppointment.startTime)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Time</label>
                <p className="text-gray-900">
                  {formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Lead</label>
                <p className="text-gray-900">{formatLeadName(selectedAppointment)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Assignee</label>
                <p className="text-gray-900">{formatAssigneeName(selectedAppointment)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Meeting Type</label>
                <p className="text-gray-900">{selectedAppointment.meetingType?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={cn(
                  'badge',
                  getStatusColor(selectedAppointment.status).bg,
                  getStatusColor(selectedAppointment.status).text
                )}>
                  {selectedAppointment.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            {selectedAppointment.description && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-700">{selectedAppointment.description}</p>
              </div>
            )}
            
            {selectedAppointment.location && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">Location</label>
                <p className="text-gray-700">{selectedAppointment.location}</p>
              </div>
            )}
            
            {selectedAppointment.meetingLink && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">Meeting Link</label>
                <a
                  href={selectedAppointment.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 hover:underline block"
                >
                  {selectedAppointment.meetingLink}
                </a>
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAppointmentModal(false);
                  navigate(`/appointments/${selectedAppointment.id}`);
                }}
                className="btn btn-outline"
              >
                View Details
              </button>
              
              <button
                onClick={() => {
                  setShowAppointmentModal(false);
                  navigate(`/appointments/${selectedAppointment.id}/edit`);
                }}
                className="btn btn-primary"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
