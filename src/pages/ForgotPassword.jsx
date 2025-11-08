/**
 * @file ForgotPassword.jsx
 * @description Password reset request page - allows users to request password reset email
 * @module pages/ForgotPassword
 */

import React, { useState } from 'react';
import { getApiUrl } from '../utils/authHelpers';

/**
 * ForgotPassword Component
 * 
 * Displays a form for users to request a password reset email.
 * Generates a verification token and sends an email with reset link.
 * Uses generic success messages for security (prevents email enumeration).
 * 
 * Security Features:
 * - Doesn't reveal if email exists in system
 * - Uses verification token system (24-hour expiration)
 * - Single-use tokens
 * 
 * @component
 * @returns {React.ReactElement} The forgot password form
 * 
 * @example
 * // Route definition
 * <Route path="forgot-password" element={<ForgotPassword />} />
 */
function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle form submission
   * Generates token, sends password reset email
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

    if (!email) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    try {
      const apiUrl = await getApiUrl();

      // Step 1: Generate verification token
      const tokenResponse = await fetch(`${apiUrl}/api/verification/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: email })
      });

      const tokenResult = await tokenResponse.json();

      // Always show success message (don't reveal if user exists or not)
      // But only send email if token was actually generated
      if (tokenResult.status_code === 200 && tokenResult.data?.token) {
        // Step 2: Get user info via login endpoint attempt (to get firstName/lastName)
        // We'll use public/read but need a workaround since tblusers is blocked
        // Alternative: Use a separate query or store name in token response
        
        // For now, we'll send a generic email without personalization
        // OR the backend should be modified to return user info with token generation
        
        // Step 3: Load email template
        const templateResponse = await fetch('/templates/password-reset.html');
        const template = await templateResponse.text();

        // Step 4: Create reset link
        const resetLink = `${window.location.origin}/reset-password?token=${tokenResult.data.token}&login=${encodeURIComponent(email)}`;

        // Step 5: Replace placeholders in template
        // Using email as fallback for firstName/lastName if we can't get them
        const emailHtml = template
          .replace(/{{firstName}}/g, 'User')
          .replace(/{{lastName}}/g, '')
          .replace(/{{login}}/g, email)
          .replace(/{{resetLink}}/g, resetLink);

        // Step 6: Send password reset email
        await fetch(`${apiUrl}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: [email],
            subject: 'Password Reset Request - Devon RFU Colts League',
            htmlBody: emailHtml
          })
        });
      }

      // Always show success message for security (don't reveal if email exists)
      setSuccess('If an account exists with this email, you will receive a password reset link shortly.');
      setEmail('');

    } catch (err) {
      console.error('Error requesting password reset:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="admin-container">
        <h1>Forgot Password</h1>
        <p>Enter your email address and we'll send you a link to reset your password.</p>

        {error && <div className="admin-error">{error}</div>}
        {success && <div className="admin-success">{success}</div>}

        <div className="admin-form">
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
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
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <a href="/login" style={{ color: '#00a755', textDecoration: 'none' }}>
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
