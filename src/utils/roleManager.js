// src/utils/roleManager.js

// Define role hierarchy (higher number = more permissions)
export const ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  BOSS: 'boss',
  DEV: 'dev',
};

export const ROLE_LEVELS = {
  employee: 1,
  manager: 2,
  boss: 3,
  dev: 4,
};

// Map app roles to backend roles
export const BACKEND_ROLE_MAP = {
  employee: 'guard',
  manager: 'admin',
  boss: 'admin',
  dev: 'admin',
};

// Define permissions for each role
export const PERMISSIONS = {
  // Site permissions
  VIEW_SITES: ['employee', 'manager', 'boss', 'dev'],
  CREATE_SITES: ['manager', 'boss', 'dev'],
  EDIT_SITES: ['manager', 'boss', 'dev'],
  DELETE_SITES: ['boss', 'dev'],
  
  // Incident permissions
  VIEW_OWN_INCIDENTS: ['employee', 'manager', 'boss', 'dev'],
  VIEW_ALL_INCIDENTS: ['manager', 'boss', 'dev'],
  CREATE_INCIDENTS: ['employee', 'manager', 'boss', 'dev'],
  EDIT_INCIDENTS: ['manager', 'boss', 'dev'],
  DELETE_INCIDENTS: ['boss', 'dev'],
  
  // Shift permissions
  CLOCK_IN_OUT: ['employee', 'manager', 'boss', 'dev'],
  VIEW_OWN_SHIFTS: ['employee', 'manager', 'boss', 'dev'],
  VIEW_ALL_SHIFTS: ['manager', 'boss', 'dev'],
  EDIT_SHIFTS: ['boss', 'dev'],
  
  // Schedule permissions
  VIEW_OWN_SCHEDULE: ['employee', 'manager', 'boss', 'dev'],
  VIEW_ALL_SCHEDULES: ['manager', 'boss', 'dev'],
  CREATE_SCHEDULES: ['manager', 'boss', 'dev'],
  EDIT_SCHEDULES: ['manager', 'boss', 'dev'],
  DELETE_SCHEDULES: ['boss', 'dev'],
  
  // Message permissions
  SEND_MESSAGES: ['employee', 'manager', 'boss', 'dev'],
  VIEW_MESSAGES: ['employee', 'manager', 'boss', 'dev'],
  DELETE_MESSAGES: ['manager', 'boss', 'dev'],
  
  // User management
  VIEW_USERS: ['manager', 'boss', 'dev'],
  CREATE_USERS: ['boss', 'dev'],
  EDIT_USERS: ['boss', 'dev'],
  DELETE_USERS: ['dev'],
  
  // Reports
  VIEW_OWN_REPORTS: ['employee', 'manager', 'boss', 'dev'],
  VIEW_ALL_REPORTS: ['manager', 'boss', 'dev'],
  EXPORT_REPORTS: ['manager', 'boss', 'dev'],
};

// Check if user has permission
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles ? allowedRoles.includes(userRole.toLowerCase()) : false;
};

// Check if user role is at least the required level
export const hasRoleLevel = (userRole, requiredRole) => {
  const userLevel = ROLE_LEVELS[userRole?.toLowerCase()] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole?.toLowerCase()] || 0;
  return userLevel >= requiredLevel;
};

// Get user's backend role for API calls
export const getBackendRole = (appRole) => {
  return BACKEND_ROLE_MAP[appRole?.toLowerCase()] || 'guard';
};

// Get role display name
export const getRoleDisplayName = (role) => {
  const names = {
    employee: 'Security Officer',
    manager: 'Manager',
    boss: 'Boss',
    dev: 'Developer/Admin',
  };
  return names[role?.toLowerCase()] || 'User';
};

// Get role color for UI
export const getRoleColor = (role) => {
  const colors = {
    employee: '#2196F3',
    manager: '#FF9800',
    boss: '#F44336',
    dev: '#9C27B0',
  };
  return colors[role?.toLowerCase()] || '#757575';
};

