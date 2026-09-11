import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { Organization, User } from '../types';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SettingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'organization' | 'integrations' | 'notifications' | 'security'>('organization');
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    timezone: '',
  });
  
  // Fetch organization
  const { data: organization, isLoading, isError, error } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await api.get<Organization>('/api/organization');
      return response;
    },
  });
  
  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await api.get<User>('/api/auth/me');
      return response;
    },
  });
  
  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put<Organization>('/api/organization', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Organization settings updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update settings');
    },
  });
  
  // Initialize form data
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        domain: organization.domain || '',
        timezone: organization.settings?.timezone || 'America/New_York',
      });
    }
  }, [organization]);
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgMutation.mutate({
      name: formData.name,
      domain: formData.domain,
      settings: {
        timezone: formData.timezone,
      }
    });
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }
  
  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Settings</h2>
            <p className="text-gray-600">{error?.message || 'Failed to load settings'}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your organization and preferences</p>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('organization')}
                className={`py-4 px-1 border-b-2 ${activeTab === 'organization' ? 'border-primary-500 text-primary-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Organization
              </button>
              <button
                onClick={() => setActiveTab('integrations')}
                className={`py-4 px-1 border-b-2 ${activeTab === 'integrations' ? 'border-primary-500 text-primary-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Integrations
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-1 border-b-2 ${activeTab === 'notifications' ? 'border-primary-500 text-primary-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Notifications
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-4 px-1 border-b-2 ${activeTab === 'security' ? 'border-primary-500 text-primary-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Security
              </button>
            </nav>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'organization' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Organization Settings</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">This is the name of your organization displayed in the app</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  <input
                    type="text"
                    name="domain"
                    value={formData.domain}
                    onChange={handleInputChange}
                    placeholder="example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">Your organization's domain for branding purposes</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Timezone</label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                    <option value="America/Chicago">Central Time (US & Canada)</option>
                    <option value="America/Denver">Mountain Time (US & Canada)</option>
                    <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Asia/Shanghai">Shanghai</option>
                    <option value="UTC">UTC</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">Default timezone for new users and appointments</p>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={updateOrgMutation.isPending}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateOrgMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
              
              {/* Organization Info */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Organization Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Organization ID:</span>
                    <span className="font-mono text-gray-900">{organization?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-gray-900">{formatDate(organization?.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="text-gray-900">{formatDate(organization?.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'integrations' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
              </div>
              
              <div className="space-y-6">
                {/* Google Calendar */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Google Calendar</h3>
                      <p className="text-sm text-gray-500">Sync appointments with Google Calendar</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentUser?.googleCalendarConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {currentUser?.googleCalendarConnected ? 'Connected' : 'Not Connected'}
                      </span>
                      <button
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        {currentUser?.googleCalendarConnected ? 'Reconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Outlook Calendar */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Outlook Calendar</h3>
                      <p className="text-sm text-gray-500">Sync appointments with Outlook Calendar</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentUser?.outlookCalendarConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {currentUser?.outlookCalendarConnected ? 'Connected' : 'Not Connected'}
                      </span>
                      <button
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        {currentUser?.outlookCalendarConnected ? 'Reconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Email Integration */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Email Integration</h3>
                      <p className="text-sm text-gray-500">Send emails through your SMTP server</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Configured
                      </span>
                      <button
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* SMS Integration */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">SMS Integration</h3>
                      <p className="text-sm text-gray-500">Send SMS notifications via Twilio</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Configured
                      </span>
                      <button
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Webhooks */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Webhooks</h3>
                      <p className="text-sm text-gray-500">Receive real-time notifications via webhooks</p>
                    </div>
                    <button
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      Manage Webhooks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
              </div>
              
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Email Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">New lead assigned to me</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">New appointment booked</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Appointment reminder (1 hour before)</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Lead qualified</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Daily summary</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">SMS Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">New appointment booked</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Appointment reminder (1 hour before)</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" />
                      <span className="ml-2 text-sm text-gray-700">New lead assigned to me</span>
                    </label>
                  </div>
                </div>
                
                <button
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  Save Notification Preferences
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
              </div>
              
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Password Policy</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Minimum password length</span>
                      <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                        <option>8 characters</option>
                        <option>10 characters</option>
                        <option>12 characters</option>
                      </select>
                    </div>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Require uppercase letters</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Require numbers</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Require special characters</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Session Settings</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Session timeout</span>
                      <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                        <option>30 minutes</option>
                        <option>1 hour</option>
                        <option>4 hours</option>
                        <option>8 hours</option>
                        <option>1 day</option>
                      </select>
                    </div>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Remember me on this device</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Require 2FA for all users</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Data Access</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Allow API access</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Enable audit logging</span>
                    </label>
                  </div>
                </div>
                
                <button
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  Save Security Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
