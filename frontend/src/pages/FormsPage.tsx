import { useState } from 'react';
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
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  Copy,
  Link2,
  BarChart3
} from 'lucide-react';
import { useForms, useFormStats, useDeleteForm, useToggleFormStatus } from '../hooks/useForms';
import { useAuth } from '../hooks/useAuth';
import { BookingForm, PaginationParams } from '../types';
import { cn, formatDate, formatRelativeDate } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';

// Sort options
const sortOptions = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name (A-Z)' },
  { value: 'name:desc', label: 'Name (Z-A)' },
  { value: 'visitCount:desc', label: 'Most visited' },
  { value: 'submissionCount:desc', label: 'Most submissions' },
];

export default function FormsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  
  // State for filters and pagination
  const [filters, setFilters] = useState<PaginationParams>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formToDelete, setFormToDelete] = useState<BookingForm | null>(null);

  // Fetch forms with filters
  const { data: formsData, isLoading, isFetching } = useForms({
    ...filters,
    search: searchQuery || undefined,
  });

  // Fetch stats
  const { data: statsData } = useFormStats();

  // Mutations
  const { mutate: deleteForm } = useDeleteForm();
  const { mutate: toggleFormStatus } = useToggleFormStatus();

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<PaginationParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
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
  const handleDelete = (form: BookingForm) => {
    setFormToDelete(form);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (formToDelete) {
      deleteForm(formToDelete.id, {
        onSuccess: () => {
          setShowDeleteModal(false);
          setFormToDelete(null);
        },
      });
    }
  };

  // Handle toggle status
  const handleToggleStatus = (form: BookingForm) => {
    toggleFormStatus({ id: form.id, isActive: !form.isActive });
  };

  // Refresh data
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['forms'] });
    queryClient.invalidateQueries({ queryKey: ['form-stats'] });
  };

  // Copy form URL
  const copyFormUrl = (form: BookingForm) => {
    const url = `${window.location.origin}/forms/${form.id}`;
    navigator.clipboard.writeText(url);
  };

  // Calculate total pages
  const totalPages = formsData?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">Booking Forms</h1>
          <p className="page-subtitle">
            Manage your booking forms. Total: {formsData?.pagination?.total || 0} forms
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
            onClick={() => navigate('/forms/new')}
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Form
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card text-center p-3 hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-gray-900">{statsData?.total || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Total Forms</div>
        </div>
        
        <div className="stat-card text-center p-3 hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-blue-600">{statsData?.recentSubmissions || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Recent Submissions</div>
        </div>
        
        <div className="stat-card text-center p-3 hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-green-600">
            {formsData?.data?.filter(f => f.isActive).length || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Active Forms</div>
        </div>
        
        <div className="stat-card text-center p-3 hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-gray-600">
            {formsData?.data?.filter(f => !f.isActive).length || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Inactive Forms</div>
        </div>
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
                placeholder="Search forms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input appearance-none pr-10"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
              Showing {formsData?.pagination?.page || 1} of {formsData?.pagination?.totalPages || 1} pages
              {formsData?.pagination?.total && ` (${formsData.pagination.total} total)`}
            </p>
          </div>

          {/* Forms Table */}
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
                  <th>Form</th>
                  <th>Description</th>
                  <th>Fields</th>
                  <th>Visits</th>
                  <th>Submissions</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="w-12">Actions</th>
                </tr>
              </thead>
              <tbody>
                {formsData?.data?.map((form) => (
                  <tr
                    key={form.id}
                    className="hover:bg-gray-50"
                  >
                    <td>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm bg-purple-100 text-purple-700">
                          {form.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{form.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-gray-600">
                        {form.description || 'No description'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">
                        {form.fields?.length || 0}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">
                        {form.visitCount || 0}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">
                        {form.submissionCount || 0}
                      </span>
                    </td>
                    <td>
                      <span className={cn(
                        'badge',
                        form.isActive ? 'badge-success' : 'badge-gray'
                      )}>
                        {form.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {formatDate(form.createdAt)}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setShowMoreMenu(form.id)}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-400" />
                      </button>
                      
                      {/* More menu dropdown */}
                      {showMoreMenu === form.id && (
                        <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white border border-gray-200 z-50">
                          <div className="p-2">
                            <Link
                              to={`/forms/${form.id}`}
                              className="dropdown-item"
                              onClick={() => setShowMoreMenu(null)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                            
                            <Link
                              to={`/forms/${form.id}/edit`}
                              className="dropdown-item"
                              onClick={() => setShowMoreMenu(null)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                            
                            <button
                              onClick={() => {
                                copyFormUrl(form);
                                setShowMoreMenu(null);
                              }}
                              className="dropdown-item w-full text-left"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy URL
                            </button>
                            
                            <Link
                              to={`/forms/${form.id}`}
                              className="dropdown-item"
                              onClick={() => setShowMoreMenu(null)}
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Analytics
                            </Link>
                            
                            <button
                              onClick={() => {
                                handleToggleStatus(form);
                                setShowMoreMenu(null);
                              }}
                              className="dropdown-item w-full text-left"
                            >
                              {form.isActive ? (
                                <>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Enable
                                </>
                              )}
                            </button>
                            
                            {(isAdmin) && (
                              <button
                                onClick={() => {
                                  handleDelete(form);
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
          {formsData?.data?.length === 0 && (
            <div className="empty-state">
              <FileText className="empty-state-icon" />
              <h3 className="empty-state-title">No forms found</h3>
              <p className="empty-state-description">
                {searchQuery || statusFilter
                  ? 'No forms match your search criteria. Try adjusting your filters.'
                  : 'No forms have been created yet. Click "New Form" to get started.'}
              </p>
              <button
                onClick={() => navigate('/forms/new')}
                className="btn btn-primary mt-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Form
              </button>
            </div>
          )}

          {/* Pagination */}
          {formsData?.pagination && formsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {formsData.pagination.page} of {formsData.pagination.totalPages}
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
      {showDeleteModal && formToDelete && (
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
                Delete Form
              </h3>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{formToDelete.name}"? 
                This action cannot be undone and all submissions will be lost.
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
                  Delete Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
