import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, getUser, clearAuth as clearAuthStorage, isAuthenticated } from '../utils/authHelpers';

/**
 * Authentication Context
 * Provides authentication state and methods throughout the application
 */
const AuthContext = createContext(null);

/**
 * Custom hook to use authentication context
 * @returns {Object} Authentication context with user, token, and auth methods
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 * Wrap your app with this to provide auth context to all components
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getUser());
  const [token, setToken] = useState(getAuthToken());
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  // Update auth state when storage changes
  useEffect(() => {
    const updateAuthState = () => {
      const currentToken = getAuthToken();
      const currentUser = getUser();
      const isAuth = isAuthenticated();

      setToken(currentToken);
      setUser(currentUser);
      setAuthenticated(isAuth);
    };

    // Listen for storage changes (login/logout from other tabs)
    window.addEventListener('storage', updateAuthState);

    // Check periodically for changes
    const interval = setInterval(updateAuthState, 2000);

    return () => {
      window.removeEventListener('storage', updateAuthState);
      clearInterval(interval);
    };
  }, []);

  /**
   * Login function - updates local state after successful login
   * @param {string} newToken - JWT token
   * @param {Object} userData - User information object
   */
  const login = (newToken, userData) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    setAuthenticated(true);
  };

  /**
   * Logout function - clears auth state and storage
   */
  const logout = () => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
    setAuthenticated(false);
  };

  /**
   * Check if user has minimum required authority level
   * @param {number} requiredLevel - Minimum authority level (0, 1, or 2)
   * @returns {boolean}
   */
  const hasAuthority = (requiredLevel) => {
    return (user?.authority ?? 0) >= requiredLevel;
  };

  /**
   * Get user's authority level
   * @returns {number} Authority level (0, 1, or 2)
   */
  const getAuthority = () => {
    return user?.authority ?? 0;
  };

  /**
   * Get user's authorityOver value (for team-specific permissions)
   * @returns {number} Authority over value
   */
  const getAuthorityOver = () => {
    return user?.authorityOver ?? 0;
  };

  const value = {
    user,
    token,
    authenticated,
    login,
    logout,
    hasAuthority,
    getAuthority,
    getAuthorityOver,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
