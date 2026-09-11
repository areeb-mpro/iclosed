// User and Authentication Types
export type UserRole = 'ADMIN' | 'SALES' | 'TEAM_MEMBER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: UserStatus;
  avatar: string | null;
  phone: string | null;
  timezone: string;
  notificationPreferences: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  googleCalendarConnected: boolean;
  outlookCalendarConnected: boolean;
  organizationId: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo: string | null;
  settings: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

// Lead Types
export type LeadStatus = 
  | 'NEW'
  | 'QUALIFIED'
  | 'DISQUALIFIED'
  | 'CONTACTED'
  | 'BOOKED'
  | 'NO_SHOW'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export type LeadSource = 'BOOKING_FORM' | 'IMPORTED' | 'API' | 'MANUAL';

export interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  customFields: Record<string, any> | null;
  status: LeadStatus;
  qualificationScore: number | null;
  disqualificationReason: string | null;
  source: LeadSource;
  formId: string | null;
  ownerId: string | null;
  owner: User | null;
  assigneeId: string | null;
  assignee: User | null;
  appointmentId: string | null;
  appointment: Appointment | null;
  organizationId: string;
  organization: Organization;
  createdAt: string;
  updatedAt: string;
  qualifiedAt: string | null;
  bookedAt: string | null;
  closedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  notes: LeadNote[];
  activities: LeadActivity[];
  messages: Message[];
}

export interface LeadNote {
  id: string;
  content: string;
  createdById: string;
  createdBy: User;
  leadId: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadActivityType =
  | 'CREATED'
  | 'QUALIFIED'
  | 'DISQUALIFIED'
  | 'ASSIGNED'
  | 'CONTACTED'
  | 'BOOKED'
  | 'NO_SHOW'
  | 'CLOSED'
  | 'NOTE_ADDED'
  | 'EMAIL_SENT'
  | 'SMS_SENT'
  | 'FOLLOW_UP_SENT';

export interface LeadActivity {
  id: string;
  type: LeadActivityType;
  description: string | null;
  metadata: Record<string, any> | null;
  createdById: string | null;
  createdBy: User | null;
  leadId: string;
  createdAt: string;
}

// Appointment Types
export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export type MeetingTypeDuration =
  | 'MINUTES_15'
  | 'MINUTES_30'
  | 'MINUTES_45'
  | 'MINUTES_60'
  | 'MINUTES_90'
  | 'MINUTES_120'
  | 'CUSTOM';

export interface MeetingType {
  id: string;
  name: string;
  description: string | null;
  duration: MeetingTypeDuration;
  customDuration: number | null;
  calendarId: string | null;
  availability: Record<string, any> | null;
  bufferTime: number;
  organizationId: string;
  organization: Organization;
  ownerId: string;
  owner: User;
  assignedToId: string | null;
  assignedTo: User | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  appointments: Appointment[];
}

export interface Appointment {
  id: string;
  title: string | null;
  description: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  status: AppointmentStatus;
  meetingTypeId: string;
  meetingType: MeetingType;
  leadId: string;
  lead: Lead;
  calendarEventId: string | null;
  calendarType: string | null;
  location: string | null;
  isVirtual: boolean;
  meetingLink: string | null;
  organizationId: string;
  organization: Organization;
  assigneeId: string | null;
  assignee: User | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  notes: string | null;
  reminders: AppointmentReminder[];
}

export interface AppointmentReminder {
  id: string;
  type: string; // 'email' or 'sms'
  sentAt: string | null;
  scheduledAt: string;
  status: string; // 'pending', 'sent', 'failed'
  appointmentId: string;
  createdAt: string;
}

// Form Types
export interface FormField {
  id: string;
  type: string;
  name: string;
  label: string;
  required: boolean;
  placeholder: string | null;
  options: string[] | null;
  defaultValue: any | null;
}

export interface BookingForm {
  id: string;
  name: string;
  description: string | null;
  fields: FormField[];
  settings: Record<string, any> | null;
  organizationId: string;
  organization: Organization;
  isActive: boolean;
  visitCount: number;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
  leads: Lead[];
}

// Qualification Types
export interface QualificationRule {
  id: string;
  name: string;
  description: string | null;
  field: string;
  operator: string;
  value: any;
  score: number;
  isRequired: boolean;
  organizationId: string;
  organization: Organization;
  createdAt: string;
  updatedAt: string;
}

// Routing Types
export type RoutingRuleType = 'ROUND_ROBIN' | 'RULE_BASED' | 'MANUAL';

export interface RoutingRule {
  id: string;
  name: string;
  type: RoutingRuleType;
  conditions: Record<string, any> | null;
  targetUserId: string | null;
  teamIds: string[];
  currentIndex: number;
  organizationId: string;
  organization: Organization;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// Message Types
export type MessageType = 'EMAIL' | 'SMS';
export type MessageStatus = 'PENDING' | 'SENT' | 'FAILED' | 'BOUNCED';
export type MessageDirection = 'INBOUND' | 'OUTBOUND';

export interface Message {
  id: string;
  type: MessageType;
  direction: MessageDirection;
  subject: string | null;
  body: string;
  to: string[];
  from: string | null;
  status: MessageStatus;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  leadId: string | null;
  lead: Lead | null;
  appointmentId: string | null;
  appointment: Appointment | null;
  senderId: string | null;
  sender: User | null;
  organizationId: string;
  organization: Organization;
  templateId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

// Email Template Types
export type TemplateType = 
  | 'BOOKING_CONFIRMATION'
  | 'APPOINTMENT_REMINDER'
  | 'FOLLOW_UP'
  | 'CUSTOM';

export interface EmailTemplate {
  id: string;
  name: string;
  type: TemplateType;
  subject: string;
  body: string;
  plainText: string | null;
  variables: string[];
  organizationId: string;
  organization: Organization;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Automation Types
export type AutomationTrigger =
  | 'LEAD_CREATED'
  | 'LEAD_QUALIFIED'
  | 'LEAD_DISQUALIFIED'
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_COMPLETED'
  | 'NO_SHOW'
  | 'FOLLOW_UP_DUE';

export type AutomationAction =
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'ASSIGN_LEAD'
  | 'UPDATE_LEAD_STATUS'
  | 'CREATE_TASK'
  | 'ADD_NOTE';

export interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger: AutomationTrigger;
  triggerConfig: Record<string, any> | null;
  conditions: Record<string, any> | null;
  actions: any[];
  delayMinutes: number | null;
  organizationId: string;
  organization: Organization;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Analytics Types
export interface AnalyticsEvent {
  id: string;
  eventType: string;
  metadata: Record<string, any> | null;
  userId: string | null;
  leadId: string | null;
  appointmentId: string | null;
  organizationId: string;
  createdAt: string;
}

// Integration Types
export interface Integration {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  isConnected: boolean;
  isActive: boolean;
  lastSyncAt: string | null;
  organizationId: string;
  organization: Organization;
  createdAt: string;
  updatedAt: string;
}

// Webhook Types
export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  organizationId: string;
  organization: Organization;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Filter and Sort Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeadFilterParams extends PaginationParams {
  status?: LeadStatus;
  source?: LeadSource;
  ownerId?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AppointmentFilterParams extends PaginationParams {
  status?: AppointmentStatus;
  meetingTypeId?: string;
  leadId?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
}

// Stats Types
export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<string, number>;
  byOwner: Record<string, number>;
  recentLeads: Lead[];
}

export interface AppointmentStats {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  byMeetingType: Record<string, number>;
  byAssignee: Record<string, number>;
  recentAppointments: Appointment[];
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  firstName: string;
  lastName: string;
  organizationName: string;
  timezone?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}
