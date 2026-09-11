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
  Building, 
  Briefcase, 
  Globe, 
  Calendar, 
  Clock, 
  User,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  Tag,
  Plus,
  Send,
  Loader2,
  Eye,
  EyeOff,
  Star,
  StarOff
} from 'lucide-react';
import { useLead, useUpdateLead, useAddLeadNote, useDeleteLead } from '../../hooks/useLeads';
import { useAuth } from '../../hooks/useAuth';
import { Lead, LeadStatus, LeadNote, User as UserType } from '../../types';
import { LEAD_STATUS_COLORS, LEAD_SOURCE_COLORS } from '../../utils/constants';
import { 
  formatDate, 
  formatName, 
  formatPhone, 
  formatEmail,
  cn,
  formatRelativeDate
} from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

// Status transition options
const statusTransitionOptions: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['QUALIFIED', 'DISQUALIFIED', 'CONTACTED'],
  QUALIFIED: ['CONTACTED', 'BOOKED', 'DISQUALIFIED'],
  DISQUALIFIED: ['NEW', 'CONTACTED'],
  CONTACTED: ['QUALIFIED', 'BOOKED', 'DISQUALIFIED', 'CLOSED_WON', 'CLOSED_LOST'],
  BOOKED: ['CONTACTED', 'NO_SHOW', 'CLOSED_WON', 'CLOSED_LOST'],
  NO_SHOW: ['CONTACTED', 'CLOSED_LOST'],
  CLOSED_WON: [],
  CLOSED_LOST: [],
};

export default function LeadDetailPage() {
  const { id } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Fetch lead data
  const { data: lead, isLoading, isError } = useLead(id || '');

  // Mutations
  const { mutate: updateLead, isLoading: isUpdating } = useUpdateLead();
  const { mutate: addNote, isLoading: isAddingNote } = useAddLeadNote();
  const { mutate: deleteLead, isLoading: isDeleting } = useDeleteLead();

  // Set favorite state based on lead data
  useEffect(() => {
    if (lead) {
      // Check if lead is in user's favorites (would need backend support)
      setIsFavorite(false); // Placeholder - would come from actual data
    }
  }, [lead]);

  // Handle status change
  const handleStatusChange = (newStatus: LeadStatus) => {
    if (!lead) return;
    
    setSelectedStatus(newStatus);
    setShowStatusModal(true);
  };

  const confirmStatusChange = () => {
    if (!lead || !selectedStatus) return;
    
    updateLead(
      { 
        id: lead.id, 
        data: { status: selectedStatus } 
      },
      {
        onSuccess: () => {
          setShowStatusModal(false);
          setSelectedStatus(null);
          queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
        },
      }
    );
  };

  // Handle adding a note
  const handleAddNote = () => {
    if (!lead || !newNote.trim()) return;
    
    setIsSubmittingNote(true);
    
    addNote(
      { 
        leadId: lead.id, 
        content: newNote 
      },
      {
        onSuccess: () => {
          setNewNote('');
          setShowNoteForm(false);
          queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
        },
        onSettled: () => {
          setIsSubmittingNote(false);
        },
      }
    );
  };

  // Handle delete
  const handleDelete = () => {
    if (!lead) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!lead) return;
    
    deleteLead(lead.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        navigate('/leads');
      },
    });
  };

  // Toggle favorite
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // Would call backend API to update favorites
  };

  // Get status color
  const getStatusColor = (status: LeadStatus) => {
    return LEAD_STATUS_COLORS[status] || LEAD_STATUS_COLORS.NEW;
  };

  // Get source color
  const getSourceColor = (source: string | null) => {
    if (!source) return LEAD_SOURCE_COLORS.MANUAL;
    return LEAD_SOURCE_COLORS[source as keyof typeof LEAD_SOURCE_COLORS] || LEAD_SOURCE_COLORS.MANUAL;
  };

  // Format address
  const formatAddress = (lead: Lead) => {
    const parts: string[] = [];
    if (lead.customFields?.address) parts.push(lead.customFields.address);
    if (lead.customFields?.city) parts.push(lead.customFields.city);
    if (lead.customFields?.state) parts.push(lead.customFields.state);
    if (lead.customFields?.zip) parts.push(lead.customFields.zip);
    if (lead.customFields?.country) parts.push(lead.customFields.country);
    return parts.join(', ') || 'N/A';
  };

  // Get custom field value
  const getCustomField = (fieldName: string) => {
    if (!lead?.customFields) return null;
    return lead.customFields[fieldName] || null;
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
  if (isError || !lead) {
    return (
      <div className="empty-state">
        <User className="empty-state-icon" />
        <h3 className="empty-state-title">Lead not found</h3>
        <p className="empty-state-description">
          The lead you're looking for doesn't exist or has been deleted.
        </p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => navigate('/leads')} className="btn btn-primary">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Leads
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/leads')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Leads
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="avatar avatar-lg">
                {formatName(lead.firstName, lead.lastName).charAt(0)}
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
              <h1 className="page-title">{formatName(lead.firstName, lead.lastName)}</h1>
              <div className="flex items-center gap-2 mt-1">
                {lead.jobTitle && (
                  <span className="text-sm text-gray-600">{lead.jobTitle}</span>
                )}
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-600">{lead.company || 'No company'}</span>
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
                getStatusColor(lead.status).bg,
                getStatusColor(lead.status).text
              )}
            >
              {lead.status.replace('_', ' ')}
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white border border-gray-200 z-50">
                <div className="p-2">
                  {statusTransitionOptions[lead.status].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        handleStatusChange(status);
                        setShowMoreMenu(false);
                      }}
                      className="dropdown-item w-full text-left"
                    >
                      <span className={cn(
                        'w-2 h-2 rounded-full mr-2',
                        LEAD_STATUS_COLORS[status].dot
                      )} />
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                  
                  {statusTransitionOptions[lead.status].length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No further transitions available
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => navigate(`/leads/${lead.id}/edit`)}
            className="btn btn-outline btn-sm"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </button>
          
          {(isAdmin || user?.id === lead.ownerId) && (
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
        {/* Left column - Lead info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Contact Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <a 
                      href={`mailto:${lead.email}`}
                      className="block text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      {formatEmail(lead.email) || 'N/A'}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <a 
                      href={`tel:${lead.phone}`}
                      className="block text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      {formatPhone(lead.phone) || 'N/A'}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Job Title</label>
                    <p className="text-gray-900">{lead.jobTitle || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company</label>
                    <p className="text-gray-900">{lead.company || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Website</label>
                    {lead.customFields?.website ? (
                      <a 
                        href={lead.customFields.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-primary-600 hover:text-primary-700 hover:underline truncate-2"
                      >
                        {lead.customFields.website}
                      </a>
                    ) : (
                      <p className="text-gray-900">N/A</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Tag className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lead Source</label>
                    <span className={cn(
                      'badge',
                      getSourceColor(lead.source).bg,
                      getSourceColor(lead.source).text
                    )}>
                      {lead.source?.replace('_', ' ') || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Information Card */}
          {lead.company && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Company Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company Name</label>
                    <p className="text-gray-900">{lead.company}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company Size</label>
                    <p className="text-gray-900">
                      {getCustomField('companySize') || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Industry</label>
                    <p className="text-gray-900">
                      {getCustomField('industry') || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Budget</label>
                    <p className="text-gray-900">
                      {getCustomField('budget') || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Country</label>
                    <p className="text-gray-900">
                      {getCustomField('country') || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-gray-900 truncate-2">
                      {formatAddress(lead)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Qualification Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Qualification
              </h2>
              {lead.qualificationScore !== null && (
                <span className={cn(
                  'px-4 py-2 rounded-lg text-2xl font-bold',
                  lead.qualificationScore >= 75 ? 'bg-green-100 text-green-700' :
                  lead.qualificationScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {lead.qualificationScore}%
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-3 h-3 rounded-full',
                      getStatusColor(lead.status).dot
                    )} />
                    <span className={cn(
                      'font-medium',
                      getStatusColor(lead.status).text
                    )}>
                      {lead.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Qualified At</label>
                  <p className="text-gray-900">
                    {lead.qualifiedAt ? formatDate(lead.qualifiedAt) : 'N/A'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Booked At</label>
                  <p className="text-gray-900">
                    {lead.bookedAt ? formatDate(lead.bookedAt) : 'N/A'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Closed At</label>
                  <p className="text-gray-900">
                    {lead.closedAt ? formatDate(lead.closedAt) : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                {lead.disqualificationReason && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Disqualification Reason
                    </label>
                    <p className="text-red-600">{lead.disqualificationReason}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Assigned To
                  </label>
                  {lead.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="avatar avatar-sm">
                        {formatName(lead.assignee.firstName, lead.assignee.lastName).charAt(0)}
                      </div>
                      <span className="text-gray-900">
                        {formatName(lead.assignee.firstName, lead.assignee.lastName)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-gray-500">Unassigned</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Owner
                  </label>
                  {lead.owner ? (
                    <div className="flex items-center gap-2">
                      <div className="avatar avatar-sm">
                        {formatName(lead.owner.firstName, lead.owner.lastName).charAt(0)}
                      </div>
                      <span className="text-gray-900">
                        {formatName(lead.owner.firstName, lead.owner.lastName)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-gray-500">No owner</p>
                  )}
                </div>
              </div>
            </div>
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
                  placeholder="Add a note about this lead..."
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
                    disabled={isSubmittingNote || isAddingNote}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNote}
                    className="btn btn-primary btn-sm"
                    disabled={!newNote.trim() || isSubmittingNote || isAddingNote}
                  >
                    {isSubmittingNote || isAddingNote ? (
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
              {lead.notes?.length ? (
                lead.notes.map((note: LeadNote) => (
                  <div
                    key={note.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {note.createdBy?.avatar ? (
                          <img
                            src={note.createdBy.avatar}
                            alt={formatName(note.createdBy.firstName, note.createdBy.lastName)}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="avatar avatar-sm">
                            {formatName(
                              note.createdBy?.firstName, 
                              note.createdBy?.lastName
                            ).charAt(0)}
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {formatName(
                                note.createdBy?.firstName, 
                                note.createdBy?.lastName
                              ) || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatRelativeDate(note.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {showFullDescription || note.content.length <= 200 ? (
                              note.content
                            ) : (
                              <>
                                {note.content.substring(0, 200)}...
                                <button
                                  onClick={() => setShowFullDescription(true)}
                                  className="text-primary-600 hover:text-primary-700 font-medium ml-1"
                                >
                                  Show more
                                </button>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* Note actions */}
                      {(isAdmin || user?.id === note.createdById) && (
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Edit className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
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
              {lead.activities?.length ? (
                lead.activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      {activity.type === 'CREATED' && <FileText className="h-4 w-4 text-primary-600" />}
                      {activity.type === 'QUALIFIED' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {activity.type === 'DISQUALIFIED' && <XCircle className="h-4 w-4 text-red-600" />}
                      {activity.type === 'CONTACTED' && <Mail className="h-4 w-4 text-blue-600" />}
                      {activity.type === 'BOOKED' && <Calendar className="h-4 w-4 text-purple-600" />}
                      {activity.type === 'NOTE_ADDED' && <MessageSquare className="h-4 w-4 text-gray-600" />}
                      {activity.type === 'EMAIL_SENT' && <Send className="h-4 w-4 text-indigo-600" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {activity.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatRelativeDate(activity.createdAt)}
                        </span>
                      </div>
                      
                      {activity.createdBy && (
                        <p className="text-xs text-gray-500">
                          by {formatName(activity.createdBy.firstName, activity.createdBy.lastName)}
                        </p>
                      )}
                      
                      {activity.description && (
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No activity yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Lead Details Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Lead Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Lead ID</label>
                <p className="text-gray-900 font-mono text-sm">{lead.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{formatDate(lead.createdAt)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900">{formatDate(lead.updatedAt)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Organization</label>
                <p className="text-gray-900">{lead.organization?.name || 'N/A'}</p>
              </div>
              
              {lead.ipAddress && (
                <div>
                  <label className="text-sm font-medium text-gray-500">IP Address</label>
                  <p className="text-gray-900 font-mono text-sm">{lead.ipAddress}</p>
                </div>
              )}
              
              {lead.referrer && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Referrer</label>
                  <p className="text-gray-900 text-sm truncate-2">{lead.referrer}</p>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Card */}
          {lead.appointment && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Appointment
                </h2>
                <Link
                  to={`/appointments/${lead.appointment.id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  View
                </Link>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date & Time</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-900">
                      {formatDate(lead.appointment.startTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-900">
                      {new Date(lead.appointment.startTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' - '}
                      {new Date(lead.appointment.endTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={cn(
                    'badge',
                    lead.appointment.status === 'CONFIRMED' ? 'badge-success' :
                    lead.appointment.status === 'CANCELLED' ? 'badge-danger' :
                    lead.appointment.status === 'COMPLETED' ? 'badge-primary' :
                    'badge-gray'
                  )}>
                    {lead.appointment.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Meeting Type</label>
                  <p className="text-gray-900">{lead.appointment.meetingType?.name || 'N/A'}</p>
                </div>
                
                {lead.appointment.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="text-gray-900 text-sm truncate-2">{lead.appointment.location}</p>
                  </div>
                )}
                
                {lead.appointment.meetingLink && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Meeting Link</label>
                    <a
                      href={lead.appointment.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 hover:underline text-sm truncate-2 block"
                    >
                      {lead.appointment.meetingLink}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Fields Card */}
          {lead.customFields && Object.keys(lead.customFields).length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Custom Fields
              </h2>
              
              <div className="space-y-3">
                {Object.entries(lead.customFields).map(([key, value]) => {
                  // Skip fields already shown in other sections
                  const hiddenFields = ['website', 'companySize', 'industry', 'budget', 'country', 'address', 'city', 'state', 'zip'];
                  if (hiddenFields.includes(key)) return null;
                  
                  return (
                    <div key={key}>
                      <label className="text-sm font-medium text-gray-500">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </label>
                      <p className="text-gray-900 text-sm">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            
            <div className="space-y-3">
              <button
                onClick={() => window.open(`mailto:${lead.email}`, '_blank')}
                className="w-full flex items-center justify-center gap-2 btn btn-outline"
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              
              {lead.phone && (
                <button
                  onClick={() => window.open(`tel:${lead.phone}`, '_blank')}
                  className="w-full flex items-center justify-center gap-2 btn btn-outline"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </button>
              )}
              
              <button
                onClick={() => navigate(`/leads/${lead.id}/edit`)}
                className="w-full flex items-center justify-center gap-2 btn btn-outline"
              >
                <Edit className="h-4 w-4" />
                Edit Lead
              </button>
              
              <button
                onClick={() => navigate(`/appointments/new?leadId=${lead.id}`)}
                className="w-full flex items-center justify-center gap-2 btn btn-primary"
              >
                <Calendar className="h-4 w-4" />
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && selectedStatus && (
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
                Change Status
              </h3>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to change the status from{' '}
                <span className={cn('font-medium', getStatusColor(lead.status).text)}>
                  {lead.status.replace('_', ' ')}
                </span>{' '}
                to{' '}
                <span className={cn('font-medium', getStatusColor(selectedStatus).text)}>
                  {selectedStatus.replace('_', ' ')}
                </span>?
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                
                <button
                  onClick={confirmStatusChange}
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Updating...
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
                Delete Lead
              </h3>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{formatName(lead.firstName, lead.lastName)}"? 
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
                    'Delete Lead'
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
