/**
 * @file Layout.jsx
 * @description Main layout component with header, navigation, and content area
 * @module Layout
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import ThreeCardImageFader from './components/ThreeCardImageFader.jsx';
import Menu from './menu.jsx';

/**
 * Layout Component
 * 
 * Provides consistent layout structure for all pages.
 * 
 * Layout Structure:
 * - Header with image carousel (ThreeCardImageFader)
 * - Title block with Devon RFU logo
 * - Navigation menu
 * - Main content area (Outlet for nested routes)
 * 
 * @component
 * @returns {React.ReactElement} The application layout wrapper
 * 
 * @example
 * // Used as parent route in App.jsx
 * <Route path="/" element={<Layout />}>
 *   <Route index element={<Home />} />
 *   <Route path="about" element={<About />} />
 * </Route>
 */
function Layout() {
  return (
    <>
      <div>
        <ThreeCardImageFader 
          configSource="images.json"
          defaultIntervalMs={8000}
        />
        <div className="title-block">
          <div className="app-title">
            Devon RFU Colts 
            <img src="/assets/devonrfu-logo.svg" alt="Devon RFU Logo" />
          </div>
          <div className="top-menu">
            <Menu />
          </div>
        </div>
      </div>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default Layout;
