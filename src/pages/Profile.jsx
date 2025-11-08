/**
 * @file Profile.jsx
 * @description User profile management page - allows users to edit their own information
 * @module pages/Profile
 */

import React, { useState, useEffect, useCallback } from 'react';
import bcrypt from 'bcryptjs';
import { crudRequest, getUser, getApiUrl } from '../utils/authHelpers';

/**
 * Profile Component
 * 
 * Self-service profile editing for all authenticated users.
 * Allows editing of name, password, and team selection (followers only).
 * 
 * Features:
 * - Edit first and last name
 * - Change password (requires current password verification)
 * - Change team selection (authority = 0 only)
 * - Email notification sent after any changes
 * - Login/email field is disabled (cannot be changed)
 * 
 * Authority Levels:
 * - 0 (Follower): Can edit name, password, and team
 * - 1+ (Admin): Can edit name and password only
 * 
 * Security:
 * - Current password required for password changes
 * - Password complexity validation enforced
 * - Client-side bcrypt verification of current password
 * - Changes tracked and emailed to user
 * 
 * @component
 * @requires authentication
 * @returns {React.ReactElement} The profile editing form
 * 
 * @example
 * // Protected route definition
 * <Route path="profile" element={
 *   <ProtectedRoute>
 *     <Profile />
 *   </ProtectedRoute>
 * } />
 */
function Profile() {
  const currentUser = getUser();
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    login: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    authorityOver: 0
  });

  /**
   * Load current user data from database
   * Populates form fields with existing user information
   * 
   * @async
   * @callback loadUserData
   * @returns {Promise<void>}
   */
  const loadUserData = useCallback(async () => {
    try {
      const result = await crudRequest('read', {
        table: 'tblusers',
        conditions: { id: currentUser.id }
      });

      if (result.status_code === 200) {
        const userData = result.data.records?.[0] || result.data[0];
        if (userData) {
          setFormData(prev => ({
            ...prev,
            firstName: userData.firstName,
            lastName: userData.lastName,
            login: userData.login,
            authorityOver: userData.authorityOver || 0
          }));
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load user data');
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadUserData();
    if (currentUser.authority === 0) {
      fetchTeams();
    }
  }, [loadUserData, currentUser.authority]);

  const fetchTeams = async () => {
    try {
      const result = await crudRequest('read', {
        table: 'tblteams',
        orderBy: 'teamName ASC'
      });

      if (result.status_code === 200) {
        setTeams(result.data.records || result.data);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const sendProfileUpdateEmail = async (changes) => {
    try {
      // Load the email template
      const templateResponse = await fetch('/templates/profile-update.html');
      const template = await templateResponse.text();

      // Build changes list HTML
      const changesHtml = changes.map(change => `<li>${change}</li>`).join('');

      // Format timestamp
      const timestamp = new Date().toLocaleString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Replace placeholders in template
      let emailHtml = template
        .replace(/{{firstName}}/g, formData.firstName)
        .replace(/{{lastName}}/g, formData.lastName)
        .replace(/{{login}}/g, formData.login)
        .replace(/{{changes}}/g, changesHtml)
        .replace(/{{timestamp}}/g, timestamp);

      // Send email
      const apiUrl = await getApiUrl();
      const emailResponse = await fetch(`${apiUrl}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [formData.login],
          subject: 'Profile Updated - Devon RFU Colts League',
          htmlBody: emailHtml
        })
      });

      if (!emailResponse.ok) {
        console.error('Failed to send profile update email');
      }
    } catch (error) {
      console.error('Error sending profile update email:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'authorityOver' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate password change if provided
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        setError('Current password is required to set a new password');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      if (formData.newPassword.length < 8) {
        setError('New password must be at least 8 characters long');
        return;
      }
      // Validate password complexity
      const hasLowerCase = /[a-z]/.test(formData.newPassword);
      const hasUpperCase = /[A-Z]/.test(formData.newPassword);
      const hasNumber = /[0-9]/.test(formData.newPassword);
      const hasSpecial = /[@#*$]/.test(formData.newPassword);
      
      if (!hasLowerCase || !hasUpperCase || !hasNumber || !hasSpecial) {
        setError('Password must contain: a-z, A-Z, 0-9, and at least one of @#*$');
        return;
      }
    }

    try {
      // Track what changes are being made
      const changes = [];
      
      // Get current user data to compare changes
      const userResult = await crudRequest('read', {
        table: 'tblusers',
        conditions: { id: currentUser.id }
      });

      if (userResult.status_code !== 200) {
        setError('Failed to verify current data');
        return;
      }

      const currentData = userResult.data.records?.[0] || userResult.data[0];

      let dataToUpdate = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        authorityOver: formData.authorityOver
      };

      // Track name changes
      if (currentData.firstName !== formData.firstName || currentData.lastName !== formData.lastName) {
        changes.push(`Name updated to ${formData.firstName} ${formData.lastName}`);
      }

      // Track team change (for followers)
      if (currentUser.authority === 0 && currentData.authorityOver !== formData.authorityOver) {
        const selectedTeam = teams.find(t => t.id === formData.authorityOver);
        changes.push(`Following team changed to ${selectedTeam?.teamName || 'None'}`);
      }

      // If changing password, verify current password and hash new one
      if (formData.newPassword) {
        // Verify current password
        const passwordMatch = bcrypt.compareSync(formData.currentPassword, currentData.password);
        if (!passwordMatch) {
          setError('Current password is incorrect');
          return;
        }

        // Hash new password
        const hashedPassword = bcrypt.hashSync(formData.newPassword, 10);
        dataToUpdate.password = hashedPassword;
        changes.push('Password changed');
      }

      // Only proceed if there are actual changes
      if (changes.length === 0) {
        setError('No changes were made');
        return;
      }

      const result = await crudRequest('update', {
        table: 'tblusers',
        data: dataToUpdate,
        conditions: { id: currentUser.id }
      });

      if (result.status_code === 200) {
        setSuccess('Profile updated successfully');
        
        // Update localStorage user data
        const updatedUser = {
          ...currentUser,
          firstName: formData.firstName,
          lastName: formData.lastName,
          authorityOver: formData.authorityOver
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Send email notification about the changes
        await sendProfileUpdateEmail(changes);

        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        setError(result.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    }
  };

  return (
    <div className="page-content">
      <div className="admin-container">
        <h1>My Profile</h1>

        {error && <div className="admin-error">{error}</div>}
        {success && <div className="admin-success">{success}</div>}

        <div className="admin-form">
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="admin-form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="admin-form-group">
              <label>Email/Login</label>
              <input
                type="text"
                name="login"
                value={formData.login}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small style={{ color: '#666', fontSize: '0.9em' }}>Email/login cannot be changed</small>
            </div>

            {currentUser.authority === 0 && (
              <div className="admin-form-group">
                <label>Team to Follow</label>
                <select
                  name="authorityOver"
                  value={formData.authorityOver}
                  onChange={handleInputChange}
                >
                  <option value="0">None</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.teamName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="admin-form-group" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
              <h4 style={{ marginBottom: '15px', color: '#1c1c1c' }}>Change Password</h4>
              <small style={{ color: '#666', fontSize: '0.9em', display: 'block', marginBottom: '15px' }}>
                Leave blank to keep current password
              </small>
            </div>

            <div className="admin-form-group">
              <label>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                autoComplete="current-password"
              />
            </div>

            <div className="admin-form-group">
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                autoComplete="new-password"
              />
              <small style={{ color: '#666', fontSize: '0.9em' }}>
                Min 8 characters, must include: a-z, A-Z, 0-9, and @#*$
              </small>
            </div>

            <div className="admin-form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                autoComplete="new-password"
              />
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary">
                Update Profile
              </button>
            </div>
          </form>
        </div>

        <div className="admin-section" style={{ marginTop: '30px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h4 style={{ color: '#1c1c1c' }}>Account Information</h4>
          <p style={{ color: '#1c1c1c' }}><strong>Role:</strong> {currentUser.role}</p>
          <p style={{ color: '#1c1c1c' }}>
            <strong>Account Type:</strong> {
              currentUser.authority === 0 ? 'Follower' :
              currentUser.authority === 1 ? 'Local Admin' :
              'Full Admin'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default Profile;
