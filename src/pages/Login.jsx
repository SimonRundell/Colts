/**
 * @file Login.jsx
 * @description User login page with authentication
 * @module pages/Login
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../utils/authHelpers';

/**
 * Login component - handles user authentication
 * 
 * @component
 * @description Provides login form with username/password authentication.
 * Stores JWT token and user data in localStorage on successful login.
 * Handles email verification requirement (HTTP 403 for unverified users).
 * Provides password reset link for forgotten credentials.
 * 
 * @example
 * // Route configuration
 * <Route path="/login" element={<Login />} />
 * 
 * @returns {JSX.Element} Login page with form and validation
 */
function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Handles form input changes
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error message when user starts typing
    if (errorMessage) setErrorMessage('');
  };

  /**
   * Handles form submission and authentication
   * @async
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   * @description Sends login credentials to backend, stores auth token and user data on success
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.login.trim() || !formData.password.trim()) {
      setErrorMessage('Please provide both login and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          login: formData.login,
          password: formData.password
        })
      });

      const result = await response.json();

      if (result.status_code === 200) {
        // Store the token and user info
        localStorage.setItem('authToken', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        setSuccessMessage('Login successful! Redirecting...');
        
        // Redirect to home page after a brief delay
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        // Handle error responses
        if (result.status_code === 403 && result.message.includes('not verified')) {
          setErrorMessage('Please verify your email before logging in. Check your inbox for the verification link.');
        } else {
          setErrorMessage(result.message || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-content">
    <div className="login-container">
      <div className="login-card">
        <h2>Login</h2>
        <p className="login-subtitle">Please enter your credentials</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login">Username</label>
            <input
              type="text"
              id="login"
              name="login"
              value={formData.login}
              onChange={handleInputChange}
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
              required
            />
            <div style={{ textAlign: 'right', marginTop: '5px' }}>
              <a 
                href="/forgot-password" 
                style={{ 
                  color: '#00a755', 
                  textDecoration: 'none', 
                  fontSize: '14px' 
                }}
              >
                Forgot Password?
              </a>
            </div>
          </div>

          {errorMessage && (
            <div className="message error-message">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="message success-message">
              {successMessage}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
            <p>Don't have an account?</p>
            <button 
              type="button"
              onClick={() => navigate('/register')}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Register as a Follower
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
}

export default Login;
