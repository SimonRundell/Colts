/**
 * Custom React Hooks for Authentication
 * These hooks make it easier to use authentication in your components
 */

import { useState, useEffect } from 'react';
import { 
  isAuthenticated, 
  getUser, 
  getAuthToken, 
  hasAuthority as checkAuthority,
  getUserAuthority,
  getUserAuthorityOver 
} from '../utils/authHelpers';

/**
 * Hook to get current authentication state
 * Updates automatically when auth state changes
 * 
 * @returns {Object} { authenticated, user, token }
 */
export const useAuthState = () => {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [user, setUser] = useState(getUser());
  const [token, setToken] = useState(getAuthToken());

  useEffect(() => {
    const updateAuthState = () => {
      setAuthenticated(isAuthenticated());
      setUser(getUser());
      setToken(getAuthToken());
    };

    // Listen for storage changes
    window.addEventListener('storage', updateAuthState);
    
    // Poll for changes every 2 seconds
    const interval = setInterval(updateAuthState, 2000);

    return () => {
      window.removeEventListener('storage', updateAuthState);
      clearInterval(interval);
    };
  }, []);

  return { authenticated, user, token };
};

/**
 * Hook to get current user information
 * Returns null if not authenticated
 * 
 * @returns {Object|null} User object or null
 */
export const useUser = () => {
  const { user } = useAuthState();
  return user;
};

/**
 * Hook to check if user is authenticated
 * 
 * @returns {boolean} True if user is authenticated
 */
export const useIsAuthenticated = () => {
  const { authenticated } = useAuthState();
  return authenticated;
};

/**
 * Hook to check if user has specific authority level
 * 
 * @param {number} requiredLevel - Minimum authority level (0, 1, or 2)
 * @returns {boolean} True if user has sufficient authority
 */
export const useHasAuthority = (requiredLevel) => {
  useAuthState(); // Keep auth state in sync
  return checkAuthority(requiredLevel);
};

/**
 * Hook to get user's authority information
 * 
 * @returns {Object} { authority, authorityOver, isSpectator, isLocalAdmin, isFullAdmin }
 */
export const useAuthority = () => {
  useAuthState(); // Keep auth state in sync
  const authority = getUserAuthority();
  const authorityOver = getUserAuthorityOver();

  return {
    authority,
    authorityOver,
    isSpectator: authority === 0,
    isLocalAdmin: authority === 1,
    isFullAdmin: authority === 2,
    canEdit: authority >= 1,
    canDelete: authority >= 2,
  };
};

/**
 * Hook for managing form state with validation
 * Useful for login forms and other authenticated forms
 * 
 * @param {Object} initialState - Initial form state
 * @param {Function} validate - Validation function
 * @returns {Object} Form state and handlers
 */
export const useAuthForm = (initialState = {}, validate = null) => {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    if (validate) {
      const fieldErrors = validate(values);
      if (fieldErrors[name]) {
        setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
      }
    }
  };

  const handleSubmit = (onSubmit) => async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    // Validate all fields
    if (validate) {
      const fieldErrors = validate(values);
      setErrors(fieldErrors);
      
      if (Object.keys(fieldErrors).length > 0) {
        return;
      }
    }
    
    // Submit if no errors
    await onSubmit(values);
  };

  const resetForm = () => {
    setValues(initialState);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    setErrors,
  };
};
