/**
 * @file ResetPassword.jsx
 * @description Password reset form page - allows users to set new password using token
 * @module pages/ResetPassword
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getApiUrl } from '../utils/authHelpers';

/**
 * ResetPassword Component
 * 
 * Displays a form for users to reset their password using a verification token.
 * Validates token on mount, enforces password complexity, and sends plain password
 * to backend for hashing and storage.
 * 
 * URL Parameters:
 * @param {string} token - Verification token from email (query param)
 * @param {string} login - User's email/login (query param)
 * 
 * Password Requirements:
 * - Minimum 8 characters
 * - Must contain lowercase (a-z)
 * - Must contain uppercase (A-Z)
 * - Must contain numbers (0-9)
 * - Must contain special chars (@#*$)
 * 
 * @component
 * @returns {React.ReactElement} The password reset form
 * 
 * @example
 * // Route definition
 * <Route path="reset-password" element={<ResetPassword />} />
 * 
 * // URL format
 * /reset-password?token=abc123...&login=user@example.com
 */
function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  const token = searchParams.get('token');
  const login = searchParams.get('login');

  /**
   * Verify the reset token with backend
   * Checks token validity and expiration
   * 
   * @async
   * @callback verifyToken
   * @returns {Promise<void>}
   */
  const verifyToken = useCallback(async () => {
    if (!token || !login) {
      setError('Invalid password reset link. Please request a new one.');
      setVerifying(false);
      return;
    }

    try {
      const apiUrl = await getApiUrl();
      
      // Verify the token - API expects only 'token' parameter
      const response = await fetch(`${apiUrl}/api/verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      });

      const result = await response.json();

      if (result.status_code === 200) {
        setTokenValid(true);
        setUserEmail(login);
      } else {
        setError('This password reset link has expired or is invalid. Please request a new one.');
      }
    } catch (err) {
      console.error('Error verifying token:', err);
      setError('Failed to verify reset link. Please try again.');
    } finally {
      setVerifying(false);
    }
  }, [token, login]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  /**
   * Handle input field changes
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Handle form submission
   * Validates password complexity and submits to backend
   * 
   * @async
   * @param {React.FormEvent} e - Form submit event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validate password
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    // Validate password complexity
    const hasLowerCase = /[a-z]/.test(formData.newPassword);
    const hasUpperCase = /[A-Z]/.test(formData.newPassword);
    const hasNumber = /[0-9]/.test(formData.newPassword);
    const hasSpecial = /[@#*$]/.test(formData.newPassword);
    
    if (!hasLowerCase || !hasUpperCase || !hasNumber || !hasSpecial) {
      setError('Password must contain: a-z, A-Z, 0-9, and at least one of @#*$');
      setIsLoading(false);
      return;
    }

    try {
      const apiUrl = await getApiUrl();

      // Use the new dedicated password reset endpoint
      // This endpoint does NOT require JWT authentication
      const resetResponse = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          newPassword: formData.newPassword
        })
      });

      const resetResult = await resetResponse.json();

      if (resetResult.status_code !== 200) {
        setError(resetResult.message || 'Failed to reset password. Please try again.');
        setIsLoading(false);
        return;
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Error resetting password:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="page-content">
        <div className="admin-container">
          <h1>Reset Password</h1>
          <p>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="page-content">
        <div className="admin-container">
          <h1>Reset Password</h1>
          {error && <div className="admin-error">{error}</div>}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <a href="/forgot-password" style={{ color: '#00a755', textDecoration: 'none' }}>
              Request a new password reset link
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="admin-container">
        <h1>Reset Password</h1>
        <p>Enter your new password for: <strong>{userEmail}</strong></p>

        {error && <div className="admin-error">{error}</div>}
        {success && <div className="admin-success">{success}</div>}

        <div className="admin-form">
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label htmlFor="newPassword">New Password *</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password"
                required
                disabled={isLoading}
              />
              <small style={{ color: '#666', fontSize: '14px' }}>
                Must be 8+ characters with: a-z, A-Z, 0-9, and at least one of @#*$
              </small>
            </div>

            <div className="admin-form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
                required
                disabled={isLoading}
              />
            </div>

            <div className="admin-form-actions">
              <button 
                type="submit" 
                className="admin-button" 
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
