/**
 * @file RecalculateStandings.jsx
 * @description Utility page for recalculating league standings and sending notifications
 * @module pages/RecalculateStandings
 */

import React, { useState, useEffect } from 'react';
import { crudRequest, getApiUrl } from '../utils/authHelpers';
import { calculateLeagueStandings } from '../utils/standingsCalculator';

/**
 * RecalculateStandings component - standings recalculation utility
 * 
 * @component
 * @description Admin utility for recalculating all league standings from match results.
 * Useful for fixing data inconsistencies or updating standings after bulk result changes.
 * 
 * Features:
 * - Recalculates standings for all leagues in current season
 * - Updates tblstandings with recalculated data
 * - Sends email notifications to followers about their team's standings
 * - Shows progress and results of recalculation
 * - Displays current season from config
 * 
 * Process:
 * 1. Loads current season from .config.json
 * 2. Fetches all fixtures and results
 * 3. Calculates standings using standingsCalculator
 * 4. Updates database with new standings
 * 5. Sends notifications to team followers
 * 
 * Authority Requirement: authority = 2 (full admin only)
 * 
 * @example
 * <ProtectedRoute path="/recalculate-standings" element={<RecalculateStandings />} requiredAuthority={2} />
 * 
 * @returns {JSX.Element} Recalculation utility page
 */
function RecalculateStandings() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentSeason, setCurrentSeason] = useState('Loading...');

  useEffect(() => {
    // Load current season from config
    const loadConfig = async () => {
      try {
        const response = await fetch('/.config.json');
        const config = await response.json();
        setCurrentSeason(config.currentSeason || '2025-26');
      } catch (err) {
        console.error('Failed to load config:', err);
        setCurrentSeason('2025-26'); // fallback
      }
    };
    loadConfig();
  }, []);

  /**
   * Sends standings update notifications to team followers
   * @async
   * @param {string} currentSeason - Current season identifier (e.g., "2025-26")
   * @description Emails followers their team's current league position and stats
   */
  const sendStandingsNotifications = async (currentSeason) => {
    try {
      console.log('Sending standings notifications...');

      // Get all users with authority = 0 (followers)
      const usersResult = await crudRequest('read', {
        table: 'tblusers'
      });

      if (usersResult.status_code !== 200) {
        console.error('Failed to fetch users for notifications');
        return;
      }

      const allUsers = usersResult.data.records || usersResult.data;
      const followers = allUsers.filter(user => user.authority === 0);

      if (followers.length === 0) {
        console.log('No followers to notify');
        return;
      }

      // Get all leagues for current season
      const leaguesResult = await crudRequest('read', {
        table: 'tblleagues'
      });

      if (leaguesResult.status_code !== 200) {
        console.error('Failed to fetch leagues');
        return;
      }

      const allLeagues = leaguesResult.data.records || leaguesResult.data;
      const currentSeasonLeagues = allLeagues.filter(league => league.leagueSeason === currentSeason);

      // Get standings for all current season leagues
      const standingsResult = await crudRequest('read', {
        table: 'tblstandings'
      });

      if (standingsResult.status_code !== 200) {
        console.error('Failed to fetch standings');
        return;
      }

      const allStandings = standingsResult.data.records || standingsResult.data;

      // Get all teams
      const teamsResult = await crudRequest('read', {
        table: 'tblteams'
      });

      if (teamsResult.status_code !== 200) {
        console.error('Failed to fetch teams');
        return;
      }

      const teams = teamsResult.data.records || teamsResult.data;
      const teamMap = {};
      teams.forEach(team => {
        teamMap[team.id] = team.teamName;
      });

      // Build league tables HTML
      let leagueTablesHTML = '';

      for (const league of currentSeasonLeagues) {
        // Get standings for this league
        const leagueStandings = allStandings
          .filter(standing => standing.leagueID === league.id)
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.pointsDifference !== a.pointsDifference) return b.pointsDifference - a.pointsDifference;
            return b.pointsFor - a.pointsFor;
          });

        if (leagueStandings.length === 0) continue;

        // Build table HTML
        let tableRows = '';
        leagueStandings.forEach((standing, index) => {
          tableRows += `
            <tr>
              <td class="position-cell">${index + 1}</td>
              <td class="team-name">${teamMap[standing.teamID] || 'Unknown'}</td>
              <td>${standing.played}</td>
              <td>${standing.won}</td>
              <td>${standing.drawn}</td>
              <td>${standing.lost}</td>
              <td>${standing.pointsFor}</td>
              <td>${standing.pointsAgainst}</td>
              <td>${standing.pointsDifference}</td>
              <td>${standing.bonusPoints}</td>
              <td><strong>${standing.points}</strong></td>
            </tr>
          `;
        });

        leagueTablesHTML += `
          <div class="league-section">
            <div class="league-title">${league.leagueName}</div>
            <table class="standings-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>PF</th>
                  <th>PA</th>
                  <th>PD</th>
                  <th>BP</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        `;
      }

      // Load email template
      const templateResponse = await fetch('/templates/standings-notification.html');
      let emailTemplate = await templateResponse.text();

      // Format update date
      const updateDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Send email to each follower
      for (const follower of followers) {
        // Customize email for this user
        let personalizedEmail = emailTemplate
          .replace(/{{firstName}}/g, follower.firstName)
          .replace(/{{season}}/g, currentSeason)
          .replace(/{{updateDate}}/g, updateDate)
          .replace(/{{leagueTables}}/g, leagueTablesHTML);

        // Send email
        const emailResponse = await fetch(`${getApiUrl()}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: [follower.login],
            subject: `League Standings Update - ${currentSeason} Season`,
            htmlBody: personalizedEmail
          })
        });

        const emailResult = await emailResponse.json();
        if (emailResult.status_code === 200) {
          console.log(`Standings notification sent to ${follower.login}`);
        } else {
          console.error(`Failed to send standings notification to ${follower.login}:`, emailResult.message);
        }
      }

      console.log(`Sent ${followers.length} standings notification(s)`);
    } catch (err) {
      console.error('Error sending standings notifications:', err);
      // Don't throw - we don't want to fail the recalculation if email fails
    }
  };

  const recalculateAll = async () => {
    setIsProcessing(true);
    setMessage('');
    setError('');

    try {
      // Get all leagues
      const leaguesResult = await crudRequest('read', {
        table: 'tblleagues'
      });

      if (leaguesResult.status_code !== 200) {
        throw new Error('Failed to fetch leagues');
      }

      const leagues = leaguesResult.data.records || leaguesResult.data;
      let successCount = 0;
      let skipCount = 0;
      let currentSeasonProcessed = null;

      for (const league of leagues) {
        console.log(`Recalculating standings for ${league.leagueName} (${league.leagueSeason})...`);
        const result = await calculateLeagueStandings(league.id, league.leagueSeason);
        
        if (result.success) {
          if (result.message === 'Not current season') {
            skipCount++;
          } else {
            successCount++;
            currentSeasonProcessed = league.leagueSeason;
          }
        }
      }

      // Send email notifications to all followers if current season was updated
      if (successCount > 0 && currentSeasonProcessed) {
        console.log('Sending standings notifications to followers...');
        try {
          await sendStandingsNotifications(currentSeasonProcessed);
          setMessage(`Recalculation complete! Updated ${successCount} league(s), skipped ${skipCount} non-current season(s). Email notifications sent to followers.`);
        } catch (emailErr) {
          console.error('Error sending notifications:', emailErr);
          setMessage(`Recalculation complete! Updated ${successCount} league(s), skipped ${skipCount} non-current season(s). Note: Some email notifications may have failed.`);
        }
      } else {
        setMessage(`Recalculation complete! Updated ${successCount} league(s), skipped ${skipCount} non-current season(s).`);
      }
    } catch (err) {
      console.error('Error recalculating standings:', err);
      setError('Failed to recalculate standings: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-content">
      <div className="admin-container">
        <h1>Recalculate League Standings</h1>
        
        <div className="admin-section">
          <p>This will recalculate standings for all leagues in the current season ({currentSeason}) based on completed match results.</p>
          <p>Note that recalculating will trigger email notifications to all followers of the affected leagues. Please only
            proceed when you are sure all results are in as the notifications cannot be retracted and may cause confusion if based
            on incomplete data.
          </p>
          
          <button 
            onClick={recalculateAll} 
            disabled={isProcessing}
            className="btn btn-primary"
            style={{ marginTop: '20px' }}
          >
            {isProcessing ? 'Recalculating...' : 'Recalculate All Standings'}
          </button>

          {message && (
            <div className="success-message" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px' }}>
              {message}
            </div>
          )}

          {error && (
            <div className="error-message" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
              {error}
            </div>
          )}
        </div>

        <div className="admin-section" style={{ marginTop: '30px' }}>
          <h3>How Standings Are Calculated</h3>
          <ul>
            <li>Only completed matches (status = 2) are counted</li>
            <li>Only current season ({currentSeason}) leagues are calculated</li>
            <li>Win: 4 points</li>
            <li>Draw: 2 points</li>
            <li>Loss: 0 points</li>
            <li>Bonus: +1 point for scoring 4 or more tries</li>
            <li>Bonus: +1 point for losing by 7 points or less</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RecalculateStandings;
