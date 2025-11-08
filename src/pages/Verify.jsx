/**
 * @file Verify.jsx
 * @description Email verification page for new user accounts
 * @module pages/Verify
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getApiUrl } from '../utils/authHelpers';

/**
 * Verify component - handles email verification via token
 * 
 * @component
 * @description Automatically verifies user's email address using token from URL.
 * Extracts verification token from query parameter and sends to backend.
 * Handles success, error, and expired token states.
 * Users cannot log in until email is verified.
 * 
 * @example
 * // Route configuration
 * <Route path="/verify" element={<Verify />} />
 * 
 * // Email link format
 * https://example.com/verify?token=abc123...
 * 
 * @returns {JSX.Element} Verification page with status feedback
 */
function Verify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error, expired
  const [message, setMessage] = useState('');

  /**
   * Verifies email using token from URL query parameter
   * @async
   * @callback verifyToken
   * @description Sends token to backend verification endpoint, updates UI based on result
   */
  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        const response = await fetch(`${getApiUrl()}/api/verification/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const result = await response.json();

        if (result.status_code === 200) {
          setStatus('success');
          setMessage('Your email has been successfully verified! You can now log in.');
        } else if (result.message.includes('expired')) {
          setStatus('expired');
          setMessage('Your verification link has expired. Please request a new verification email.');
        } else if (result.message.includes('already verified')) {
          setStatus('success');
          setMessage('Your email is already verified. You can log in now.');
        } else {
          setStatus('error');
          setMessage(result.message || 'Invalid verification token');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };

    verifyToken();
  }, [searchParams]);

  return (
    <div className="page-content">
      <div className="auth-container">
        <div className="auth-box">
          {status === 'verifying' && (
            <>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner" style={{ 
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #00a755',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px'
                }}></div>
                <h2>Verifying Your Email...</h2>
                <p>Please wait while we verify your email address.</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ textAlign: 'center', fontSize: '60px', color: '#00a755' }}>✓</div>
              <h2 style={{ color: '#00a755', textAlign: 'center' }}>Email Verified!</h2>
              <p style={{ textAlign: 'center' }}>{message}</p>
              <button 
                onClick={() => navigate('/login')}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '20px' }}
              >
                Go to Login
              </button>
            </>
          )}

          {status === 'expired' && (
            <>
              <div style={{ textAlign: 'center', fontSize: '60px', color: '#ffc107' }}>⚠</div>
              <h2 style={{ color: '#ffc107', textAlign: 'center' }}>Link Expired</h2>
              <p style={{ textAlign: 'center' }}>{message}</p>
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                <p><strong>To request a new verification email:</strong></p>
                <ol style={{ textAlign: 'left' }}>
                  <li>Try logging in</li>
                  <li>You'll see an option to resend the verification email</li>
                </ol>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '20px' }}
              >
                Go to Login
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ textAlign: 'center', fontSize: '60px', color: '#dc3545' }}>✗</div>
              <h2 style={{ color: '#dc3545', textAlign: 'center' }}>Verification Failed</h2>
              <p style={{ textAlign: 'center' }}>{message}</p>
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
                <p><strong>Please check:</strong></p>
                <ul style={{ textAlign: 'left' }}>
                  <li>The link in your email is complete (not cut off)</li>
                  <li>You're using the most recent verification email</li>
                  <li>The link hasn't expired (24 hours)</li>
                </ul>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '20px' }}
              >
                Go to Login
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Verify;
