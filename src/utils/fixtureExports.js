/**
 * @file fixtureExports.js
 * @description Utilities for exporting fixtures to PDF and iCalendar formats
 * @module utils/fixtureExports
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { createEvents } from 'ics';
import { formatDate, formatTime } from './dateHelpers';

/**
 * Generate PDF with league fixtures (one page per league)
 * @param {Array} fixtures - Array of fixture objects
 * @param {Array} leagues - Array of league objects
 * @param {Array} teams - Array of team objects
 * @param {string} currentSeason - Current season identifier
 * @description Creates a PDF document with one page per league showing all fixtures.
 * Suitable for printing and posting on noticeboards.
 */
export const generateLeagueFixturesPDF = (fixtures, leagues, teams, currentSeason) => {
  const doc = new jsPDF();
  
  // Create team lookup
  const teamMap = {};
  teams.forEach(team => {
    teamMap[team.id] = team.teamName;
  });

  // Filter leagues for current season
  const currentSeasonLeagues = leagues.filter(league => league.leagueSeason === currentSeason);

  currentSeasonLeagues.forEach((league, leagueIndex) => {
    // Add new page for each league (except first)
    if (leagueIndex > 0) {
      doc.addPage();
    }

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`${league.leagueName} - ${league.leagueSeason}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Devon RFU Colts Fixtures', 105, 28, { align: 'center' });

    // Filter fixtures for this league
    const leagueFixtures = fixtures
      .filter(f => f.leagueID === league.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Prepare table data
    const tableData = leagueFixtures.map(fixture => {
      const homeTeam = teamMap[fixture.homeTeam] || 'Unknown';
      const awayTeam = teamMap[fixture.awayTeam] || 'Unknown';
      const fixtureDate = new Date(fixture.date);
      
      return [
        formatDate(fixtureDate),
        formatTime(fixtureDate),
        `${homeTeam} vs ${awayTeam}`,
        fixture.venue || 'TBD'
      ];
    });

    // Generate table
    doc.autoTable({
      startY: 35,
      head: [['Date', 'Time', 'Match', 'Venue']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [0, 167, 85], // Devon RFU green
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 80 },
        3: { cellWidth: 60 }
      },
      margin: { left: 10, right: 10 }
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, pageHeight - 10, { align: 'center' });
  });

  // Save the PDF
  doc.save(`Devon_RFU_Colts_Fixtures_${currentSeason}.pdf`);
};

/**
 * Generate iCalendar (.ics) file for a specific team's fixtures
 * @param {Array} fixtures - Array of fixture objects
 * @param {number} teamId - ID of the team to generate calendar for
 * @param {string} teamName - Name of the team
 * @param {Object} teamMap - Map of team IDs to team names
 * @description Creates an .ics file with all fixtures for a specific team.
 * Users can import this into their calendar applications.
 */
export const generateTeamCalendar = (fixtures, teamId, teamName, teamMap) => {
  // Filter fixtures for this team
  const teamFixtures = fixtures.filter(
    f => f.homeTeam === teamId || f.awayTeam === teamId
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Create events array for ics library
  const events = teamFixtures.map(fixture => {
    const homeTeam = teamMap[fixture.homeTeam] || 'Unknown';
    const awayTeam = teamMap[fixture.awayTeam] || 'Unknown';
    const fixtureDate = new Date(fixture.date);
    
    // Calculate end time (assume 2 hours duration)
    const endDate = new Date(fixtureDate.getTime() + (2 * 60 * 60 * 1000));

    // Determine if this team is home or away
    const isHome = fixture.homeTeam === teamId;
    const opponent = isHome ? awayTeam : homeTeam;
    const location = fixture.venue || 'TBD';

    return {
      start: [
        fixtureDate.getFullYear(),
        fixtureDate.getMonth() + 1, // ics months are 1-indexed
        fixtureDate.getDate(),
        fixtureDate.getHours(),
        fixtureDate.getMinutes()
      ],
      end: [
        endDate.getFullYear(),
        endDate.getMonth() + 1,
        endDate.getDate(),
        endDate.getHours(),
        endDate.getMinutes()
      ],
      title: `${homeTeam} vs ${awayTeam}`,
      description: `Devon RFU Colts Match\n${isHome ? 'Home' : 'Away'} vs ${opponent}\nLeague: ${fixture.leagueName}`,
      location: location,
      status: fixture.status === 0 ? 'CONFIRMED' : 'TENTATIVE',
      busyStatus: 'BUSY',
      organizer: { name: 'Devon RFU Colts', email: 'fixtures@devonrfucolts.org' }
    };
  });

  // Generate the .ics file
  createEvents(events, (error, value) => {
    if (error) {
      console.error('Error creating calendar:', error);
      alert('Failed to generate calendar file');
      return;
    }

    // Create blob and download
    const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${teamName.replace(/\s+/g, '_')}_Fixtures.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  });
};

/**
 * Get current season from config
 * @async
 * @returns {Promise<string>} Current season identifier
 */
export const getCurrentSeason = async () => {
  try {
    const response = await fetch('/.config.json');
    const config = await response.json();
    return config.currentSeason || '2025-26';
  } catch (error) {
    console.error('Failed to load config:', error);
    return '2025-26'; // fallback
  }
};
