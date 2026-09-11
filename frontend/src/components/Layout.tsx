import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  BarChart3, 
  Settings, 
  User,
  Menu,
  X,
  LogOut,
  TrendingUp,
  Clock,
  Mail
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    badge: false
  },
  { 
    name: 'Leads', 
    href: '/leads', 
    icon: Users,
    badge: true,
    badgeColor: 'bg-blue-500'
  },
  { 
    name: 'Appointments', 
    href: '/appointments', 
    icon: Calendar,
    badge: false
  },
  { 
    name: 'Calendar', 
    href: '/calendar', 
    icon: Clock,
    badge: false
  },
  { 
    name: 'Forms', 
    href: '/forms', 
    icon: FileText,
    badge: false
  },
  { 
    name: 'Analytics', 
    href: '/analytics', 
    icon: BarChart3,
    badge: false
  },
  { 
    name: 'Team', 
    href: '/team', 
    icon: Users,
    badge: false
  },
];

const bottomNavigation = [
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings,
  },
  { 
    name: 'Profile', 
    href: '/profile', 
    icon: User,
  },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function SidebarItem({ item }: { item: typeof navigation[0] }) {
  const location = useLocation();
  const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
  
  return (
    <NavLink
      to={item.href}
      className={classNames(
        isActive 
          ? 'bg-primary-50 text-primary-700' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200'
      )}
    >
      <item.icon
        className={classNames(
          isActive 
            ? 'text-primary-600' 
            : 'text-gray-400 group-hover:text-gray-600',
          'mr-3 h-5 w-5 flex-shrink-0'
        )}
        aria-hidden="true"
      />
      <span className="truncate">{item.name}</span>
      {item.badge && (
        <span className={classNames(
          item.badgeColor || 'bg-blue-500',
          'ml-auto inline-block h-2 w-2 rounded-full'
        )} />
      )}
    </NavLink>
  );
}

function Sidebar() {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile sidebar button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-white shadow-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={classNames(
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'fixed inset-y-0 left-0 z-50 transform translate-x-0' : 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto',
          'bg-white border-r border-gray-200 h-screen overflow-y-auto custom-scrollbar'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">LeadFlow</span>
              </div>
            )}
            {isCollapsed && (
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <SidebarItem key={item.name} item={item} />
            ))}
          </nav>

          {/* Bottom navigation */}
          <div className="border-t border-gray-200 pt-4 pb-4">
            <div className="px-2 space-y-1">
              {bottomNavigation.map((item) => (
                <SidebarItem key={item.name} item={{ ...item, badge: false }} />
              ))}
            </div>
            
            {/* User info */}
            {!isCollapsed && (
              <div className="px-4 py-3 mt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-medium">
                      {user?.firstName?.charAt(0) || user?.email?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="mt-2 w-full flex items-center justify-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>
            )}
            
            {isCollapsed && (
              <div className="px-4 py-3 mt-4 border-t border-gray-200">
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function TopBar() {
  const { user } = useAuth();
  const location = useLocation();
  
  // Get page title from path
  const getPageTitle = () => {
    const path = location.pathname.split('/').filter(Boolean);
    if (path.length === 0) return 'Dashboard';
    
    const title = path[path.length - 1];
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Breadcrumb */}
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
          </div>
          
          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Quick actions */}
            <div className="hidden md:flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Mail className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative">
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                <Clock className="h-5 w-5" />
              </button>
            </div>
            
            {/* User avatar */}
            <div className="hidden lg:flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-medium text-sm">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role.toLowerCase()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MainContent() {
  const { isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <main className="flex-1 pb-8">
      <div className="px-4 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </main>
  );
}

export default function Layout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:pl-64">
        <TopBar />
        <MainContent />
      </div>
      <Sidebar />
    </div>
  );
}
