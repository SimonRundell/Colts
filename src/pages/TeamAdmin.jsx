/**
 * @file TeamAdmin.jsx
 * @description Team-specific administration for recording match results
 * @module pages/TeamAdmin
 */

import React, { useState, useEffect } from 'react';
import { getUser, crudRequest } from '../utils/authHelpers';
import { updateStandingsForFixture } from '../utils/standingsCalculator';

/**
 * TeamAdmin component - team-specific result management
 * 
 * @component
 * @description Allows team administrators to record results for their team's fixtures.
 * Restricted to users with authority level 1 (team admin) for their specific team.
 * 
 * Features:
 * - View fixtures for managed team (authorityOver)
 * - Record match results (scores, status)
 * - Add try scorers for both teams
 * - Edit existing results
 * - Automatically updates league standings when results are recorded
 * 
 * Authority Requirement: authority = 1 (team admin), can only manage fixtures
 * involving their team (specified by authorityOver field)
 * 
 * @example
 * <ProtectedRoute path="/team-admin" element={<TeamAdmin />} requiredAuthority={1} />
 * 
 * @returns {JSX.Element} Team admin page with fixture result management
 */
function TeamAdmin() {
  const user = getUser();
  const [fixtures, setFixtures] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingFixture, setEditingFixture] = useState(null);
  const [resultData, setResultData] = useState({
    homeScore: 0,
    awayScore: 0,
    status: 2, // 0=scheduled, 1=underway, 2=completed, 3=cancelled, 4=abandoned
    homeScorers: [],
    awayScorers: []
  });

  /**
   * Fetches team data and fixtures
   * @async
   * @description Loads team name, fixtures, results, and enriches data for display
   */
  const fetchTeamData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Get team information
      const teamResult = await crudRequest('read', {
        table: 'tblteams',
        conditions: { id: user.authorityOver }
      });

      if (teamResult.status_code === 200) {
        const teams = teamResult.data.records || teamResult.data;
        if (teams.length > 0) {
          setTeamName(teams[0].teamName);
        }
      }

      // Get fixtures for this team
      const fixturesResult = await crudRequest('read', {
        table: 'tblfixtures',
        orderBy: 'date DESC'
      });

      if (fixturesResult.status_code !== 200) {
        setError('Failed to load fixtures');
        return;
      }

      // Get all teams for display names
      const teamsResult = await crudRequest('read', {
        table: 'tblteams'
      });

      if (teamsResult.status_code !== 200) {
        setError('Failed to load team data');
        return;
      }

      // Get existing results
      const resultsResult = await crudRequest('read', {
        table: 'tblresults'
      });

      const results = resultsResult.status_code === 200 ? (resultsResult.data.records || resultsResult.data) : [];
      console.log('Results fetched:', results);
      const resultsMap = {};
      results.forEach(result => {
        resultsMap[result.fixtureID] = result;
      });
      console.log('Results map:', resultsMap);

      // Filter and enrich fixtures
      let allFixtures = fixturesResult.data.records || fixturesResult.data;
      let teams = teamsResult.data.records || teamsResult.data;

      const teamMap = {};
      teams.forEach(team => {
        teamMap[team.id] = team.teamName;
      });

      // Only show fixtures where this team is playing
      const teamFixtures = allFixtures
        .filter(f => f.homeTeam === user.authorityOver || f.awayTeam === user.authorityOver)
        .map(fixture => ({
          ...fixture,
          homeTeamName: teamMap[fixture.homeTeam] || 'Unknown',
          awayTeamName: teamMap[fixture.awayTeam] || 'Unknown',
          result: resultsMap[fixture.id] || null,
          isHomeTeam: fixture.homeTeam === user.authorityOver
        }));

      setFixtures(teamFixtures);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.authority === 1 && user.authorityOver) {
      fetchTeamData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only allow local admins (authority = 1) with a team assignment
  if (!user || user.authority !== 1 || !user.authorityOver) {
    return (
      <div className="page-content">
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  const handleEditResult = (fixture) => {
    setEditingFixture(fixture);
    
    // Parse JSON scorers if they exist
    let homeScorers = [];
    let awayScorers = [];
    
    try {
      if (fixture.result?.homeScorers) {
        homeScorers = typeof fixture.result.homeScorers === 'string' 
          ? JSON.parse(fixture.result.homeScorers) 
          : fixture.result.homeScorers;
      }
      if (fixture.result?.awayScorers) {
        awayScorers = typeof fixture.result.awayScorers === 'string'
          ? JSON.parse(fixture.result.awayScorers)
          : fixture.result.awayScorers;
      }
    } catch (err) {
      console.error('Error parsing scorers:', err);
    }
    
    setResultData({
      homeScore: fixture.result?.homeScore || 0,
      awayScore: fixture.result?.awayScore || 0,
      status: fixture.status,
      homeScorers: Array.isArray(homeScorers) ? homeScorers : [],
      awayScorers: Array.isArray(awayScorers) ? awayScorers : []
    });
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setResultData(prev => ({
      ...prev,
      [name]: name === 'status' ? parseInt(value) : (parseInt(value) || 0)
    }));
  };

  // Scorer management functions
  const addScorer = (team) => {
    const newScorer = {
      playerName: '',
      scoreType: 'try',
      points: 5,
      minute: '',
      isPenaltyTry: false
    };
    
    setResultData(prev => ({
      ...prev,
      [team === 'home' ? 'homeScorers' : 'awayScorers']: [
        ...(prev[team === 'home' ? 'homeScorers' : 'awayScorers'] || []),
        newScorer
      ]
    }));
  };

  const removeScorer = (team, index) => {
    const scorersKey = team === 'home' ? 'homeScorers' : 'awayScorers';
    setResultData(prev => ({
      ...prev,
      [scorersKey]: prev[scorersKey].filter((_, i) => i !== index)
    }));
  };

  const updateScorer = (team, index, field, value) => {
    const scorersKey = team === 'home' ? 'homeScorers' : 'awayScorers';
    setResultData(prev => {
      const updatedScorers = [...prev[scorersKey]];
      updatedScorers[index] = {
        ...updatedScorers[index],
        [field]: value
      };
      
      // Auto-update points based on score type
      if (field === 'scoreType') {
        const pointsMap = {
          try: 5,
          conversion: 2,
          penalty: 3,
          dropGoal: 3
        };
        updatedScorers[index].points = pointsMap[value] || 0;
      }
      
      // If penalty try is selected, set playerName to 'Penalty Try'
      if (field === 'isPenaltyTry' && value) {
        updatedScorers[index].playerName = 'Penalty Try';
        updatedScorers[index].scoreType = 'try';
        updatedScorers[index].points = 5;
      }
      
      return {
        ...prev,
        [scorersKey]: updatedScorers
      };
    });
  };

  const calculateTotalPoints = (scorers) => {
    return (scorers || []).reduce((total, scorer) => total + (parseInt(scorer.points) || 0), 0);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // For cancelled (3) or abandoned (4) matches, only update fixture status
      if (resultData.status === 3 || resultData.status === 4) {
        const fixtureUpdateResult = await crudRequest('update', {
          table: 'tblfixtures',
          data: { status: resultData.status },
          conditions: { id: editingFixture.id }
        });

        if (fixtureUpdateResult.status_code === 200) {
          setSuccess(resultData.status === 3 ? 'Match marked as cancelled' : 'Match marked as abandoned');
          setEditingFixture(null);
          await fetchTeamData();
        } else {
          setError('Failed to update match status');
        }
        return;
      }

      // For completed matches (or other statuses), save/update the result
      const operation = editingFixture.result ? 'update' : 'create';
      
      // Convert scorers to JSON string
      const homeScorersJSON = JSON.stringify(resultData.homeScorers || []);
      const awayScorersJSON = JSON.stringify(resultData.awayScorers || []);
      
      const requestData = operation === 'update'
        ? {
            table: 'tblresults',
            data: {
              homeScore: resultData.homeScore,
              awayScore: resultData.awayScore,
              homeScorers: homeScorersJSON,
              awayScorers: awayScorersJSON,
              submittedBy: user.id,
              dateSubmitted: formatDateForMySQL(new Date())
            },
            conditions: { fixtureID: editingFixture.id }
          }
        : {
            table: 'tblresults',
            data: {
              fixtureID: editingFixture.id,
              homeScore: resultData.homeScore,
              awayScore: resultData.awayScore,
              homeScorers: homeScorersJSON,
              awayScorers: awayScorersJSON,
              submittedBy: user.id,
              dateSubmitted: formatDateForMySQL(new Date())
            }
          };

      const result = await crudRequest(operation, requestData);

      if (result.status_code === 200) {
        console.log('Result saved, now updating fixture status to:', resultData.status);
        // Update the fixture status in tblfixtures
        const fixtureUpdateResult = await crudRequest('update', {
          table: 'tblfixtures',
          data: { status: resultData.status },
          conditions: { id: editingFixture.id }
        });

        console.log('Fixture update result:', fixtureUpdateResult);
        
        if (fixtureUpdateResult.status_code !== 200) {
          setError('Result saved but failed to update fixture status');
        } else {
          // Update league standings if result is completed
          if (resultData.status === 2) {
            console.log('Updating standings for fixture:', editingFixture.id);
            try {
              await updateStandingsForFixture(editingFixture.id);
              console.log('Standings updated successfully');
            } catch (standingsErr) {
              console.error('Error updating standings:', standingsErr);
              // Don't fail the whole operation if standings update fails
            }
          }
          setSuccess(operation === 'update' ? 'Result updated successfully' : 'Result added successfully');
        }
        
        setEditingFixture(null);
        // Refresh the fixtures list to show the new result
        await fetchTeamData();
      } else {
        setError(result.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving result:', err);
      setError('Failed to save result');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="page-content">
        <h2>Team Admin</h2>
        <div className="admin-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h2>Team Admin - {teamName}</h2>
      
      <div className="admin-container">
        <div className="admin-content">
          <div className="admin-header">
            <h3>Manage Results for Your Team</h3>
          </div>

          {error && <div className="admin-error">{error}</div>}
          {success && <div className="admin-success">{success}</div>}

          {editingFixture && (
            <div className="admin-form darkText">
              <h4>
                {editingFixture.result ? 'Edit Result' : 'Add Result'} - {formatDate(editingFixture.date)}
              </h4>
              <p>
                <strong>{editingFixture.homeTeamName}</strong> vs <strong>{editingFixture.awayTeamName}</strong>
              </p>
              <form onSubmit={handleSubmit}>
                <div className="admin-form-group">
                  <label>Match Status</label>
                  <select
                    name="status"
                    value={resultData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value={0}>Scheduled</option>
                    <option value={1}>Underway</option>
                    <option value={2}>Completed</option>
                    <option value={3}>Cancelled</option>
                    <option value={4}>Abandoned</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>{editingFixture.homeTeamName} Score</label>
                  <input
                    type="number"
                    name="homeScore"
                    value={resultData.homeScore}
                    onChange={handleInputChange}
                    min="0"
                    required={resultData.status === 2}
                    disabled={resultData.status === 3 || resultData.status === 4}
                  />
                </div>
                <div className="admin-form-group">
                  <label>{editingFixture.awayTeamName} Score</label>
                  <input
                    type="number"
                    name="awayScore"
                    value={resultData.awayScore}
                    onChange={handleInputChange}
                    min="0"
                    required={resultData.status === 2}
                    disabled={resultData.status === 3 || resultData.status === 4}
                  />
                </div>

                {/* Home Team Scorers */}
                {resultData.status === 2 && (
                  <div className="admin-form-group" style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ marginBottom: 0 }}>{editingFixture.homeTeamName} Scorers</label>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-small"
                        onClick={() => addScorer('home')}
                      >
                        + Add Scorer
                      </button>
                    </div>
                    {resultData.homeScorers && resultData.homeScorers.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table" style={{ marginTop: '10px', fontSize: '0.9em' }}>
                          <thead>
                            <tr>
                              <th>Player Name</th>
                              <th>Score Type</th>
                              <th>Points</th>
                              <th>Minute</th>
                              <th>Penalty Try</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultData.homeScorers.map((scorer, index) => (
                              <tr key={index}>
                                <td>
                                  <input
                                    type="text"
                                    value={scorer.playerName}
                                    onChange={(e) => updateScorer('home', index, 'playerName', e.target.value)}
                                    placeholder="Player name"
                                    disabled={scorer.isPenaltyTry}
                                    style={{ width: '100%', padding: '5px' }}
                                  />
                                </td>
                                <td>
                                  <select
                                    value={scorer.scoreType}
                                    onChange={(e) => updateScorer('home', index, 'scoreType', e.target.value)}
                                    style={{ width: '100%', padding: '5px' }}
                                  >
                                    <option value="try">Try</option>
                                    <option value="conversion">Conversion</option>
                                    <option value="penalty">Penalty</option>
                                    <option value="dropGoal">Drop Goal</option>
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={scorer.points}
                                    onChange={(e) => updateScorer('home', index, 'points', parseInt(e.target.value))}
                                    min="0"
                                    style={{ width: '60px', padding: '5px' }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={scorer.minute}
                                    onChange={(e) => updateScorer('home', index, 'minute', e.target.value)}
                                    placeholder="Min"
                                    min="1"
                                    max="100"
                                    style={{ width: '60px', padding: '5px' }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={scorer.isPenaltyTry}
                                    onChange={(e) => updateScorer('home', index, 'isPenaltyTry', e.target.checked)}
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn-danger admin-btn-small"
                                    onClick={() => removeScorer('home', index)}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                          Total Points: {calculateTotalPoints(resultData.homeScorers)}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: '#666', fontSize: '0.9em', marginTop: '10px' }}>No scorers added yet</p>
                    )}
                  </div>
                )}

                {/* Away Team Scorers */}
                {resultData.status === 2 && (
                  <div className="admin-form-group" style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ marginBottom: 0 }}>{editingFixture.awayTeamName} Scorers</label>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-small"
                        onClick={() => addScorer('away')}
                      >
                        + Add Scorer
                      </button>
                    </div>
                    {resultData.awayScorers && resultData.awayScorers.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table" style={{ marginTop: '10px', fontSize: '0.9em' }}>
                          <thead>
                            <tr>
                              <th>Player Name</th>
                              <th>Score Type</th>
                              <th>Points</th>
                              <th>Minute</th>
                              <th>Penalty Try</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultData.awayScorers.map((scorer, index) => (
                              <tr key={index}>
                                <td>
                                  <input
                                    type="text"
                                    value={scorer.playerName}
                                    onChange={(e) => updateScorer('away', index, 'playerName', e.target.value)}
                                    placeholder="Player name"
                                    disabled={scorer.isPenaltyTry}
                                    style={{ width: '100%', padding: '5px' }}
                                  />
                                </td>
                                <td>
                                  <select
                                    value={scorer.scoreType}
                                    onChange={(e) => updateScorer('away', index, 'scoreType', e.target.value)}
                                    style={{ width: '100%', padding: '5px' }}
                                  >
                                    <option value="try">Try</option>
                                    <option value="conversion">Conversion</option>
                                    <option value="penalty">Penalty</option>
                                    <option value="dropGoal">Drop Goal</option>
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={scorer.points}
                                    onChange={(e) => updateScorer('away', index, 'points', parseInt(e.target.value))}
                                    min="0"
                                    style={{ width: '60px', padding: '5px' }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={scorer.minute}
                                    onChange={(e) => updateScorer('away', index, 'minute', e.target.value)}
                                    placeholder="Min"
                                    min="1"
                                    max="100"
                                    style={{ width: '60px', padding: '5px' }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={scorer.isPenaltyTry}
                                    onChange={(e) => updateScorer('away', index, 'isPenaltyTry', e.target.checked)}
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn-danger admin-btn-small"
                                    onClick={() => removeScorer('away', index)}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                          Total Points: {calculateTotalPoints(resultData.awayScorers)}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: '#666', fontSize: '0.9em', marginTop: '10px' }}>No scorers added yet</p>
                    )}
                  </div>
                )}

                <div className="admin-form-actions">
                  <button type="submit" className="admin-btn admin-btn-primary">
                    {editingFixture.result ? 'Update Result' : 'Add Result'}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setEditingFixture(null)}
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
                  <th>Date</th>
                  <th>Home Team</th>
                  <th>Away Team</th>
                  <th>Venue</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="darkText">
                {fixtures.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                      No fixtures found for your team
                    </td>
                  </tr>
                ) : (
                  fixtures.map(fixture => (
                    <tr key={fixture.id}>
                      <td>{formatDate(fixture.date)}</td>
                      <td>
                        {fixture.homeTeamName}
                        {fixture.isHomeTeam && <span style={{ color: '#00a755' }}> ✓</span>}
                      </td>
                      <td>
                        {fixture.awayTeamName}
                        {!fixture.isHomeTeam && <span style={{ color: '#00a755' }}> ✓</span>}
                      </td>
                      <td>{fixture.venue}</td>
                      <td>
                        {fixture.result ? (
                          <strong>{fixture.result.homeScore} - {fixture.result.awayScore}</strong>
                        ) : (
                          <em style={{ color: '#999' }}>No result</em>
                        )}
                      </td>
                      <td>
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-small"
                          onClick={() => handleEditResult(fixture)}
                        >
                          {fixture.result ? 'Edit' : 'Add'} Result
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamAdmin;
