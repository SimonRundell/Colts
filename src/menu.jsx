/**
 * @file menu.jsx
 * @description Navigation menu component with responsive mobile menu and authentication state
 * @module menu
 */

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAuthenticated, getUser, clearAuth } from "./utils/authHelpers";

/**
 * MenuItem Component
 * 
 * Individual menu item with hover state and navigation
 * 
 * @component
 * @param {Object} props
 * @param {string} props.to - Navigation destination path
 * @param {React.ReactNode} props.children - Menu item content
 * @param {Function} props.onClick - Click handler
 * @returns {React.ReactElement} A styled navigation link
 */
function MenuItem({ to, children, onClick }) {
    const [hover, setHover] = React.useState(false);
    return (
        <Link
            to={to}
            className={`menu-item${hover ? " menu-item-hover" : ""}`}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={onClick}
        >
            {children}
        </Link>
    );
}

/**
 * Menu Component
 * 
 * Main navigation menu with responsive design.
 * Features hamburger menu for mobile, authentication-aware display.
 * 
 * Menu Items:
 * - Public: Home, About, Tables, Fixtures
 * - Authenticated: User's name (links to /profile), Admin link (if authority ≥ 1), Logout
 * - Unauthenticated: Login
 * 
 * State Management:
 * - Listens for localStorage changes (login/logout from other tabs)
 * - Polls authentication state every second
 * - Updates UI in real-time
 * 
 * @component
 * @returns {React.ReactElement} The navigation menu
 */
export default function Menu() {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [authenticated, setAuthenticated] = React.useState(isAuthenticated());
    const [user, setUser] = React.useState(getUser());
    const navigate = useNavigate();

    /**
     * Toggle mobile menu open/closed
     */
    const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
    
    /**
     * Close mobile menu
     */
    const closeMenu = () => setMobileMenuOpen(false);

    // Update auth state when component mounts or storage changes
    React.useEffect(() => {
        const updateAuthState = () => {
            setAuthenticated(isAuthenticated());
            setUser(getUser());
        };

        // Listen for storage changes (login/logout from other tabs)
        window.addEventListener('storage', updateAuthState);
        
        // Also check periodically for changes
        const interval = setInterval(updateAuthState, 1000);

        return () => {
            window.removeEventListener('storage', updateAuthState);
            clearInterval(interval);
        };
    }, []);

    /**
     * Handle user logout
     * Clears authentication data and redirects to home
     */
    const handleLogout = () => {
        clearAuth();
        setAuthenticated(false);
        setUser(null);
        closeMenu();
        navigate('/');
    };

    return (
        <>
            {/* Hamburger button - only visible on mobile */}
            <button 
                className="hamburger-menu" 
                onClick={toggleMenu}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
            >
                <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
                <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
                <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            </button>

            {/* Menu - desktop horizontal, mobile dropdown */}
            <nav className={`menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                <MenuItem to="/" onClick={closeMenu}>Home</MenuItem>
                <MenuItem to="/about" onClick={closeMenu}>About</MenuItem>
                <MenuItem to="/tables" onClick={closeMenu}>Tables</MenuItem>
                <MenuItem to="/fixtures" onClick={closeMenu}>Fixtures</MenuItem>
                
                {authenticated ? (
                    <>
                        <Link 
                            to="/profile" 
                            className="menu-item user-info"
                            onClick={closeMenu}
                        >
                            {user?.firstName} {user?.lastName}
                        </Link>
                        {user?.authority >= 1 && (
                            <Link 
                                to={user?.authority === 2 ? "/admin" : "/team-admin"} 
                                className="menu-item admin-link"
                                onClick={closeMenu}
                            >
                                Admin
                            </Link>
                        )}
                        <button 
                            className="menu-item logout-button" 
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <MenuItem to="/login" onClick={closeMenu}>Login</MenuItem>
                )}
            </nav>
        </>
    );
}
