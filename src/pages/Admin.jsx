/**
 * @file Admin.jsx
 * @description Full administration panel for system administrators
 * @module pages/Admin
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils/authHelpers';
import UsersAdmin from '../components/admin/UsersAdmin';
import TeamsAdmin from '../components/admin/TeamsAdmin';
import LeaguesAdmin from '../components/admin/LeaguesAdmin';
import FixturesAdmin from '../components/admin/FixturesAdmin';
import ResultsAdmin from '../components/admin/ResultsAdmin';

/**
 * Admin component - system administration dashboard
 * 
 * @component
 * @description Full admin panel with tabbed interface for managing all system data.
 * Restricted to users with authority level 2 (full admins).
 * 
 * Features:
 * - Users management tab (create, edit, delete users, manage permissions)
 * - Teams management tab (create, edit, delete teams, manage team data)
 * - Fixtures management tab (create, edit, delete fixtures, schedule matches)
 * - Results management tab (record match results, update scores)
 * - Utilities section (recalculate league standings)
 * 
 * Authority Requirement: authority = 2 (full admin)
 * 
 * @example
 * <ProtectedRoute path="/admin" element={<Admin />} requiredAuthority={2} />
 * 
 * @returns {JSX.Element} Admin dashboard with tabbed management interface
 */
function Admin() {
  const user = getUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  // Only allow full admins (authority = 2)
  if (!user || user.authority !== 2) {
    return (
      <div className="page-content">
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'users', label: 'Users', icon: '👤' },
    { id: 'teams', label: 'Teams', icon: '🏉' },
    { id: 'leagues', label: 'Leagues', icon: '🏆' },
    { id: 'fixtures', label: 'Fixtures', icon: '📅' },
    { id: 'results', label: 'Results', icon: '📊' }
  ];

  return (
    <div className="page-content">
      <h2 className="page-header-title">Administration Panel</h2>
      
      <div className="admin-container">
        <div className="admin-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="admin-content">
          {activeTab === 'users' && <UsersAdmin />}
          {activeTab === 'teams' && <TeamsAdmin />}
          {activeTab === 'leagues' && <LeaguesAdmin />}
          {activeTab === 'fixtures' && <FixturesAdmin />}
          {activeTab === 'results' && <ResultsAdmin />}
        </div>

        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Utilities</h3>
          <button 
            onClick={() => navigate('/recalculate-standings')}
            className="btn btn-secondary"
            style={{ marginTop: '10px' }}
          >
            🔄 Recalculate League Standings
          </button>
        </div>
      </div>
    </div>
  );
}

export default Admin;
