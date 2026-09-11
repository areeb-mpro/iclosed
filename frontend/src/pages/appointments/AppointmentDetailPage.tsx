import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  Tag,
  Plus,
  Send,
  Loader2,
  Star,
  StarOff,
  MapPin,
  Video,
  Link2,
  Bell
} from 'lucide-react';
import { 
  useAppointment, 
  useUpdateAppointment, 
  useDeleteAppointment,
  useConfirmAppointment,
  useCancelAppointment,
  useMarkAppointmentNoShow,
  useCompleteAppointment
} from '../../hooks/useAppointments';
import { useAuth } from '../../hooks/useAuth';
import { Appointment, AppointmentStatus, Lead } from '../../types';
import { APPOINTMENT_STATUS_COLORS } from '../../utils/constants';
import { 
  formatDate, 
  formatName, 
  formatPhone, 
  formatEmail,
  cn,
  formatRelativeDate,
  formatDateTime
} from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

// Status transition options
const statusTransitionOptions: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  CANCELLED: ['SCHEDULED'],
  COMPLETED: [],
  NO_SHOW: [],
  RESCHEDULED: ['SCHEDULED', 'CONFIRMED'],
};

// Action buttons for each status
const statusActionButtons: Record<AppointmentStatus, { label: string; action: string; icon: any; color: string }[]> = {
  SCHEDULED: [
    { label: 'Confirm', action: 'confirm', icon: CheckCircle, color: 'green' },
    { label: 'Cancel', action: 'cancel', icon: XCircle, color: 'orange' },
  ],
  CONFIRMED: [
    { label: 'Complete', action: 'complete', icon: CheckCircle, color: 'green' },
    { label: 'No Show', action: 'no-show', icon: XCircle, color: 'red' },
    { label: 'Cancel', action: 'cancel', icon: XCircle, color: 'orange' },
  ],
  CANCELLED: [
    { label: 'Reschedule', action: 'reschedule', icon: Calendar, color: 'blue' },
  ],
  COMPLETED: [],
  NO_SHOW: [],
  RESCHEDULED: [
    { label: 'Confirm', action: 'confirm', icon: CheckCircle, color: 'green' },
    { label: 'Cancel', action: 'cancel', icon: XCircle, color: 'orange' },
  ],
};

export default function AppointmentDetailPage() {
  const { id } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch appointment data
  const { data: appointment, isLoading, isError } = useAppointment(id || '');

  // Mutations
  const { mutate: updateAppointment, isLoading: isUpdating } = useUpdateAppointment();
  const { mutate: deleteAppointment, isLoading: isDeleting } = useDeleteAppointment();
  const { mutate: confirmAppointment, isLoading: isConfirming } = useConfirmAppointment();
  const { mutate: cancelAppointment, isLoading: isCancelling } = useCancelAppointment();
  const { mutate: markNoShow, isLoading: isMarkingNoShow } = useMarkAppointmentNoShow();
  const { mutate: completeAppointment, isLoading: isCompleting } = useCompleteAppointment();

  // Set favorite state based on appointment data
  useEffect(() => {
    if (appointment) {
      setIsFavorite(false); // Placeholder - would come from actual data
    }
  }, [appointment]);

  // Handle action
  const handleAction = (action: string) => {
    if (!appointment) return;
    
    setSelectedAction(action);
    setShowStatusModal(true);
  };

  const confirmAction = () => {
    if (!appointment || !selectedAction) return;
    
    switch (selectedAction) {
      case 'confirm':
        confirmAppointment(appointment.id, {
          onSuccess: () => {
            setShowStatusModal(false);
            setSelectedAction(null);
            queryClient.invalidateQueries({ queryKey: ['appointment', appointment.id] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          },
        });
        break;
        
      case 'cancel':
        cancelAppointment({ id: appointment.id, reason: 'Cancelled by admin' }, {
          onSuccess: () => {
            setShowStatusModal(false);
            setSelectedAction(null);
            queryClient.invalidateQueries({ queryKey: ['appointment', appointment.id] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          },
        });
        break;
        
      case 'no-show':
        markNoShow(appointment.id, {
          onSuccess: () => {
            setShowStatusModal(false);
            setSelectedAction(null);
            queryClient.invalidateQueries({ queryKey: ['appointment', appointment.id] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          },
        });
        break;
        
      case 'complete':
        completeAppointment(appointment.id, {
          onSuccess: () => {
            setShowStatusModal(false);
            setSelectedAction(null);
            queryClient.invalidateQueries({ queryKey: ['appointment', appointment.id] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          },
        });
        break;
        
      default:
        setShowStatusModal(false);
        setSelectedAction(null);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (!appointment) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!appointment) return;
    
    deleteAppointment(appointment.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        navigate('/appointments');
      },
    });
  };

  // Toggle favorite
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // Would call backend API to update favorites
  };

  // Get status color
  const getStatusColor = (status: AppointmentStatus) => {
    return APPOINTMENT_STATUS_COLORS[status] || APPOINTMENT_STATUS_COLORS.SCHEDULED;
  };

  // Format duration
  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours === 1) {
      return minutes > 0 ? `1 hour ${minutes} min` : '1 hour';
    }
    
    return minutes > 0 ? `${hours} hours ${minutes} min` : `${hours} hours`;
  };

  // Format lead name
  const formatLeadName = (lead: Lead | null) => {
    return formatName(lead?.firstName, lead?.lastName) || 'Unknown';
  };

  // Format assignee name
  const formatAssigneeName = (user: any | null) => {
    return formatName(user?.firstName, user?.lastName) || 'Unassigned';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (isError || !appointment) {
    return (
      <div className="empty-state">
        <Calendar className="empty-state-icon" />
        <h3 className="empty-state-title">Appointment not found</h3>
        <p className="empty-state-description">
          The appointment you're looking for doesn't exist or has been deleted.
        </p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => navigate('/appointments')} className="btn btn-primary">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Appointments
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get action button config
  const actionButtons = statusActionButtons[appointment.status] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/appointments')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Appointments
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="avatar avatar-lg">
                {formatLeadName(appointment.lead).charAt(0)}
              </div>
              <button
                onClick={toggleFavorite}
                className="absolute -top-1 -right-1 h-6 w-6 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                {isFavorite ? (
                  <Star className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Star className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            
            <div>
              <h1 className="page-title">
                {appointment.title || appointment.meetingType?.name || 'Untitled Meeting'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">
                  {formatDateTime(appointment.startTime)}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-600">
                  {formatDuration(appointment.startTime, appointment.endTime)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status badge with dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                getStatusColor(appointment.status).bg,
                getStatusColor(appointment.status).text
              )}
            >
              {appointment.status.replace('_', ' ')}
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white border border-gray-200 z-50">
                <div className="p-2">
                  {actionButtons.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.action}
                        onClick={() => {
                          handleAction(action.action);
                          setShowMoreMenu(false);
                        }}
                        className={cn(
                          'dropdown-item w-full text-left',
                          `text-${action.color}-600 hover:text-${action.color}-700`
                        )}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {action.label}
                      </button>
                    );
                  })}
                  
                  {actionButtons.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No actions available
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => navigate(`/appointments/${appointment.id}/edit`)}
            className="btn btn-outline btn-sm"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </button>
          
          {(isAdmin || user?.id === appointment.assigneeId) && (
            <button
              onClick={handleDelete}
              className="btn btn-danger btn-sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Appointment info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Details Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Appointment Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date</label>
                    <p className="text-gray-900">{formatDate(appointment.startTime)}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Time</label>
                    <p className="text-gray-900">
                      {new Date(appointment.startTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                      {' - '}
                      {new Date(appointment.endTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Timezone</label>
                    <p className="text-gray-900">{appointment.timezone || 'UTC'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Tag className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Meeting Type</label>
                    <p className="text-gray-900">{appointment.meetingType?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    {appointment.description ? (
                      <p className="text-gray-900">{appointment.description}</p>
                    ) : (
                      <p className="text-gray-500">No description</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    {appointment.location ? (
                      <p className="text-gray-900">{appointment.location}</p>
                    ) : (
                      <p className="text-gray-500">No location specified</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Video className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Virtual Meeting</label>
                    <p className="text-gray-900">
                      {appointment.isVirtual ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
                
                {appointment.meetingLink && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Link2 className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Meeting Link</label>
                      <a
                        href={appointment.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 hover:underline text-sm block"
                      >
                        {appointment.meetingLink}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lead Information Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Lead Information
            </h2>
            
            {appointment.lead ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-gray-900">{formatLeadName(appointment.lead)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <a 
                        href={`mailto:${appointment.lead.email}`}
                        className="block text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {formatEmail(appointment.lead.email) || 'N/A'}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <a 
                        href={`tel:${appointment.lead.phone}`}
                        className="block text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {formatPhone(appointment.lead.phone) || 'N/A'}
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company</label>
                      <p className="text-gray-900">{appointment.lead.company || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Job Title</label>
                      <p className="text-gray-900">{appointment.lead.jobTitle || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Tag className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Lead Status</label>
                      <span className={cn(
                        'badge',
                        appointment.lead.status === 'QUALIFIED' ? 'badge-success' :
                        appointment.lead.status === 'DISQUALIFIED' ? 'badge-danger' :
                        appointment.lead.status === 'BOOKED' ? 'badge-primary' :
                        'badge-gray'
                      )}>
                        {appointment.lead.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No lead associated with this appointment
              </p>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                to={`/leads/${appointment.leadId}`}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                View Full Lead Details
              </Link>
            </div>
          </div>

          {/* Assignee Information Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Assignee Information
            </h2>
            
            {appointment.assignee ? (
              <div className="flex items-start gap-4">
                <div className="avatar avatar-lg flex-shrink-0">
                  {formatAssigneeName(appointment.assignee).charAt(0)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl font-semibold text-gray-900">
                      {formatAssigneeName(appointment.assignee)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <a 
                        href={`mailto:${appointment.assignee.email}`}
                        className="block text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {formatEmail(appointment.assignee.email)}
                      </a>
                    </div>
                    
                    {appointment.assignee.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-900">{formatPhone(appointment.assignee.phone)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No assignee assigned to this appointment
              </p>
            )}
          </div>

          {/* Notes Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Notes
              </h2>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="btn btn-primary btn-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </button>
            </div>
            
            {/* Add note form */}
            {showNoteForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this appointment..."
                  rows={3}
                  className="input w-full mb-3"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowNoteForm(false);
                      setNewNote('');
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Handle note submission
                      setIsSubmittingNote(true);
                      // In a real app, you would call the API here
                      setTimeout(() => {
                        setIsSubmittingNote(false);
                        setShowNoteForm(false);
                        setNewNote('');
                      }, 1000);
                    }}
                    className="btn btn-primary btn-sm"
                    disabled={!newNote.trim() || isSubmittingNote}
                  >
                    {isSubmittingNote ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Add Note
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {/* Notes list */}
            <div className="space-y-4">
              {appointment.notes ? (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-500">
                    {appointment.notes}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No notes yet. Add a note to keep track of your interactions.
                </p>
              )}
            </div>
          </div>

          {/* Activity Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Activity
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-primary-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      Appointment Created
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeDate(appointment.createdAt)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    Appointment was created with ID: {appointment.id}
                  </p>
                </div>
              </div>
              
              {appointment.confirmedAt && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        Appointment Confirmed
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeDate(appointment.confirmedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {appointment.cancelledAt && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        Appointment Cancelled
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeDate(appointment.cancelledAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {appointment.completedAt && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        Appointment Completed
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeDate(appointment.completedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Appointment Details Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Appointment Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Appointment ID</label>
                <p className="text-gray-900 font-mono text-sm">{appointment.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{formatDateTime(appointment.createdAt)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900">{formatDateTime(appointment.updatedAt)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Organization</label>
                <p className="text-gray-900">{appointment.organization?.name || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Calendar Event ID</label>
                <p className="text-gray-900 font-mono text-sm">
                  {appointment.calendarEventId || 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Calendar Type</label>
                <p className="text-gray-900">
                  {appointment.calendarType?.replace('_', ' ') || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Status Timeline Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Status Timeline
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                  getStatusColor('SCHEDULED').bg
                )}>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Scheduled</p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(appointment.createdAt)}
                  </p>
                </div>
              </div>
              
              {appointment.confirmedAt && (
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                    getStatusColor('CONFIRMED').bg
                  )}>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Confirmed</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(appointment.confirmedAt)}
                    </p>
                  </div>
                </div>
              )}
              
              {appointment.completedAt && (
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                    getStatusColor('COMPLETED').bg
                  )}>
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Completed</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(appointment.completedAt)}
                    </p>
                  </div>
                </div>
              )}
              
              {appointment.cancelledAt && (
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                    getStatusColor('CANCELLED').bg
                  )}>
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Cancelled</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(appointment.cancelledAt)}
                    </p>
                  </div>
                </div>
              )}
              
              {appointment.status === 'NO_SHOW' && !appointment.cancelledAt && (
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                    getStatusColor('NO_SHOW').bg
                  )}>
                    <XCircle className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">No Show</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(appointment.startTime)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            
            <div className="space-y-3">
              {appointment.lead?.email && (
                <button
                  onClick={() => window.open(`mailto:${appointment.lead.email}`, '_blank')}
                  className="w-full flex items-center justify-center gap-2 btn btn-outline"
                >
                  <Mail className="h-4 w-4" />
                  Email Lead
                </button>
              )}
              
              {appointment.lead?.phone && (
                <button
                  onClick={() => window.open(`tel:${appointment.lead.phone}`, '_blank')}
                  className="w-full flex items-center justify-center gap-2 btn btn-outline"
                >
                  <Phone className="h-4 w-4" />
                  Call Lead
                </button>
              )}
              
              {appointment.assignee?.email && (
                <button
                  onClick={() => window.open(`mailto:${appointment.assignee.email}`, '_blank')}
                  className="w-full flex items-center justify-center gap-2 btn btn-outline"
                >
                  <Mail className="h-4 w-4" />
                  Email Assignee
                </button>
              )}
              
              <button
                onClick={() => navigate(`/appointments/${appointment.id}/edit`)}
                className="w-full flex items-center justify-center gap-2 btn btn-outline"
              >
                <Edit className="h-4 w-4" />
                Edit Appointment
              </button>
              
              <button
                onClick={() => navigate(`/appointments/new?rescheduleFrom=${appointment.id}`)}
                className="w-full flex items-center justify-center gap-2 btn btn-outline"
              >
                <Calendar className="h-4 w-4" />
                Reschedule
              </button>
              
              {appointment.meetingLink && (
                <button
                  onClick={() => window.open(appointment.meetingLink!, '_blank')}
                  className="w-full flex items-center justify-center gap-2 btn btn-primary"
                >
                  <Video className="h-4 w-4" />
                  Join Meeting
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && selectedAction && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div 
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowUpDown className="h-6 w-6 text-primary-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirm Action
              </h3>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to{' '}
                <span className="font-medium text-primary-600">
                  {selectedAction.replace('-', ' ')}
                </span>{' '}
                this appointment?
              </p>
              
              {selectedAction === 'cancel' && (
                <div className="mb-4 text-left">
                  <label className="label">Reason for cancellation</label>
                  <textarea
                    placeholder="Enter reason..."
                    rows={2}
                    className="input w-full"
                  />
                </div>
              )}
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                
                <button
                  onClick={confirmAction}
                  className="btn btn-primary"
                  disabled={
                    isUpdating || 
                    isConfirming || 
                    isCancelling || 
                    isMarkingNoShow || 
                    isCompleting
                  }
                >
                  {(isUpdating || isConfirming || isCancelling || isMarkingNoShow || isCompleting) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
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
                Are you sure you want to delete "{appointment.title || appointment.meetingType?.name || 'this appointment'}"? 
                This action cannot be undone and all related data will be lost.
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-outline"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                
                <button
                  onClick={confirmDelete}
                  className="btn btn-danger"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Appointment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
