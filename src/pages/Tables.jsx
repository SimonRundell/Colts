/**
 * @file Tables.jsx
 * @description League standings/tables page displaying team rankings
 * @module pages/Tables
 */

import React, { useState, useEffect } from 'react';
import { publicRead } from '../utils/authHelpers';

/**
 * Tables component - displays league standings
 * 
 * @component
 * @description Shows league tables with team rankings, organized by league.
 * Displays comprehensive statistics including:
 * - Position (calculated dynamically based on points, points difference, points for)
 * - Team name with logo
 * - Played, Won, Drawn, Lost, Bonus points
 * - Points For, Points Against, Points Difference
 * - Total Points
 * 
 * Sorting priority: 1) Points, 2) Points difference, 3) Points for
 * 
 * @example
 * <Route path="/tables" element={<Tables />} />
 * 
 * @returns {JSX.Element} Tables page with league standings
 */
function Tables() {
  const [standings, setStandings] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStandings();
  }, []);

  /**
   * Fetches standings, leagues, and teams data
   * @async
   * @description Loads all required data for displaying league tables
   */
  const fetchStandings = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Fetch standings
      const standingsResult = await publicRead({
        table: 'tblstandings'
      });

      // Fetch leagues
      const leaguesResult = await publicRead({
        table: 'tblleagues'
      });

      // Fetch teams
      const teamsResult = await publicRead({
        table: 'tblteams'
      });

      if (standingsResult.status_code === 200) {
        const standingsData = standingsResult.data.records || standingsResult.data;
        setStandings(standingsData);
      }

      if (leaguesResult.status_code === 200) {
        const leaguesData = leaguesResult.data.records || leaguesResult.data;
        setLeagues(leaguesData);
      }

      if (teamsResult.status_code === 200) {
        const teamsData = teamsResult.data.records || teamsResult.data;
        setTeams(teamsData);
      }
    } catch (err) {
      console.error('Error fetching standings:', err);
      setError('Failed to load standings data');
    } finally {
      setIsLoading(false);
    }
  };

  // Group standings by league
  const standingsByLeague = leagues.map(league => {
    const leagueStandings = standings.filter(s => s.leagueID === league.id);
    
    // Sort standings by: 1) Points, 2) Points difference, 3) Points for
    const sortedStandings = leagueStandings
      .map(standing => {
        const team = teams.find(t => t.id === standing.teamID);
        return {
          ...standing,
          teamName: team?.teamName || 'Unknown',
          teamLogo: team?.teamLogo || null
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.pointsDifference !== a.pointsDifference) return b.pointsDifference - a.pointsDifference;
        return b.pointsFor - a.pointsFor;
      })
      .map((standing, index) => ({
        ...standing,
        position: index + 1  // Calculate position dynamically
      }));
    
    return {
      league,
      standings: sortedStandings
    };
  }).filter(item => item.standings.length > 0);

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="tables-loading">Loading standings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="tables-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h2 className="page-header-title">League Tables</h2>
      
      {standingsByLeague.length === 0 ? (
        <p className="no-tables">No league standings available yet.</p>
      ) : (
        standingsByLeague.map(({ league, standings: leagueStandings }) => (
          <div key={league.id} className="league-table-section">
            <h3>
              {league.leagueName}
              {league.leagueSeason && <span style={{ fontSize: '0.9em', color: '#666', marginLeft: '10px' }}>({league.leagueSeason})</span>}
            </h3>
            
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>F</th>
                    <th>A</th>
                    <th>+/-</th>
                    <th>BP</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueStandings.map((standing) => (
                    <tr key={standing.id}>
                      <td className="standings-position"><strong>{standing.position}</strong></td>
                      <td className="standings-team">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {standing.teamLogo && (
                            <img 
                              src={standing.teamLogo} 
                              alt={`${standing.teamName} logo`}
                              style={{ 
                                width: '30px', 
                                height: '30px', 
                                objectFit: 'contain'
                              }}
                            />
                          )}
                          <span><strong>{standing.teamName}</strong></span>
                        </div>
                      </td>
                      <td>{standing.played}</td>
                      <td>{standing.won}</td>
                      <td>{standing.drawn}</td>
                      <td>{standing.lost}</td>
                      <td>{standing.pointsFor}</td>
                      <td>{standing.pointsAgainst}</td>
                      <td>{standing.pointsDifference}</td>
                      <td>{standing.bonusPoints}</td>
                      <td><strong>{standing.points}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Tables;
