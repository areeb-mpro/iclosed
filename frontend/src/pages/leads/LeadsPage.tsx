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
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { useLeads, useLeadStats, useDeleteLead } from '../../hooks/useLeads';
import { useAuth } from '../../hooks/useAuth';
import { Lead, LeadStatus, LeadFilterParams } from '../../types';
import { LEAD_STATUS_COLORS } from '../../utils/constants';
import { cn, formatDate, formatName, formatPhone } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

// Status filter options
const statusOptions: { value: LeadStatus | ''; label: string; count?: number }[] = [
  { value: '', label: 'All Status' },
  { value: 'NEW', label: 'New' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'DISQUALIFIED', label: 'Disqualified' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'CLOSED_WON', label: 'Closed Won' },
  { value: 'CLOSED_LOST', label: 'Closed Lost' },
];

// Source filter options
const sourceOptions = [
  { value: '', label: 'All Sources' },
  { value: 'BOOKING_FORM', label: 'Booking Form' },
  { value: 'IMPORTED', label: 'Imported' },
  { value: 'API', label: 'API' },
  { value: 'MANUAL', label: 'Manual' },
];

// Sort options
const sortOptions = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'firstName:asc', label: 'Name (A-Z)' },
  { value: 'firstName:desc', label: 'Name (Z-A)' },
  { value: 'qualificationScore:desc', label: 'Highest score' },
  { value: 'qualificationScore:asc', label: 'Lowest score' },
];

export default function LeadsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  
  // State for filters and pagination
  const [filters, setFilters] = useState<LeadFilterParams>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);

  // Fetch leads with filters
  const { data: leadsData, isLoading, isFetching } = useLeads({
    ...filters,
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    source: sourceFilter as any || undefined,
    ownerId: ownerFilter || undefined,
  });

  // Fetch stats for counts
  const { data: statsData } = useLeadStats();

  // Delete lead mutation
  const { mutate: deleteLead } = useDeleteLead();

  // Update status options with counts from stats
  const statusOptionsWithCounts = useMemo(() => {
    if (!statsData?.byStatus) return statusOptions;
    
    return statusOptions.map(option => {
      if (option.value && statsData.byStatus[option.value as LeadStatus]) {
        return {
          ...option,
          count: statsData.byStatus[option.value as LeadStatus],
        };
      }
      return option;
    });
  }, [statsData]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<LeadFilterParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  // Handle status filter change
  const handleStatusChange = (value: LeadStatus | '') => {
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
  const handleDelete = (lead: Lead) => {
    setLeadToDelete(lead);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (leadToDelete) {
      deleteLead(leadToDelete.id, {
        onSuccess: () => {
          setShowDeleteModal(false);
          setLeadToDelete(null);
        },
      });
    }
  };

  // Refresh data
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
  };

  // Get status badge
  const getStatusBadge = (status: LeadStatus) => {
    const colors = LEAD_STATUS_COLORS[status] || LEAD_STATUS_COLORS.NEW;
    return (
      <span className={cn('badge', colors.bg, colors.text)}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  // Format lead name
  const formatLeadName = (lead: Lead) => {
    return formatName(lead.firstName, lead.lastName) || 'Unknown';
  };

  // Format lead company
  const formatLeadCompany = (lead: Lead) => {
    return lead.company || lead.email || 'N/A';
  };

  // Calculate total pages
  const totalPages = leadsData?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">
            Manage all your leads. Total: {leadsData?.pagination?.total || 0} leads
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
            onClick={() => navigate('/leads/new')}
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Lead
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total', value: statsData?.total || 0, status: 'NEW' },
          { label: 'Qualified', value: statsData?.byStatus?.QUALIFIED || 0, status: 'QUALIFIED' },
          { label: 'Disqualified', value: statsData?.byStatus?.DISQUALIFIED || 0, status: 'DISQUALIFIED' },
          { label: 'Booked', value: statsData?.byStatus?.BOOKED || 0, status: 'BOOKED' },
          { label: 'Closed Won', value: statsData?.byStatus?.CLOSED_WON || 0, status: 'CLOSED_WON' },
          { label: 'Closed Lost', value: statsData?.byStatus?.CLOSED_LOST || 0, status: 'CLOSED_LOST' },
          { label: 'No Show', value: statsData?.byStatus?.NO_SHOW || 0, status: 'NO_SHOW' },
          { label: 'Contacted', value: statsData?.byStatus?.CONTACTED || 0, status: 'CONTACTED' },
        ].map((stat) => (
          <Link
            key={stat.label}
            to={`/leads?status=${stat.status.toLowerCase()}`}
            className="stat-card text-center p-3 hover:shadow-md transition-shadow"
          >
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            <div className="mt-2">
              {getStatusBadge(stat.status as LeadStatus)}
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
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus | '')}
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
            
            {/* Source Filter */}
            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="input appearance-none pr-10"
              >
                {sourceOptions.map((option) => (
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
                <label className="label">Owner</label>
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="input"
                >
                  <option value="">All Owners</option>
                  {/* In a real app, you would populate this with actual users */}
                </select>
              </div>
              
              <div>
                <label className="label">Date Range</label>
                <select className="input">
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="quarter">Last 90 Days</option>
                </select>
              </div>
              
              <div>
                <label className="label">Qualification Score</label>
                <select className="input">
                  <option value="">All Scores</option>
                  <option value="100">100%</option>
                  <option value="75">75%+</option>
                  <option value="50">50%+</option>
                  <option value="25">25%+</option>
                  <option value="0">0%</option>
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
              Showing {leadsData?.pagination?.page || 1} of {leadsData?.pagination?.totalPages || 1} pages
              {leadsData?.pagination?.total && ` (${leadsData.pagination.total} total)`}
            </p>
          </div>

          {/* Leads Table */}
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
                  <th>Lead</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Source</th>
                  <th>Created</th>
                  <th className="w-12">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leadsData?.data?.map((lead) => (
                  <tr
                    key={lead.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/leads/${lead.id}`)}
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
                          {formatLeadName(lead).charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{formatLeadName(lead)}</div>
                          {lead.jobTitle && (
                            <div className="text-xs text-gray-500">{lead.jobTitle}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <a 
                        href={`mailto:${lead.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {lead.email || 'N/A'}
                      </a>
                    </td>
                    <td>{formatPhone(lead.phone) || 'N/A'}</td>
                    <td className="truncate-2 max-w-[150px]">{formatLeadCompany(lead)}</td>
                    <td>{getStatusBadge(lead.status)}</td>
                    <td>
                      {lead.qualificationScore !== null ? (
                        <span className={cn(
                          'font-medium',
                          lead.qualificationScore >= 75 ? 'text-green-600' :
                          lead.qualificationScore >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        )}>
                          {lead.qualificationScore}%
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <span className="badge badge-gray">
                        {lead.source?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {formatDate(lead.createdAt)}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setShowMoreMenu(lead.id)}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-400" />
                      </button>
                      
                      {/* More menu dropdown */}
                      {showMoreMenu === lead.id && (
                        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white border border-gray-200 z-50">
                          <div className="p-2">
                            <Link
                              to={`/leads/${lead.id}`}
                              className="dropdown-item"
                              onClick={() => setShowMoreMenu(null)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                            
                            <Link
                              to={`/leads/${lead.id}/edit`}
                              className="dropdown-item"
                              onClick={() => setShowMoreMenu(null)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                            
                            {(isAdmin || user?.id === lead.ownerId) && (
                              <button
                                onClick={() => {
                                  handleDelete(lead);
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
          {leadsData?.data?.length === 0 && (
            <div className="empty-state">
              <Users className="empty-state-icon" />
              <h3 className="empty-state-title">No leads found</h3>
              <p className="empty-state-description">
                {searchQuery || statusFilter || sourceFilter || ownerFilter
                  ? 'No leads match your search criteria. Try adjusting your filters.'
                  : 'No leads have been created yet. Click "Add Lead" to get started.'}
              </p>
              <button
                onClick={() => navigate('/leads/new')}
                className="btn btn-primary mt-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Lead
              </button>
            </div>
          )}

          {/* Pagination */}
          {leadsData?.pagination && leadsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {leadsData.pagination.page} of {leadsData.pagination.totalPages}
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
      {showDeleteModal && leadToDelete && (
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
                Are you sure you want to delete "{formatLeadName(leadToDelete)}"? 
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

// Helper functions
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatName = (firstName: string | null, lastName: string | null) => {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
};

const formatPhone = (phone: string | null) => {
  if (!phone) return null;
  // Simple phone formatting
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  return phone;
};
