/**
 * @file LeaguesAdmin.jsx
 * @description League management component for admin panel
 * @module components/admin/LeaguesAdmin
 */

import React, { useState, useEffect } from 'react';
import { crudRequest } from '../../utils/authHelpers';

/**
 * LeaguesAdmin component - CRUD operations for leagues
 * 
 * @component
 * @description Provides complete league management interface for administrators.
 * Handles league creation, editing, and deletion.
 * 
 * Features:
 * - List all leagues with name and season
 * - Add new leagues
 * - Edit existing leagues (update name and season)
 * - Delete leagues with confirmation
 * 
 * @example
 * // Used within Admin.jsx
 * {activeTab === 'leagues' && <LeaguesAdmin />}
 * 
 * @returns {JSX.Element} Leagues management interface
 */
function LeaguesAdmin() {
  const [leagues, setLeagues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLeague, setEditingLeague] = useState(null);
  const [formData, setFormData] = useState({
    leagueName: '',
    leagueSeason: ''
  });

  useEffect(() => {
    fetchLeagues();
  }, []);

  /**
   * Fetches all leagues from database
   * @async
   * @description Loads leagues sorted by season (desc) and name
   */
  const fetchLeagues = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await crudRequest('read', {
        table: 'tblleagues',
        orderBy: 'leagueSeason DESC, leagueName ASC'
      });

      if (result.status_code === 200) {
        const leagueData = result.data.records || result.data;
        setLeagues(leagueData);
      } else {
        setError(result.message || 'Failed to load leagues');
      }
    } catch (err) {
      console.error('Error fetching leagues:', err);
      setError('Failed to load leagues');
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

  const handleAdd = () => {
    setEditingLeague(null);
    setFormData({
      leagueName: '',
      leagueSeason: ''
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleEdit = (league) => {
    setEditingLeague(league);
    setFormData({
      leagueName: league.leagueName,
      leagueSeason: league.leagueSeason
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.leagueName.trim()) {
      setError('League name is required');
      return;
    }

    if (!formData.leagueSeason.trim()) {
      setError('League season is required');
      return;
    }

    try {
      const operation = editingLeague ? 'update' : 'create';
      const requestData = editingLeague
        ? {
            table: 'tblleagues',
            data: formData,
            conditions: { id: editingLeague.id }
          }
        : {
            table: 'tblleagues',
            data: formData
          };

      const result = await crudRequest(operation, requestData);

      if (result.status_code === 200) {
        setSuccess(editingLeague ? 'League updated successfully' : 'League created successfully');
        setShowForm(false);
        await fetchLeagues();
      } else {
        setError(result.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving league:', err);
      setError('Failed to save league');
    }
  };

  const handleDelete = async (league) => {
    if (!window.confirm(`Are you sure you want to delete ${league.leagueName} (${league.leagueSeason})? This will affect all teams, fixtures, and standings associated with this league.`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const result = await crudRequest('delete', {
        table: 'tblleagues',
        conditions: { id: league.id }
      });

      if (result.status_code === 200) {
        setSuccess('League deleted successfully');
        await fetchLeagues();
      } else {
        setError(result.message || 'Failed to delete league');
      }
    } catch (err) {
      console.error('Error deleting league:', err);
      setError('Failed to delete league');
    }
  };

  if (isLoading) {
    return <div className="admin-loading">Loading leagues...</div>;
  }

  return (
    <div>
      <div className="admin-header">
        <h3>Manage Leagues</h3>
        {!showForm && (
          <button className="admin-btn admin-btn-primary" onClick={handleAdd}>
            + Add League
          </button>
        )}
      </div>

      {error && <div className="admin-error">{error}</div>}
      {success && <div className="admin-success">{success}</div>}

      {showForm && (
        <div className="admin-form darkText">
          <h4>{editingLeague ? 'Edit League' : 'Add New League'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label>League Name *</label>
              <input
                type="text"
                name="leagueName"
                value={formData.leagueName}
                onChange={handleInputChange}
                required
                placeholder="e.g., Devon Merit Table"
              />
            </div>

            <div className="admin-form-group">
              <label>Season *</label>
              <input
                type="text"
                name="leagueSeason"
                value={formData.leagueSeason}
                onChange={handleInputChange}
                required
                placeholder="e.g., 2025-26"
              />
              <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                Format: YYYY-YY (e.g., 2025-26)
              </small>
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary">
                {editingLeague ? 'Update League' : 'Create League'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowForm(false)}
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
              <th>League Name</th>
              <th>Season</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="darkText">
            {leagues.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>
                  No leagues found. Add your first league to get started.
                </td>
              </tr>
            ) : (
              leagues.map(league => (
                <tr key={league.id}>
                  <td><strong>{league.leagueName}</strong></td>
                  <td>{league.leagueSeason}</td>
                  <td>
                    <button
                      className="admin-btn admin-btn-secondary admin-btn-small"
                      onClick={() => handleEdit(league)}
                      style={{ marginRight: '8px' }}
                    >
                      Edit
                    </button>
                    <button
                      className="admin-btn admin-btn-danger admin-btn-small"
                      onClick={() => handleDelete(league)}
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

export default LeaguesAdmin;
