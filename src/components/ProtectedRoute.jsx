import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, hasAuthority } from '../utils/authHelpers';

/**
 * Protected Route component that requires authentication
 * Redirects to login if user is not authenticated
 * 
 * @param {Object} props
 * @param {React.Component} props.children - Component to render if authenticated
 * @param {number} props.requiredAuthority - Minimum authority level required (optional)
 * @returns {React.Component}
 */
function ProtectedRoute({ children, requiredAuthority = null }) {
  if (!isAuthenticated()) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Check authority level if specified
  if (requiredAuthority !== null && !hasAuthority(requiredAuthority)) {
    // Redirect to home page if insufficient authority
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
