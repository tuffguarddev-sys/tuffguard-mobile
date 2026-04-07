// src/components/RoleBasedView.js
import React from 'react';
import { hasPermission, hasRoleLevel } from '../utils/roleManager';

/**
 * Component that shows/hides content based on user role
 * Usage:
 * <RoleBasedView permission="CREATE_SITES" userRole={user.role}>
 * <Button>Create Site</Button>
 * </RoleBasedView>
 */
const RoleBasedView = ({ 
 children, 
 userRole, 
 permission, 
 requiredRole, 
 fallback = null 
}) => {
 let hasAccess = false;

 if (permission) {
 hasAccess = hasPermission(userRole, permission);
 } else if (requiredRole) {
 hasAccess = hasRoleLevel(userRole, requiredRole);
 } else {
 hasAccess = true; // No restrictions
 }

 if (!hasAccess) {
 return fallback;
 }

 return <>{children}</>;
};

export default RoleBasedView;

