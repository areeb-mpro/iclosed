import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeads, useLeadStats, useQualifiedLeads, useAppointments } from '../hooks/useLeads';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  Calendar,
  ArrowUp,
  ArrowDown,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { LEAD_STATUS_COLORS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import RecentActivity from '../components/RecentActivity';

// Chart components
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

const dashboardStats = [
  { 
    name: 'Total Leads', 
    value: 0, 
    icon: Users, 
    color: 'blue',
    change: '+12%',
    changeType: 'positive'
  },
  { 
    name: 'Qualified', 
    value: 0, 
    icon: CheckCircle, 
    color: 'green',
    change: '+8%',
    changeType: 'positive'
  },
  { 
    name: 'Disqualified', 
    value: 0, 
    icon: XCircle, 
    color: 'red',
    change: '-2%',
    changeType: 'negative'
  },
  { 
    name: 'Booked', 
    value: 0, 
    icon: Calendar, 
    color: 'purple',
    change: '+15%',
    changeType: 'positive'
  },
];

const statusDistributionData = [
  { name: 'New', value: 0, color: '#3b82f6' },
  { name: 'Qualified', value: 0, color: '#10b981' },
  { name: 'Disqualified', value: 0, color: '#ef4444' },
  { name: 'Booked', value: 0, color: '#8b5cf6' },
  { name: 'Closed Won', value: 0, color: '#06b6d4' },
  { name: 'Closed Lost', value: 0, color: '#f97316' },
];

const weeklyLeadsData = [
  { name: 'Mon', leads: 0 },
  { name: 'Tue', leads: 0 },
  { name: 'Wed', leads: 0 },
  { name: 'Thu', leads: 0 },
  { name: 'Fri', leads: 0 },
  { name: 'Sat', leads: 0 },
  { name: 'Sun', leads: 0 },
];

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#f59e0b'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: leadsData, isLoading: leadsLoading } = useLeads({ limit: 5 });
  const { data: statsData, isLoading: statsLoading } = useLeadStats();
  const { data: qualifiedData, isLoading: qualifiedLoading } = useQualifiedLeads({ limit: 5 });
  const { data: appointmentsData, isLoading: appointmentsLoading } = useAppointments({ limit: 5 });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRange, setSelectedRange] = useState<'week' | 'month' | 'year'>('week');

  // Calculate dashboard stats
  const stats = {
    total: statsData?.total || 0,
    qualified: statsData?.byStatus?.QUALIFIED || 0,
    disqualified: statsData?.byStatus?.DISQUALIFIED || 0,
    booked: statsData?.byStatus?.BOOKED || 0,
    closedWon: statsData?.byStatus?.CLOSED_WON || 0,
    closedLost: statsData?.byStatus?.CLOSED_LOST || 0,
  };

  // Calculate conversion rates
  const qualificationRate = stats.total > 0 
    ? Math.round((stats.qualified / stats.total) * 100) 
    : 0;
  
  const bookingRate = stats.qualified > 0 
    ? Math.round((stats.booked / stats.qualified) * 100) 
    : 0;
  
  const closingRate = stats.booked > 0 
    ? Math.round(((stats.closedWon || 0) / stats.booked) * 100) 
    : 0;

  // Status distribution data for chart
  const statusData = [
    { name: 'New', value: statsData?.byStatus?.NEW || 0 },
    { name: 'Qualified', value: statsData?.byStatus?.QUALIFIED || 0 },
    { name: 'Disqualified', value: statsData?.byStatus?.DISQUALIFIED || 0 },
    { name: 'Booked', value: statsData?.byStatus?.BOOKED || 0 },
    { name: 'Closed Won', value: statsData?.byStatus?.CLOSED_WON || 0 },
    { name: 'Closed Lost', value: statsData?.byStatus?.CLOSED_LOST || 0 },
  ].filter(item => item.value > 0);

  // Recent leads
  const recentLeads = leadsData?.data?.slice(0, 5) || [];

  // Recent appointments
  const recentAppointments = appointmentsData?.data?.slice(0, 5) || [];

  const isLoading = leadsLoading || statsLoading || qualifiedLoading || appointmentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Welcome back, {user?.firstName || 'User'}! 👋
            </h2>
            <p className="mt-1 text-primary-100">
              Here's what's happening with your leads today.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex -space-x-2">
              {recentLeads.slice(0, 3).map((lead, index) => (
                <div
                  key={lead.id}
                  className="h-10 w-10 rounded-full bg-white/20 border-2 border-primary-600 flex items-center justify-center text-sm font-medium"
                  style={{ zIndex: 3 - index }}
                >
                  {lead.firstName?.charAt(0) || lead.email?.charAt(0)}
                </div>
              ))}
              {recentLeads.length > 3 && (
                <div className="h-10 w-10 rounded-full bg-white/20 border-2 border-primary-600 flex items-center justify-center text-sm font-medium">
                  +{recentLeads.length - 3}
                </div>
              )}
            </div>
            <Link
              to="/leads/new"
              className="btn btn-secondary bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Leads"
          value={stats.total}
          icon={Users}
          color="blue"
          change={stats.total > 0 ? `+${stats.total}` : '0'}
          changeType="positive"
          subtitle="All time"
        />
        <StatCard
          title="Qualified"
          value={stats.qualified}
          icon={CheckCircle}
          color="green"
          change={`${qualificationRate}% rate`}
          changeType="positive"
          subtitle="Conversion rate"
        />
        <StatCard
          title="Booked"
          value={stats.booked}
          icon={Calendar}
          color="purple"
          change={`${bookingRate}% rate`}
          changeType="positive"
          subtitle="Booking rate"
        />
        <StatCard
          title="Closed Won"
          value={stats.closedWon}
          icon={TrendingUp}
          color="cyan"
          change={`${closingRate}% rate`}
          changeType="positive"
          subtitle="Closing rate"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Lead Status Distribution</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedRange('week')}
                className={`px-3 py-1 text-sm rounded-lg ${selectedRange === 'week' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Week
              </button>
              <button
                onClick={() => setSelectedRange('month')}
                className={`px-3 py-1 text-sm rounded-lg ${selectedRange === 'month' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Month
              </button>
              <button
                onClick={() => setSelectedRange('year')}
                className={`px-3 py-1 text-sm rounded-lg ${selectedRange === 'year' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Year
              </button>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-2">
            {statusData.map((item, index) => (
              <div key={item.name} className="flex items-center space-x-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly leads trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Leads Trend</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">This week</span>
              <ArrowUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">+24%</span>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyLeadsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="leads" position="top" offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity
          title="Recent Leads"
          items={recentLeads}
          type="lead"
          viewAllLink="/leads"
        />
        <RecentActivity
          title="Recent Appointments"
          items={recentAppointments}
          type="appointment"
          viewAllLink="/appointments"
        />
      </div>
    </div>
  );
}

// StatCard component
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  change,
  changeType,
  subtitle
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  change: string;
  changeType: 'positive' | 'negative';
  subtitle: string;
}) {
  const colorClasses = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', dot: 'bg-blue-500' },
    green: { bg: 'bg-green-500', text: 'text-green-600', dot: 'bg-green-500' },
    red: { bg: 'bg-red-500', text: 'text-red-600', dot: 'bg-red-500' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600', dot: 'bg-purple-500' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600', dot: 'bg-cyan-500' },
  };

  const classes = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{subtitle}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          <div className="flex items-center mt-2">
            {changeType === 'positive' ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'} ml-1`}>
              {change}
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-xl ${classes.bg}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
