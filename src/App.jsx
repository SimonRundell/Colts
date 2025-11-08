/**
 * @file App.jsx
 * @description Main application component with routing configuration
 * @module App
 */

import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Layout from './Layout.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Tables from './pages/Tables.jsx'
import Fixtures from './pages/Fixtures.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Verify from './pages/Verify.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Profile from './pages/Profile.jsx'
import Admin from './pages/Admin.jsx'
import TeamAdmin from './pages/TeamAdmin.jsx'
import RecalculateStandings from './pages/RecalculateStandings.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

/**
 * App Component
 * 
 * Root application component that defines routing structure.
 * 
 * Route Structure:
 * - Public routes: /, /about, /tables, /fixtures, /login, /register, /verify, /forgot-password, /reset-password
 * - Protected routes: /profile (all authenticated users), /admin (authority ≥ 2), /team-admin (authority ≥ 1)
 * 
 * Uses React Router v7 with nested routes under Layout component for consistent navigation.
 * 
 * @component
 * @returns {React.ReactElement} The root application with routing
 */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="tables" element={<Tables />} />
          <Route path="fixtures" element={<Fixtures />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="verify" element={<Verify />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route 
            path="profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin" 
            element={
              <ProtectedRoute requiredAuthority={2}>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="team-admin" 
            element={
              <ProtectedRoute requiredAuthority={1}>
                <TeamAdmin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="recalculate-standings" 
            element={
              <ProtectedRoute requiredAuthority={2}>
                <RecalculateStandings />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
