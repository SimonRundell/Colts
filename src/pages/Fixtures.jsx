/**
 * @file Fixtures.jsx
 * @description Fixtures page showing upcoming and past matches
 * @module pages/Fixtures
 */

import React, { useState, useEffect } from 'react';
import { publicRead } from '../utils/authHelpers';

/**
 * Fixtures component - displays match schedule
 * 
 * @component
 * @description Shows fixtures organized into upcoming and past matches.
 * Displays comprehensive match information including:
 * - Match date and time
 * - Home and away teams with logos
 * - League and season
 * - Venue location
 * - Match status (scheduled, played, postponed, cancelled)
 * - Scores (for completed matches)
 * 
 * Fixtures are enriched with team and league data for complete display.
 * 
 * @example
 * <Route path="/fixtures" element={<Fixtures />} />
 * 
 * @returns {JSX.Element} Fixtures page with match schedule
 */
function Fixtures() {
  const [upcomingFixtures, setUpcomingFixtures] = useState([]);
  const [pastFixtures, setPastFixtures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFixtures();
  }, []);

  /**
   * Fetches fixtures, teams, and leagues data
   * @async
   * @description Loads and enriches fixtures with team/league information, splits into upcoming/past
   */
  const fetchFixtures = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Step 1: Get all fixtures
      const fixturesResult = await publicRead({
        table: 'tblfixtures'
      });

      if (fixturesResult.status_code !== 200) {
        setError(fixturesResult.message || 'Failed to load fixtures');
        setIsLoading(false);
        return;
      }

      // Step 2: Get all teams
      const teamsResult = await publicRead({
        table: 'tblteams'
      });

      if (teamsResult.status_code !== 200) {
        setError('Failed to load team data');
        setIsLoading(false);
        return;
      }

      // Step 3: Get all leagues
      const leaguesResult = await publicRead({
        table: 'tblleagues'
      });

      if (leaguesResult.status_code !== 200) {
        setError('Failed to load league data');
        setIsLoading(false);
        return;
      }

      // Parse data
      let fixtures = fixturesResult.data.records || fixturesResult.data;
      let teams = teamsResult.data.records || teamsResult.data;
      let leagues = leaguesResult.data.records || leaguesResult.data;

      // Create lookup maps
      const teamMap = {};
      teams.forEach(team => {
        teamMap[team.id] = {
          name: team.teamName,
          club: team.teamClub,
          logo: team.teamLogo
        };
      });

      const leagueMap = {};
      leagues.forEach(league => {
        leagueMap[league.id] = {
          name: league.leagueName,
          season: league.leagueSeason
        };
      });

      // Enrich fixtures with team and league data
      const enrichedFixtures = fixtures.map(fixture => ({
        id: fixture.id,
        date: fixture.date,
        venue: fixture.venue,
        status: fixture.status,
        leagueName: leagueMap[fixture.leagueID]?.name || 'Unknown League',
        leagueSeason: leagueMap[fixture.leagueID]?.season || '',
        homeTeamName: teamMap[fixture.homeTeam]?.name || 'Unknown Team',
        homeTeamClub: teamMap[fixture.homeTeam]?.club || '',
        homeTeamLogo: teamMap[fixture.homeTeam]?.logo || null,
        awayTeamName: teamMap[fixture.awayTeam]?.name || 'Unknown Team',
        awayTeamClub: teamMap[fixture.awayTeam]?.club || '',
        awayTeamLogo: teamMap[fixture.awayTeam]?.logo || null
      }));

      const now = new Date();
      
      // Split into upcoming and past fixtures
      const upcoming = enrichedFixtures.filter(f => new Date(f.date) >= now && f.status === 0);
      const past = enrichedFixtures.filter(f => new Date(f.date) < now || f.status >= 2);
      
      // Sort upcoming ascending (soonest first), past descending (most recent first)
      upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
      past.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setUpcomingFixtures(upcoming);
      setPastFixtures(past);
      
    } catch (err) {
      console.error('Error fetching fixtures:', err);
      setError('Failed to load fixtures. Please try again later.');
    } finally {
      setIsLoading(false);
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
    const labels = {
      0: 'Scheduled',
      1: 'In Progress',
      2: 'Completed',
      3: 'Cancelled',
      4: 'Abandoned'
    };
    return labels[status] || 'Unknown';
  };

  const FixtureCard = ({ fixture }) => (
    <div className="fixture-card">
      <div className="fixture-header">
        <span className="fixture-league">{fixture.leagueName}</span>
        <span className={`fixture-status status-${fixture.status}`}>
          {getStatusLabel(fixture.status)}
        </span>
      </div>
      
      <div className="fixture-match">
        <div className="fixture-team">
          {fixture.homeTeamLogo && (
            <img 
              src={fixture.homeTeamLogo} 
              alt={`${fixture.homeTeamName} logo`}
              className="team-logo"
            />
          )}
          <span className="team-name">{fixture.homeTeamName}</span>
        </div>
        
        <div className="fixture-vs">vs</div>
        
        <div className="fixture-team">
          {fixture.awayTeamLogo && (
            <img 
              src={fixture.awayTeamLogo} 
              alt={`${fixture.awayTeamName} logo`}
              className="team-logo"
            />
          )}
          <span className="team-name">{fixture.awayTeamName}</span>
        </div>
      </div>
      
      <div className="fixture-details">
        <div className="fixture-date">{formatDate(fixture.date)}</div>
        <div className="fixture-venue">{fixture.venue}</div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="page-content">
        {/* <h2>Fixtures</h2> */}
        <div className="fixtures-loading">Loading fixtures...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        {/* <h2>Fixtures</h2> */}
        <div className="fixtures-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* <h2>Fixtures</h2> */}
      
      <div className="fixtures-container">
        <section className="fixtures-section">
          <h3>Upcoming Fixtures</h3>
          <div className="fixtures-list">
            {upcomingFixtures.length === 0 ? (
              <p className="no-fixtures">No upcoming fixtures scheduled.</p>
            ) : (
              upcomingFixtures.map(fixture => (
                <FixtureCard key={fixture.id} fixture={fixture} />
              ))
            )}
          </div>
        </section>
        
        <section className="fixtures-section">
          <h3>Past Fixtures</h3>
          <div className="fixtures-list">
            {pastFixtures.length === 0 ? (
              <p className="no-fixtures">No past fixtures to display.</p>
            ) : (
              pastFixtures.map(fixture => (
                <FixtureCard key={fixture.id} fixture={fixture} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Fixtures;
