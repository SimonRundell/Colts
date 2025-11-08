/**
 * Authentication utility functions for handling JWT tokens and authenticated requests
 */
// Load API base URL from config
let API_BASE_URL = 'http://localhost:3000'; // Default fallback

// Fetch config on module load
fetch('/.config.json')
    .then(response => response.json())
    .then(config => {
        API_BASE_URL = config.api || API_BASE_URL;
    })
    .catch(error => {
        console.warn('Could not load config.json, using default API URL:', error);
    });

/**
 * Get the API base URL from config
 * @returns {string} The API base URL
 */
export const getApiUrl = () => API_BASE_URL;

/**
 * Get the stored authentication token
 * @returns {string|null} The JWT token or null if not found
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Get the stored user information
 * @returns {Object|null} The user object or null if not found
 */
export const getUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has a valid token
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};

/**
 * Clear authentication data (logout)
 */
export const clearAuth = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/api/crud/read')
 * @param {string} method - HTTP method (default: 'POST')
 * @param {Object} body - Request body
 * @returns {Promise<Object>} The API response
 */
export const makeAuthenticatedRequest = async (endpoint, method = 'POST', body = null) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();

    // Handle token expiration
    if (result.status_code === 403) {
      clearAuth();
      // Redirect to login page
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    return result;
  } catch (error) {
    console.error('Authenticated request error:', error);
    throw error;
  }
};

/**
 * CRUD operation wrapper for authenticated requests
 * @param {string} operation - CRUD operation: 'read', 'create', 'update', 'delete'
 * @param {Object} data - Request data (table, conditions, data, etc.)
 * @returns {Promise<Object>} The API response
 */
export const crudRequest = async (operation, data) => {
  const validOperations = ['read', 'create', 'update', 'delete'];
  
  if (!validOperations.includes(operation)) {
    throw new Error(`Invalid operation: ${operation}. Must be one of: ${validOperations.join(', ')}`);
  }

  return makeAuthenticatedRequest(`/api/crud/${operation}`, 'POST', data);
};

/**
 * Make a public API request (no authentication required)
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method (default: 'POST')
 * @param {Object} body - Request body
 * @returns {Promise<Object>} The API response
 */
export const makePublicRequest = async (endpoint, method = 'POST', body = null) => {
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Public request error:', error);
    throw error;
  }
};

/**
 * Public CRUD read operation (no authentication required)
 * Uses the /api/public/read endpoint for public data access
 * Allowed tables: tblfixtures, tblteams, tblleagues, tblresults, tblstandings
 * @param {Object} data - Request data (table, conditions, orderBy, limit, etc.)
 * @returns {Promise<Object>} The API response
 */
export const publicRead = async (data) => {
  return makePublicRequest('/api/public/read', 'POST', data);
};

/**
 * Check user authority level
 * @returns {number} User authority level (0=Spectator, 1=Local Admin, 2=Full Admin)
 */
export const getUserAuthority = () => {
  const user = getUser();
  return user?.authority ?? 0;
};

/**
 * Check if user has minimum required authority
 * @param {number} requiredLevel - Minimum authority level required
 * @returns {boolean} True if user has sufficient authority
 */
export const hasAuthority = (requiredLevel) => {
  return getUserAuthority() >= requiredLevel;
};

/**
 * Get user authority over (team management)
 * @returns {number} The authorityOver value
 */
export const getUserAuthorityOver = () => {
  const user = getUser();
  return user?.authorityOver ?? 0;
};
