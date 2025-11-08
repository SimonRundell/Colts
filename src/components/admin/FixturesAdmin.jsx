/**
 * @file FixturesAdmin.jsx
 * @description Fixtures management component for admin panel
 * @module components/admin/FixturesAdmin
 */

import React, { useState, useEffect } from 'react';
import { crudRequest } from '../../utils/authHelpers';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * FixturesAdmin component - CRUD operations for fixtures
 * 
 * @component
 * @description Provides complete fixture management interface for administrators.
 * Handles fixture scheduling with date/time picker, team selection, and venue management.
 * 
 * Features:
 * - List all fixtures with match details (teams, date, venue, league, status)
 * - Add new fixtures with date/time picker
 * - Edit existing fixtures
 * - Delete fixtures with confirmation
 * - Team dropdown selection (home/away)
 * - League assignment
 * - Match status management (scheduled, underway, completed, cancelled, abandoned)
 * - Venue management
 * 
 * Date Handling:
 * - Uses react-datepicker for user-friendly date/time selection
 * - Formats dates to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
 * 
 * @example
 * // Used within Admin.jsx
 * {activeTab === 'fixtures' && <FixturesAdmin />}
 * 
 * @returns {JSX.Element} Fixtures management interface
 */
function FixturesAdmin() {
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingFixture, setEditingFixture] = useState(null);
  const [formData, setFormData] = useState({
    homeTeam: '',
    awayTeam: '',
    date: '',
    time: '15:00',
    venue: '',
    leagueID: '',
    status: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Fetches fixtures, teams, and leagues data
   * @async
   * @description Loads all required data for fixture management
   */
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Fetch fixtures
      const fixturesResult = await crudRequest('read', {
        table: 'tblfixtures',
        orderBy: 'date DESC'
      });

      // Fetch teams
      const teamsResult = await crudRequest('read', {
        table: 'tblteams',
        orderBy: 'teamName ASC'
      });

      // Fetch leagues
      const leaguesResult = await crudRequest('read', {
        table: 'tblleagues',
        orderBy: 'leagueName ASC'
      });

      if (fixturesResult.status_code === 200) {
        const fixtureData = fixturesResult.data.records || fixturesResult.data;
        setFixtures(fixtureData);
      }

      if (teamsResult.status_code === 200) {
        const teamData = teamsResult.data.records || teamsResult.data;
        setTeams(teamData);
      }

      if (leaguesResult.status_code === 200) {
        const leagueData = leaguesResult.data.records || leaguesResult.data;
        setLeagues(leagueData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Formats JavaScript Date to MySQL datetime format
   * @param {Date} date - JavaScript Date object
   * @returns {string} MySQL datetime string (YYYY-MM-DD HH:MM:SS)
   */
  const formatDateForMySQL = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'homeTeam' || name === 'awayTeam' || name === 'leagueID' || name === 'status'
        ? parseInt(value) 
        : value
    }));
  };

  const handleDateChange = (date) => {
    if (date) {
      // Format date as YYYY-MM-DD for the form data
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      setFormData(prev => ({
        ...prev,
        date: formattedDate
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        date: ''
      }));
    }
  };

  const handleAdd = () => {
    setEditingFixture(null);
    setFormData({
      homeTeam: '',
      awayTeam: '',
      date: '',
      time: '15:00',
      venue: '',
      leagueID: '',
      status: 0
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleEdit = (fixture) => {
    setEditingFixture(fixture);
    
    // Parse the datetime string
    const fixtureDate = new Date(fixture.date);
    const dateStr = fixtureDate.toISOString().split('T')[0];
    const timeStr = fixtureDate.toTimeString().substring(0, 5);
    
    setFormData({
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      date: dateStr,
      time: timeStr,
      venue: fixture.venue,
      leagueID: fixture.leagueID,
      status: fixture.status
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
    if (!formData.homeTeam || !formData.awayTeam || !formData.date || !formData.venue || !formData.leagueID) {
      setError('All fields are required');
      return;
    }

    if (formData.homeTeam === formData.awayTeam) {
      setError('Home team and away team cannot be the same');
      return;
    }

    try {
      // Combine date and time
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      const mysqlDateTime = formatDateForMySQL(dateTime);

      const operation = editingFixture ? 'update' : 'create';
      const requestData = editingFixture
        ? {
            table: 'tblfixtures',
            data: {
              homeTeam: formData.homeTeam,
              awayTeam: formData.awayTeam,
              date: mysqlDateTime,
              venue: formData.venue,
              leagueID: formData.leagueID,
              status: formData.status
            },
            conditions: { id: editingFixture.id }
          }
        : {
            table: 'tblfixtures',
            data: {
              homeTeam: formData.homeTeam,
              awayTeam: formData.awayTeam,
              date: mysqlDateTime,
              venue: formData.venue,
              leagueID: formData.leagueID,
              status: formData.status
            }
          };

      const result = await crudRequest(operation, requestData);

      if (result.status_code === 200) {
        setSuccess(editingFixture ? 'Fixture updated successfully' : 'Fixture created successfully');
        setShowForm(false);
        await fetchData();
      } else {
        setError(result.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving fixture:', err);
      setError('Failed to save fixture');
    }
  };

  const handleDelete = async (fixture) => {
    const homeTeamName = teams.find(t => t.id === fixture.homeTeam)?.teamName || 'Unknown';
    const awayTeamName = teams.find(t => t.id === fixture.awayTeam)?.teamName || 'Unknown';
    
    if (!window.confirm(`Are you sure you want to delete the fixture: ${homeTeamName} vs ${awayTeamName}?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const result = await crudRequest('delete', {
        table: 'tblfixtures',
        conditions: { id: fixture.id }
      });

      if (result.status_code === 200) {
        setSuccess('Fixture deleted successfully');
        await fetchData();
      } else {
        setError(result.message || 'Failed to delete fixture');
      }
    } catch (err) {
      console.error('Error deleting fixture:', err);
      setError('Failed to delete fixture');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status) => {
    const statuses = {
      0: 'Scheduled',
      1: 'Underway',
      2: 'Completed',
      3: 'Cancelled',
      4: 'Abandoned'
    };
    return statuses[status] || 'Unknown';
  };

  const getStatusColor = (status) => {
    const colors = {
      0: '#666',
      1: '#00a755',
      2: '#0066cc',
      3: '#cc0000',
      4: '#ff6600'
    };
    return colors[status] || '#666';
  };

  if (isLoading) {
    return <div className="admin-loading">Loading fixtures...</div>;
  }

  return (
    <div>
      <div className="admin-header">
        <h3>Manage Fixtures</h3>
        {!showForm && (
          <button className="admin-btn admin-btn-primary" onClick={handleAdd}>
            + Add Fixture
          </button>
        )}
      </div>

      {error && <div className="admin-error">{error}</div>}
      {success && <div className="admin-success">{success}</div>}

      {showForm && (
        <div className="admin-form darkText">
          <h4>{editingFixture ? 'Edit Fixture' : 'Add New Fixture'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label>Home Team *</label>
              <select
                name="homeTeam"
                value={formData.homeTeam}
                onChange={handleInputChange}
                required
              >
                <option value="">Select home team</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label>Away Team *</label>
              <select
                name="awayTeam"
                value={formData.awayTeam}
                onChange={handleInputChange}
                required
              >
                <option value="">Select away team</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label>Date *</label>
              <DatePicker
                selected={formData.date ? new Date(formData.date + 'T00:00:00') : null}
                onChange={handleDateChange}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select a date"
                className="admin-input"
                required
                showPopperArrow={false}
              />
            </div>

            <div className="admin-form-group">
              <label>Time *</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="admin-form-group">
              <label>Venue *</label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleInputChange}
                required
                placeholder="Enter venue name"
              />
            </div>

            <div className="admin-form-group">
              <label>League *</label>
              <select
                name="leagueID"
                value={formData.leagueID}
                onChange={handleInputChange}
                required
              >
                <option value="">Select league</option>
                {leagues.map(league => (
                  <option key={league.id} value={league.id}>
                    {league.leagueName} {league.leagueSeason && `(${league.leagueSeason})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value={0}>Scheduled</option>
                <option value={1}>Underway</option>
                <option value={2}>Completed</option>
                <option value={3}>Cancelled</option>
                <option value={4}>Abandoned</option>
              </select>
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary">
                {editingFixture ? 'Update Fixture' : 'Create Fixture'}
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
              <th>Date & Time</th>
              <th>Home Team</th>
              <th>Away Team</th>
              <th>Venue</th>
              <th>League</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="darkText">
            {fixtures.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  No fixtures found. Add your first fixture to get started.
                </td>
              </tr>
            ) : (
              fixtures.map(fixture => {
                const homeTeam = teams.find(t => t.id === fixture.homeTeam);
                const awayTeam = teams.find(t => t.id === fixture.awayTeam);
                const league = leagues.find(l => l.id === fixture.leagueID);
                
                return (
                  <tr key={fixture.id}>
                    <td>{formatDate(fixture.date)}</td>
                    <td><strong>{homeTeam?.teamName || 'Unknown'}</strong></td>
                    <td><strong>{awayTeam?.teamName || 'Unknown'}</strong></td>
                    <td>{fixture.venue}</td>
                    <td>
                      {league?.leagueName || 'Unknown'}
                      {league?.leagueSeason && <span style={{ fontSize: '0.9em', color: '#666' }}> ({league.leagueSeason})</span>}
                    </td>
                    <td>
                      <span style={{ 
                        color: getStatusColor(fixture.status),
                        fontWeight: 'bold'
                      }}>
                        {getStatusLabel(fixture.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="admin-btn admin-btn-secondary admin-btn-small"
                        onClick={() => handleEdit(fixture)}
                        style={{ marginRight: '8px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-btn admin-btn-danger admin-btn-small"
                        onClick={() => handleDelete(fixture)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FixturesAdmin;
