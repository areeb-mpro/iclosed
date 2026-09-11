// Date formatting helpers
export const formatDate = (dateString: string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return 'N/A';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  try {
    return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const formatRelativeDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1,
    };
    
    for (const [unit, seconds] of Object.entries(intervals)) {
      const interval = Math.floor(diffInSeconds / seconds);
      if (interval >= 1) {
        return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
      }
    }
    
    return 'Just now';
  } catch {
    return dateString;
  }
};

// String formatting helpers
export const formatName = (firstName: string | null | undefined, lastName: string | null | undefined): string => {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
};

export const formatInitials = (firstName: string | null | undefined, lastName: string | null | undefined): string => {
  const firstInitial = firstName?.charAt(0).toUpperCase() || '';
  const lastInitial = lastName?.charAt(0).toUpperCase() || '';
  return (firstInitial + lastInitial).substring(0, 2);
};

export const formatPhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
  }
  
  // Return original if we can't format it
  return phone;
};

export const formatEmail = (email: string | null | undefined): string => {
  if (!email) return 'N/A';
  return email.toLowerCase();
};

export const formatCurrency = (amount: number | string | null | undefined, currency: string = 'USD'): string => {
  if (amount === null || amount === undefined) return 'N/A';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(numericAmount);
};

// Text formatting helpers
export const truncate = (text: string | null | undefined, length: number = 50): string => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

export const capitalize = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeWords = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.split(' ').map(word => capitalize(word)).join(' ');
};

export const slugify = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Number formatting helpers
export const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) return 'N/A';
  
  return new Intl.NumberFormat('en-US').format(numericValue);
};

export const formatPercentage = (value: number | string | null | undefined, decimals: number = 0): string => {
  if (value === null || value === undefined) return 'N/A';
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) return 'N/A';
  
  return `${(numericValue * 100).toFixed(decimals)}%`;
};

export const formatScore = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'N/A';
  return `${Math.round(score)}%`;
};

// Status and priority helpers
export const getStatusColor = (status: string): { bg: string; text: string; border: string } => {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    NEW: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    QUALIFIED: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    DISQUALIFIED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    CONTACTED: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    BOOKED: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    NO_SHOW: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    CLOSED_WON: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
    CLOSED_LOST: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
  };
  
  return statusColors[status] || statusColors.NEW;
};

// URL helpers
export const getAvatarUrl = (avatar: string | null | undefined, name: string | null | undefined): string => {
  if (avatar) return avatar;
  if (name) {
    // Generate a simple avatar based on initials
    const initials = formatInitials(
      name.split(' ')[0],
      name.split(' ').slice(1).join(' ')
    );
    return `https://api.dicebear.com/7.x/initials/svg?seed=${initials}`;
  }
  return `https://api.dicebear.com/7.x/initials/svg?seed=U`;
};

// Validation helpers
export const isValidEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
};

// Class name helpers (extends tailwind-merge)
export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Pagination helpers
export const getPaginationRange = (currentPage: number, totalPages: number, delta: number = 2): number[] => {
  const range: number[] = [];
  const start = Math.max(1, currentPage - delta);
  const end = Math.min(totalPages, currentPage + delta);
  
  for (let i = start; i <= end; i++) {
    range.push(i);
  }
  
  return range;
};

// Query parameter helpers
export const parseQueryParams = (search: string): Record<string, string> => {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
};

export const stringifyQueryParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  return searchParams.toString();
};

// Debounce helper
export const debounce = <F extends (...args: any[]) => any>(func: F, wait: number): ((...args: Parameters<F>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<F>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

// Storage helpers
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// Session storage helpers
export const getFromSessionStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setToSessionStorage = <T>(key: string, value: T): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to sessionStorage:', error);
  }
};

// Error handling
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.data?.message) return error.response.data.message;
  return 'An unexpected error occurred';
};
