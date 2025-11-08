/**
 * @file TeamsAdmin.jsx
 * @description Team management component for admin panel
 * @module components/admin/TeamsAdmin
 */

import React, { useState, useEffect } from 'react';
import { crudRequest } from '../../utils/authHelpers';

/**
 * TeamsAdmin component - CRUD operations for teams
 * 
 * @component
 * @description Provides complete team management interface for administrators.
 * Handles team creation, editing, and deletion with logo upload support.
 * 
 * Features:
 * - List all teams with logos
 * - Add new teams with logo upload
 * - Edit existing teams (update name and logo)
 * - Delete teams with confirmation
 * - Image upload with compression and validation
 * - Logo preview before saving
 * 
 * Image Handling:
 * - Max file size: 500KB
 * - Auto-resize to max 400x400px
 * - Converts to base64 for database storage
 * - Supports all image formats
 * 
 * @example
 * // Used within Admin.jsx
 * {activeTab === 'teams' && <TeamsAdmin />}
 * 
 * @returns {JSX.Element} Teams management interface
 */
function TeamsAdmin() {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({
    teamName: '',
    teamLogo: ''
  });
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  /**
   * Fetches all teams from database
   * @async
   * @description Loads teams sorted alphabetically
   */
  const fetchTeams = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await crudRequest('read', {
        table: 'tblteams',
        orderBy: 'teamName ASC'
      });

      if (result.status_code === 200) {
        const teamData = result.data.records || result.data;
        setTeams(teamData);
      } else {
        setError(result.message || 'Failed to load teams');
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handles logo file upload with compression and validation
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event
   * @description Validates, compresses, and converts logo to base64
   */
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 500KB for better performance)
      if (file.size > 500 * 1024) {
        setError('Logo file size must be less than 500KB. Please use a smaller image or compress it.');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        
        // Compress image if it's too large
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if larger than 400x400
          const maxSize = 400;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Preserve transparency for PNG files, use JPEG for others
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const quality = mimeType === 'image/jpeg' ? 0.85 : 1.0;
          const compressedBase64 = canvas.toDataURL(mimeType, quality);
          
          setFormData(prev => ({
            ...prev,
            teamLogo: compressedBase64
          }));
          setLogoPreview(compressedBase64);
        };
        img.src = base64String;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = () => {
    setEditingTeam(null);
    setFormData({
      teamName: '',
      teamLogo: ''
    });
    setLogoPreview('');
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setFormData({
      teamName: team.teamName,
      teamLogo: team.teamLogo || ''
    });
    setLogoPreview(team.teamLogo || '');
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.teamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      const operation = editingTeam ? 'update' : 'create';
      const requestData = editingTeam
        ? {
            table: 'tblteams',
            data: formData,
            conditions: { id: editingTeam.id }
          }
        : {
            table: 'tblteams',
            data: formData
          };

      const result = await crudRequest(operation, requestData);

      if (result.status_code === 200) {
        setSuccess(editingTeam ? 'Team updated successfully' : 'Team created successfully');
        setShowForm(false);
        await fetchTeams();
      } else {
        setError(result.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving team:', err);
      setError('Failed to save team');
    }
  };

  const handleDelete = async (team) => {
    if (!window.confirm(`Are you sure you want to delete ${team.teamName}? This will affect all fixtures and results associated with this team.`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const result = await crudRequest('delete', {
        table: 'tblteams',
        conditions: { id: team.id }
      });

      if (result.status_code === 200) {
        setSuccess('Team deleted successfully');
        await fetchTeams();
      } else {
        setError(result.message || 'Failed to delete team');
      }
    } catch (err) {
      console.error('Error deleting team:', err);
      setError('Failed to delete team');
    }
  };

  if (isLoading) {
    return <div className="admin-loading">Loading teams...</div>;
  }

  return (
    <div>
      <div className="admin-header">
        <h3>Manage Teams</h3>
        {!showForm && (
          <button className="admin-btn admin-btn-primary" onClick={handleAdd}>
            + Add Team
          </button>
        )}
      </div>

      {error && <div className="admin-error">{error}</div>}
      {success && <div className="admin-success">{success}</div>}

      {showForm && (
        <div className="admin-form darkText">
          <h4>{editingTeam ? 'Edit Team' : 'Add New Team'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label>Team Name *</label>
              <input
                type="text"
                name="teamName"
                value={formData.teamName}
                onChange={handleInputChange}
                required
                placeholder="Enter team name"
              />
            </div>

            <div className="admin-form-group">
              <label>Team Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
              />
              <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                Maximum file size: 500KB. Image will be automatically resized to 400x400px max.
              </small>
            </div>

            {logoPreview && (
              <div className="admin-form-group">
                <label>Logo Preview</label>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <img 
                    src={logoPreview} 
                    alt="Team logo preview" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '200px',
                      objectFit: 'contain'
                    }} 
                  />
                </div>
              </div>
            )}

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary">
                {editingTeam ? 'Update Team' : 'Create Team'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setLogoPreview('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Team Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="darkText">
            {teams.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>
                  No teams found. Add your first team to get started.
                </td>
              </tr>
            ) : (
              teams.map(team => (
                <tr key={team.id}>
                  <td>
                    {team.teamLogo ? (
                      <img 
                        src={team.teamLogo} 
                        alt={`${team.teamName} logo`}
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          objectFit: 'contain',
                          display: 'block'
                        }}
                      />
                    ) : (
                      <span style={{ color: '#999', fontSize: '0.9em' }}>No logo</span>
                    )}
                  </td>
                  <td><strong>{team.teamName}</strong></td>
                  <td>
                    <button
                      className="admin-btn admin-btn-secondary admin-btn-small"
                      onClick={() => handleEdit(team)}
                      style={{ marginRight: '8px' }}
                    >
                      Edit
                    </button>
                    <button
                      className="admin-btn admin-btn-danger admin-btn-small"
                      onClick={() => handleDelete(team)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TeamsAdmin;
