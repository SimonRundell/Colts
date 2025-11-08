/**
 * @file ResultsAdmin.jsx
 * @description Match results management component for admin panel
 * @module components/admin/ResultsAdmin
 */

import React, { useState, useEffect } from 'react';
import { getUser, crudRequest } from '../../utils/authHelpers';
import { updateStandingsForFixture } from '../../utils/standingsCalculator';

/**
 * ResultsAdmin component - full result management for all fixtures
 * 
 * @component
 * @description Provides comprehensive result recording interface for administrators.
 * Allows full admins to record results for any fixture, unlike TeamAdmin which
 * is restricted to specific team fixtures.
 * 
 * Features:
 * - List all fixtures with match details
 * - Record match results (scores for both teams)
 * - Add try scorers with player names
 * - Edit existing results
 * - Match status management (scheduled, underway, completed, cancelled, abandoned)
 * - Automatic standings update on result save
 * - Visual indicators for fixtures with/without results
 * 
 * Result Recording:
 * - Home and away scores
 * - Multiple try scorers per team
 * - Match status selection
 * - Automatic standings recalculation via standingsCalculator
 * 
 * Authority Requirement: authority = 2 (full admin only)
 * 
 * @example
 * // Used within Admin.jsx
 * {activeTab === 'results' && <ResultsAdmin />}
 * 
 * @returns {JSX.Element} Results management interface
 */
function ResultsAdmin() {
  const user = getUser();
  const [fixtures, setFixtures] = useState([]);
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
   * Fetches fixtures, teams, leagues, and existing results
   * @async
   * @description Loads all data and enriches fixtures with result information
   */
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Get all fixtures
      const fixturesResult = await crudRequest('read', {
        table: 'tblfixtures',
        orderBy: 'date DESC'
      });

      if (fixturesResult.status_code !== 200) {
        setError('Failed to load fixtures');
        return;
      }

      // Get all teams
      const teamsResult = await crudRequest('read', {
        table: 'tblteams'
      });

      if (teamsResult.status_code !== 200) {
        setError('Failed to load team data');
        return;
      }

      // Get all leagues
      const leaguesResult = await crudRequest('read', {
        table: 'tblleagues'
      });

      if (leaguesResult.status_code !== 200) {
        setError('Failed to load league data');
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

      // Process data
      let allFixtures = fixturesResult.data.records || fixturesResult.data;
      let teamsData = teamsResult.data.records || teamsResult.data;
      let leaguesData = leaguesResult.data.records || leaguesResult.data;

      const teamMap = {};
      teamsData.forEach(team => {
        teamMap[team.id] = team.teamName;
      });

      const leagueMap = {};
      leaguesData.forEach(league => {
        leagueMap[league.id] = {
          name: league.leagueName,
          season: league.leagueSeason
        };
      });

      // Enrich all fixtures with team/league names and results
      const enrichedFixtures = allFixtures.map(fixture => ({
        ...fixture,
        homeTeamName: teamMap[fixture.homeTeam] || 'Unknown',
        awayTeamName: teamMap[fixture.awayTeam] || 'Unknown',
        leagueName: leagueMap[fixture.leagueID]?.name || 'Unknown',
        leagueSeason: leagueMap[fixture.leagueID]?.season || '',
        result: resultsMap[fixture.id] || null
      }));

      setFixtures(enrichedFixtures);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      scoreType: 'try', // try, conversion, penalty, dropGoal
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

  const sendResultNotifications = async (fixture, teamsData) => {
    try {
      // Get all users with authority = 0 and authorityOver matching home or away team
      const usersResult = await crudRequest('read', {
        table: 'tblusers'
      });

      if (usersResult.status_code !== 200) {
        console.error('Failed to fetch users for notifications');
        return;
      }

      const allUsers = usersResult.data.records || usersResult.data;
      const relevantUsers = allUsers.filter(user => 
        user.authority === 0 && 
        (user.authorityOver === fixture.homeTeam || user.authorityOver === fixture.awayTeam)
      );

      if (relevantUsers.length === 0) {
        console.log('No users to notify for this result');
        return;
      }

      // Load email template
      const templateResponse = await fetch('/templates/result-notification.html');
      let emailTemplate = await templateResponse.text();

      // Get team details
      const homeTeamData = teamsData.find(t => t.id === fixture.homeTeam);
      const awayTeamData = teamsData.find(t => t.id === fixture.awayTeam);

      // Format date
      const matchDate = new Date(fixture.date).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Build home team logo HTML
      const homeTeamLogo = homeTeamData?.teamLogo 
        ? `<img src="${homeTeamData.teamLogo}" alt="${fixture.homeTeamName}" class="team-logo" />`
        : '';

      // Build away team logo HTML
      const awayTeamLogo = awayTeamData?.teamLogo 
        ? `<img src="${awayTeamData.teamLogo}" alt="${fixture.awayTeamName}" class="team-logo" />`
        : '';

      // Build scorers sections
      const buildScorersSection = (scorers, teamName) => {
        if (!scorers || scorers.length === 0) return '';
        
        const scorersHTML = scorers.map(scorer => 
          `<div class="scorer-item">
            <strong>${scorer.name}</strong> - ${scorer.points} points (${scorer.type}${scorer.minute ? ` at ${scorer.minute}'` : ''})
          </div>`
        ).join('');

        return `
          <div class="scorers-section">
            <h3>${teamName} Scorers:</h3>
            ${scorersHTML}
          </div>
        `;
      };

      const homeScorersSection = buildScorersSection(resultData.homeScorers, fixture.homeTeamName);
      const awayScorersSection = buildScorersSection(resultData.awayScorers, fixture.awayTeamName);

      // Send email to each relevant user
      for (const follower of relevantUsers) {
        const userTeamName = follower.authorityOver === fixture.homeTeam 
          ? fixture.homeTeamName 
          : fixture.awayTeamName;

        // Customize email for this user
        let personalizedEmail = emailTemplate
          .replace(/{{firstName}}/g, follower.firstName)
          .replace(/{{teamName}}/g, userTeamName)
          .replace(/{{homeTeamName}}/g, fixture.homeTeamName)
          .replace(/{{awayTeamName}}/g, fixture.awayTeamName)
          .replace(/{{homeScore}}/g, resultData.homeScore)
          .replace(/{{awayScore}}/g, resultData.awayScore)
          .replace(/{{homeTeamLogo}}/g, homeTeamLogo)
          .replace(/{{awayTeamLogo}}/g, awayTeamLogo)
          .replace(/{{leagueName}}/g, fixture.leagueName)
          .replace(/{{leagueSeason}}/g, fixture.leagueSeason)
          .replace(/{{matchDate}}/g, matchDate)
          .replace(/{{venue}}/g, fixture.venue)
          .replace(/{{homeScorersSection}}/g, homeScorersSection)
          .replace(/{{awayScorersSection}}/g, awayScorersSection);

        // Send email
        const { getApiUrl } = await import('../../utils/authHelpers');
        const emailResponse = await fetch(`${getApiUrl()}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: [follower.login],
            subject: `Match Result: ${fixture.homeTeamName} vs ${fixture.awayTeamName}`,
            htmlBody: personalizedEmail
          })
        });

        const emailResult = await emailResponse.json();
        if (emailResult.status_code === 200) {
          console.log(`Notification sent to ${follower.login}`);
        } else {
          console.error(`Failed to send notification to ${follower.login}:`, emailResult.message);
        }
      }

      console.log(`Sent ${relevantUsers.length} result notification(s)`);
    } catch (err) {
      console.error('Error sending result notifications:', err);
      // Don't throw - we don't want to fail the result submission if email fails
    }
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
          await fetchData();
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

            // Send email notifications to followers
            console.log('Sending result notifications...');
            try {
              // Get teams data for logos
              const teamsResult = await crudRequest('read', {
                table: 'tblteams'
              });
              const teamsData = teamsResult.status_code === 200 
                ? (teamsResult.data.records || teamsResult.data) 
                : [];
              
              await sendResultNotifications(editingFixture, teamsData);
            } catch (notificationErr) {
              console.error('Error sending notifications:', notificationErr);
              // Don't fail the whole operation if notifications fail
            }
          }
          setSuccess(operation === 'update' ? 'Result updated successfully' : 'Result added successfully');
        }
        
        setEditingFixture(null);
        // Refresh the fixtures list to show the new result
        await fetchData();
      } else {
        setError(result.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving result:', err);
      setError('Failed to save result');
    }
  };

  const handleDeleteResult = async (fixture) => {
    if (!window.confirm(`Are you sure you want to delete the result for ${fixture.homeTeamName} vs ${fixture.awayTeamName}?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const result = await crudRequest('delete', {
        table: 'tblresults',
        conditions: { fixtureID: fixture.id }
      });

      if (result.status_code === 200) {
        setSuccess('Result deleted successfully');
        await fetchData();
      } else {
        setError(result.message || 'Failed to delete result');
      }
    } catch (err) {
      console.error('Error deleting result:', err);
      setError('Failed to delete result');
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

  const getStatusLabel = (status) => {
    const labels = {
      0: 'Scheduled',
      1: 'Underway',
      2: 'Completed',
      3: 'Cancelled',
      4: 'Abandoned'
    };
    return labels[status] || 'Unknown';
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
    return <div className="admin-loading">Loading results...</div>;
  }

  return (
    <div>
      <div className="admin-header">
        <h3>Manage Results</h3>
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
              <th>League</th>
              <th>Home Team</th>
              <th>Away Team</th>
              <th>Venue</th>
              <th>Status</th>
              <th>Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="darkText">
            {fixtures.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                  No fixtures found
                </td>
              </tr>
            ) : (
              fixtures.map(fixture => (
                <tr key={fixture.id}>
                  <td>{formatDate(fixture.date)}</td>
                  <td>
                    {fixture.leagueName}
                    {fixture.leagueSeason && <span style={{ fontSize: '0.9em', color: '#666' }}> ({fixture.leagueSeason})</span>}
                  </td>
                  <td><strong>{fixture.homeTeamName}</strong></td>
                  <td><strong>{fixture.awayTeamName}</strong></td>
                  <td>{fixture.venue}</td>
                  <td>
                    <span style={{ 
                      color: getStatusColor(fixture.status),
                      fontWeight: 'bold'
                    }}>
                      {getStatusLabel(fixture.status)}
                    </span>
                  </td>
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
                      style={{ marginRight: '8px' }}
                    >
                      {fixture.result ? 'Edit' : 'Add'} Result
                    </button>
                    {fixture.result && (
                      <button
                        className="admin-btn admin-btn-danger admin-btn-small"
                        onClick={() => handleDeleteResult(fixture)}
                      >
                        Delete
                      </button>
                    )}
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

export default ResultsAdmin;
