export const API_CONFIG = {
  BASE_URL: 'https://tuffguardsecurityms.com/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export const INCIDENT_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  CLOSED: 'closed',
  PENDING: 'pending',
};

export const INCIDENT_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const USER_ROLES = {
  ADMIN: 'admin',
  SECURITY_OFFICER: 'security_officer',
  SUPERVISOR: 'supervisor',
  VIEWER: 'viewer',
};

export const COLORS = {
  PRIMARY: '#2196F3',
  SECONDARY: '#4CAF50',
  DANGER: '#f44336',
  WARNING: '#FF9800',
  INFO: '#2196F3',
  SUCCESS: '#4CAF50',
  ERROR: '#f44336',
  LIGHT_GRAY: '#f5f5f5',
  DARK_GRAY: '#333',
  MEDIUM_GRAY: '#666',
  LIGHT_BORDER: '#ddd',
  WHITE: '#fff',
  BLACK: '#000',
};

export const STATUS_COLORS = {
  [INCIDENT_STATUS.OPEN]: '#FF9800',
  [INCIDENT_STATUS.IN_PROGRESS]: '#2196F3',
  [INCIDENT_STATUS.CLOSED]: '#4CAF50',
  [INCIDENT_STATUS.PENDING]: '#757575',
};

export const PRIORITY_COLORS = {
  [INCIDENT_PRIORITY.LOW]: '#4CAF50',
  [INCIDENT_PRIORITY.MEDIUM]: '#FF9800',
  [INCIDENT_PRIORITY.HIGH]: '#f44336',
  [INCIDENT_PRIORITY.CRITICAL]: '#8B0000',
};

export const FONT_SIZES = {
  EXTRA_SMALL: 12,
  SMALL: 14,
  MEDIUM: 16,
  LARGE: 18,
  EXTRA_LARGE: 24,
  HEADING: 32,
};

export const SPACING = {
  EXTRA_SMALL: 4,
  SMALL: 8,
  MEDIUM: 12,
  LARGE: 16,
  EXTRA_LARGE: 20,
  HUGE: 24,
};

export const BORDER_RADIUS = {
  SMALL: 4,
  MEDIUM: 8,
  LARGE: 10,
  EXTRA_LARGE: 15,
  ROUND: 30,
};

export const SHADOW = {
  LIGHT: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  MEDIUM: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  HEAVY: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
};

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  INCIDENTS: 'incidents',
  USER_PREFERENCES: 'user_preferences',
  LAST_SYNC: 'last_sync',
  OFFLINE_INCIDENTS: 'offline_incidents',
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Unauthorized. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Validation error. Please check your input.',
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.',
};
