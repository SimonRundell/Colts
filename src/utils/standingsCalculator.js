/**
 * @file standingsCalculator.js
 * @description League standings calculation utility based on match results
 * @module utils/standingsCalculator
 * 
 * Calculates team standings (points, wins, losses, etc.) from fixture results.
 * Implements rugby union scoring rules including bonus points.
 * Only calculates standings for the current season.
 */

import { crudRequest } from './authHelpers';

// Load current season from config
let CURRENT_SEASON = '2025-26'; // Default fallback

// Fetch config on module load
fetch('/.config.json')
  .then(response => response.json())
  .then(config => {
    CURRENT_SEASON = config.currentSeason || CURRENT_SEASON;
  })
  .catch(error => {
    console.warn('Could not load current season from config.json, using default:', error);
  });

/**
 * Get the current season from config
 * @returns {string} The current season identifier (e.g., "2025-26")
 */
export const getCurrentSeason = () => CURRENT_SEASON;

/**
 * Calculate standings for a specific league
 * @async
 * @param {number} leagueID - The league ID to calculate standings for
 * @param {string} leagueSeason - The season to calculate for (e.g., "2025-26")
 * @returns {Promise<{success: boolean, message: string}>} Result of calculation
 * @description Recalculates league standings from all completed fixtures.
 * Implements rugby union scoring:
 * - Win: 4 points
 * - Draw: 2 points
 * - Loss within 7 points: 1 bonus point
 * - 4+ tries scored: 1 bonus point
 * Only calculates for current season.
 */
export const calculateLeagueStandings = async (leagueID, leagueSeason) => {
  try {
    // Only calculate for current season
    if (leagueSeason !== CURRENT_SEASON) {
      console.log(`Skipping standings calculation for ${leagueSeason} (not current season)`);
      return { success: true, message: 'Not current season' };
    }

    // Get all fixtures for this league
    const fixturesResult = await crudRequest('read', {
      table: 'tblfixtures'
    });

    if (fixturesResult.status_code !== 200) {
      throw new Error('Failed to fetch fixtures');
    }

    const allFixtures = fixturesResult.data.records || fixturesResult.data;
    const leagueFixtures = allFixtures.filter(f => f.leagueID === leagueID && f.status === 2); // Only completed matches

    // Get all results
    const resultsResult = await crudRequest('read', {
      table: 'tblresults'
    });

    if (resultsResult.status_code !== 200) {
      throw new Error('Failed to fetch results');
    }

    const allResults = resultsResult.data.records || resultsResult.data;
    
    // Create a map of results by fixtureID
    const resultsMap = {};
    allResults.forEach(result => {
      resultsMap[result.fixtureID] = result;
    });

    // Get all teams in this league (from fixtures)
    const teamIDs = new Set();
    leagueFixtures.forEach(fixture => {
      teamIDs.add(fixture.homeTeam);
      teamIDs.add(fixture.awayTeam);
    });

    // Initialize standings for each team
    const standings = {};
    teamIDs.forEach(teamID => {
      standings[teamID] = {
        teamID,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDifference: 0,
        bonusPoints: 0,
        points: 0
      };
    });

    // Calculate standings from completed fixtures with results
    leagueFixtures.forEach(fixture => {
      const result = resultsMap[fixture.id];
      if (!result) return; // Skip if no result

      const homeTeam = standings[fixture.homeTeam];
      const awayTeam = standings[fixture.awayTeam];

      const homeScore = parseInt(result.homeScore) || 0;
      const awayScore = parseInt(result.awayScore) || 0;

      // Update played
      homeTeam.played++;
      awayTeam.played++;

      // Update points for/against
      homeTeam.pointsFor += homeScore;
      homeTeam.pointsAgainst += awayScore;
      awayTeam.pointsFor += awayScore;
      awayTeam.pointsAgainst += homeScore;

      // Determine win/draw/loss and award match points
      if (homeScore > awayScore) {
        // Home win
        homeTeam.won++;
        homeTeam.points += 4;
        awayTeam.lost++;
        
        // Losing bonus point (within 7 points)
        if (awayScore + 7 >= homeScore) {
          awayTeam.bonusPoints++;
          awayTeam.points++;
        }
      } else if (awayScore > homeScore) {
        // Away win
        awayTeam.won++;
        awayTeam.points += 4;
        homeTeam.lost++;
        
        // Losing bonus point (within 7 points)
        if (homeScore + 7 >= awayScore) {
          homeTeam.bonusPoints++;
          homeTeam.points++;
        }
      } else {
        // Draw
        homeTeam.drawn++;
        awayTeam.drawn++;
        homeTeam.points += 2;
        awayTeam.points += 2;
      }

      // Check for 4+ tries bonus point
      try {
        const homeScorers = result.homeScorers ? 
          (typeof result.homeScorers === 'string' ? JSON.parse(result.homeScorers) : result.homeScorers) : [];
        const awayScorers = result.awayScorers ? 
          (typeof result.awayScorers === 'string' ? JSON.parse(result.awayScorers) : result.awayScorers) : [];

        const homeTries = homeScorers.filter(s => s.scoreType === 'try').length;
        const awayTries = awayScorers.filter(s => s.scoreType === 'try').length;

        if (homeTries >= 4) {
          homeTeam.bonusPoints++;
          homeTeam.points++;
        }
        if (awayTries >= 4) {
          awayTeam.bonusPoints++;
          awayTeam.points++;
        }
      } catch (err) {
        console.error('Error parsing scorers for bonus points:', err);
      }

      // Calculate points difference
      homeTeam.pointsDifference = homeTeam.pointsFor - homeTeam.pointsAgainst;
      awayTeam.pointsDifference = awayTeam.pointsFor - awayTeam.pointsAgainst;
    });

    // Sort teams by: 1) Points, 2) Points difference, 3) Points for
    const sortedTeams = Object.values(standings).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.pointsDifference !== a.pointsDifference) return b.pointsDifference - a.pointsDifference;
      return b.pointsFor - a.pointsFor;
    });

    // Assign positions
    sortedTeams.forEach((team, index) => {
      team.position = index + 1;
    });

    // Update tblstandings table
    for (const team of sortedTeams) {
      // Check if standing already exists
      const existingResult = await crudRequest('read', {
        table: 'tblstandings'
      });

      const existingStandings = existingResult.status_code === 200 
        ? (existingResult.data.records || existingResult.data) 
        : [];

      const existing = existingStandings.find(
        s => s.leagueID === leagueID && s.teamID === team.teamID
      );

      const standingData = {
        leagueID,
        teamID: team.teamID,
        played: team.played,
        won: team.won,
        drawn: team.drawn,
        lost: team.lost,
        pointsFor: team.pointsFor,
        pointsAgainst: team.pointsAgainst,
        pointsDifference: team.pointsDifference,
        bonusPoints: team.bonusPoints,
        points: team.points
      };

      if (existing) {
        // Update existing standing
        await crudRequest('update', {
          table: 'tblstandings',
          data: standingData,
          conditions: { id: existing.id }
        });
      } else {
        // Create new standing
        await crudRequest('create', {
          table: 'tblstandings',
          data: standingData
        });
      }
    }

    return { success: true, message: 'Standings updated successfully' };
  } catch (error) {
    console.error('Error calculating standings:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Update standings for a specific fixture
 * @async
 * @param {number} fixtureID - The fixture ID that was updated
 * @returns {Promise<{success: boolean, message: string}>} Result of update
 * @description Called after a result is added/updated.
 * Recalculates the entire league standings for the fixture's league.
 */
export const updateStandingsForFixture = async (fixtureID) => {
  try {
    // Get the fixture details
    const fixturesResult = await crudRequest('read', {
      table: 'tblfixtures'
    });

    if (fixturesResult.status_code !== 200) {
      throw new Error('Failed to fetch fixture');
    }

    const fixtures = fixturesResult.data.records || fixturesResult.data;
    const fixture = fixtures.find(f => f.id === fixtureID);

    if (!fixture) {
      throw new Error('Fixture not found');
    }

    // Get the league details
    const leaguesResult = await crudRequest('read', {
      table: 'tblleagues'
    });

    if (leaguesResult.status_code !== 200) {
      throw new Error('Failed to fetch leagues');
    }

    const leagues = leaguesResult.data.records || leaguesResult.data;
    const league = leagues.find(l => l.id === fixture.leagueID);

    if (!league) {
      throw new Error('League not found');
    }

    // Recalculate standings for this league
    return await calculateLeagueStandings(fixture.leagueID, league.leagueSeason);
  } catch (error) {
    console.error('Error updating standings for fixture:', error);
    return { success: false, message: error.message };
  }
};
