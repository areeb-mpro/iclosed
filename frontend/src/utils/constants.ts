// Lead status colors
export const LEAD_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  NEW: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  QUALIFIED: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  DISQUALIFIED: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  CONTACTED: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  BOOKED: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  NO_SHOW: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
  CLOSED_WON: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  CLOSED_LOST: { bg: 'bg-rose-100', text: 'text-rose-800', dot: 'bg-rose-500' },
};

// Appointment status colors
export const APPOINTMENT_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  NO_SHOW: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
  RESCHEDULED: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
};

// Lead source colors
export const LEAD_SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  BOOKING_FORM: { bg: 'bg-blue-100', text: 'text-blue-800' },
  IMPORTED: { bg: 'bg-gray-100', text: 'text-gray-800' },
  API: { bg: 'bg-purple-100', text: 'text-purple-800' },
  MANUAL: { bg: 'bg-green-100', text: 'text-green-800' },
};

// Meeting type durations
export const MEETING_DURATIONS = [
  { value: 'MINUTES_15', label: '15 minutes' },
  { value: 'MINUTES_30', label: '30 minutes' },
  { value: 'MINUTES_45', label: '45 minutes' },
  { value: 'MINUTES_60', label: '1 hour' },
  { value: 'MINUTES_90', label: '1.5 hours' },
  { value: 'MINUTES_120', label: '2 hours' },
  { value: 'CUSTOM', label: 'Custom' },
];

// Form field types
export const FORM_FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'date', label: 'Date Picker' },
  { value: 'datetime', label: 'Date & Time' },
];

// Common form fields
export const COMMON_FORM_FIELDS = [
  { name: 'firstName', label: 'First Name', type: 'text', required: true },
  { name: 'lastName', label: 'Last Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'phone', required: false },
  { name: 'company', label: 'Company', type: 'text', required: false },
  { name: 'jobTitle', label: 'Job Title', type: 'text', required: false },
  { 
    name: 'companySize', 
    label: 'Company Size', 
    type: 'select', 
    required: false,
    options: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
  },
  { 
    name: 'budget', 
    label: 'Budget', 
    type: 'select', 
    required: false,
    options: ['< $1K', '$1K - $5K', '$5K - $10K', '$10K - $25K', '$25K - $50K', '$50K+']
  },
  { 
    name: 'country', 
    label: 'Country', 
    type: 'select', 
    required: false,
    options: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Other']
  },
  { 
    name: 'howDidYouHearAboutUs', 
    label: 'How did you hear about us?', 
    type: 'select', 
    required: false,
    options: ['Search Engine', 'Social Media', 'Referral', 'Advertisement', 'Other']
  },
];

// Qualification operators
export const QUALIFICATION_OPERATORS = [
  { value: '==', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: '>=', label: 'Greater Than or Equal' },
  { value: '<=', label: 'Less Than or Equal' },
  { value: 'in', label: 'In List' },
  { value: 'notIn', label: 'Not In List' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
];

// Routing rule types
export const ROUTING_RULE_TYPES = [
  { value: 'ROUND_ROBIN', label: 'Round Robin' },
  { value: 'RULE_BASED', label: 'Rule Based' },
  { value: 'MANUAL', label: 'Manual Assignment' },
];

// Follow-up types
export const FOLLOW_UP_TYPES = [
  { value: 'BOOKING_CONFIRMATION', label: 'Booking Confirmation' },
  { value: 'APPOINTMENT_REMINDER', label: 'Appointment Reminder' },
  { value: 'INCOMPLETE_BOOKING', label: 'Incomplete Booking' },
  { value: 'POST_APPOINTMENT', label: 'Post Appointment' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'FOLLOW_UP_1', label: 'Follow Up 1' },
  { value: 'FOLLOW_UP_2', label: 'Follow Up 2' },
  { value: 'FOLLOW_UP_3', label: 'Follow Up 3' },
];

// Timezones
export const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

// Date formats
export const DATE_FORMATS = {
  short: 'MMM D, YYYY',
  long: 'MMMM D, YYYY',
  time: 'h:mm A',
  datetime: 'MMM D, YYYY h:mm A',
  iso: 'YYYY-MM-DD',
};

// Default pagination
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc' as const,
};

// Chart colors
export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
];
