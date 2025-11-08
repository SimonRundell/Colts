/**
 * @file Register.jsx
 * @description User registration page with team selection
 * @module pages/Register
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicRead, getApiUrl } from '../utils/authHelpers';

/**
 * Register component - handles new user registration
 * 
 * @component
 * @description Provides multi-step registration form with password requirements,
 * team selection, and email verification. Enforces strict password policy:
 * - Minimum 8 characters
 * - At least one lowercase, one uppercase, one number, one special character (@#*$)
 * - Only allows a-z, A-Z, 0-9, and @#*$ characters
 * 
 * Sends verification email after successful registration.
 * Users must verify email before they can log in.
 * 
 * @example
 * // Route configuration
 * <Route path="/register" element={<Register />} />
 * 
 * @returns {JSX.Element} Registration page with multi-step form
 */
function Register() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    login: '',
    password: '',
    confirmPassword: '',
    authorityOver: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  /**
   * Fetches available teams for user selection
   * @async
   * @description Loads teams from tblteams, sorts alphabetically for dropdown
   */
  const fetchTeams = async () => {
    try {
      const result = await publicRead({
        table: 'tblteams'
      });

      if (result.status_code === 200) {
        const teamsData = result.data.records || result.data;
        setTeams(teamsData.sort((a, b) => a.teamName.localeCompare(b.teamName)));
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  /**
   * Validates password against security requirements
   * @param {string} password - Password to validate
   * @returns {string|null} Error message if invalid, null if valid
   */
  const validatePassword = (password) => {
    // Check length
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    // Check for required character types
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[@#*$]/.test(password);
    const validChars = /^[a-zA-Z0-9@#*$]+$/.test(password);

    if (!validChars) {
      return 'Password can only contain a-z, A-Z, 0-9, and special characters @#*$';
    }

    if (!hasLowerCase || !hasUpperCase || !hasNumber || !hasSpecial) {
      return 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@#*$)';
    }

    return null;
  };

  /**
   * Validates all form fields
   * @returns {boolean} True if form is valid, false otherwise
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.login.trim()) {
      newErrors.login = 'Username is required';
    } else if (formData.login.length < 3) {
      newErrors.login = 'Username must be at least 3 characters';
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.authorityOver) {
      newErrors.authorityOver = 'Please select a team to follow';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form input changes and clears field-specific errors
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  /**
   * Handles registration form submission
   * @async
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   * @description Creates new user account and sends verification email
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Register user using new auth endpoint (NO JWT NEEDED)
      const registerResponse = await fetch(`${getApiUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: formData.login,
          password: formData.password,
          email: formData.login,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: 'Follower',
          authority: 0,
          authorityOver: parseInt(formData.authorityOver)
        })
      });

      const registerResult = await registerResponse.json();

      if (registerResult.status_code !== 201 && registerResult.status_code !== 200) {
        if (registerResult.message && registerResult.message.includes('Duplicate entry')) {
          setErrors({ login: 'This username is already taken' });
        } else {
          setErrors({ form: registerResult.message || 'Failed to create account' });
        }
        setIsLoading(false);
        return;
      }

      // Step 2: Generate verification token
      const tokenResponse = await fetch(`${getApiUrl()}/api/verification/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: formData.login
        })
      });

      const tokenResult = await tokenResponse.json();

      if (tokenResult.status_code !== 200) {
        setErrors({ form: 'Account created but failed to send verification email. Please contact support.' });
        setIsLoading(false);
        return;
      }

      // Step 3: Load email template
      const templateResponse = await fetch('/templates/registration.html');
      let emailTemplate = await templateResponse.text();

      // Step 4: Get team name
      const selectedTeam = teams.find(t => t.id === parseInt(formData.authorityOver));
      const teamName = selectedTeam ? selectedTeam.teamName : 'Unknown Team';

      // Step 5: Replace placeholders in template
      const verificationLink = `${window.location.origin}/verify?token=${tokenResult.data.token}`;
      
      emailTemplate = emailTemplate
        .replace(/{{firstName}}/g, formData.firstName)
        .replace(/{{lastName}}/g, formData.lastName)
        .replace(/{{login}}/g, formData.login)
        .replace(/{{teamName}}/g, teamName)
        .replace(/{{verificationLink}}/g, verificationLink);

      // Step 6: Send verification email
      const emailResponse = await fetch(`${getApiUrl()}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [formData.login], // Assuming login is email address
          subject: 'Welcome to Devon RFU Colts League - Verify Your Email',
          htmlBody: emailTemplate
        })
      });

      const emailResult = await emailResponse.json();

      if (emailResult.status_code !== 200) {
        setErrors({ form: 'Account created but failed to send verification email. Please contact support.' });
        setIsLoading(false);
        return;
      }

      // Success!
      setSuccess(true);

    } catch (err) {
      console.error('Registration error:', err);
      setErrors({ form: 'An error occurred during registration. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-content">
        <div className="auth-container">
          <div className="auth-box">
            <h2 style={{ color: '#00a755' }}>✅ Registration Successful!</h2>
            <p>Thank you for registering, {formData.firstName}!</p>
            <p>We've sent a verification email to <strong>{formData.login}</strong></p>
            <p>Please check your email and click the verification link to activate your account.</p>
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px', color: '#1c1c1c' }}>
              <strong>⚠️ Important:</strong> You must verify your email before you can log in. The verification link expires in 24 hours.
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{ marginTop: '20px' }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="auth-container">
        <div className="auth-box">
          <h2>Register for Devon RFU Colts League</h2>
          <p>Join our community of rugby supporters</p>

          <form onSubmit={handleSubmit}>
            {errors.form && (
              <div className="error-message" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
                {errors.form}
              </div>
            )}

            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={errors.firstName ? 'error' : ''}
              />
              {errors.firstName && <span className="error-text">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={errors.lastName ? 'error' : ''}
              />
              {errors.lastName && <span className="error-text">{errors.lastName}</span>}
            </div>

            <div className="form-group">
              <label>Email / Username *</label>
              <input
                type="email"
                name="login"
                value={formData.login}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                className={errors.login ? 'error' : ''}
              />
              {errors.login && <span className="error-text">{errors.login}</span>}
              <small style={{ color: '#666' }}>This will be your username and where we send your verification email</small>
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'error' : ''}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
              <small style={{ color: '#666' }}>Minimum 8 characters, must include: a-z, A-Z, 0-9, and @#*$</small>
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? 'error' : ''}
              />
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            <div className="form-group">
              <label>Team to Follow *</label>
              <select
                name="authorityOver"
                value={formData.authorityOver}
                onChange={handleInputChange}
                className={errors.authorityOver ? 'error' : ''}
              >
                <option value="">Select a team...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.teamName} - {team.teamClub}
                  </option>
                ))}
              </select>
              {errors.authorityOver && <span className="error-text">{errors.authorityOver}</span>}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading}
              style={{ width: '100%', marginTop: '20px' }}
            >
              {isLoading ? 'Creating Account...' : 'Register'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              Already have an account?{' '}
              <a href="/login" style={{ color: '#00a755', fontWeight: 'bold' }}>
                Log In
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
