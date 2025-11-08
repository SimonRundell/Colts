# Devon RFU Colts League Management System

A comprehensive web application for managing Devon RFU Colts rugby leagues, fixtures, results, and standings with automated email notifications for followers.

Code by Simon Rundell, Dept of ITDD, Exeter College, November 2025
Documentation generated using Claude Sonnet 4.5
simonrundell@exe-coll.ac.uk

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Frontend Structure](#frontend-structure)
- [Configuration](#configuration)
- [Authentication & Authorization](#authentication--authorization)
- [Core Features](#core-features)
- [Email Notification System](#email-notification-system)
- [Data Flow](#data-flow)
- [Setup & Installation](#setup--installation)
- [Development](#development)
- [Backend API Reference](#backend-api-reference)

---

## System Overview

The Devon RFU Colts League Management System is a full-stack application designed to:
- Manage multiple rugby league divisions and teams
- Schedule fixtures and record match results
- Track player scoring (tries, conversions, penalties, drop goals)
- Automatically calculate league standings using rugby union rules
- Enable public registration for spectators and followers
- Send automated email notifications for results and standings updates

### User Types

1. **Spectators/Followers (authority = 0)**
   - Can register and follow specific teams
   - Receive email notifications when their team plays
   - No login required to view public pages (Fixtures, Tables)

2. **Local Admins (authority = 1)**
   - Manage specific teams (authorityOver = team ID)
   - Limited administrative access

3. **Full Admins (authority = 2)**
   - Complete system access
   - Manage users, teams, fixtures, and results
   - Trigger manual standings recalculation

---

## Technology Stack

### Frontend
- **React 19.1.1** - UI framework
- **React Router 7.9.5** - Client-side routing
- **Vite 7.1.7** - Build tool and dev server
- **react-datepicker** - Date selection for fixtures
- **bcryptjs** - Password hashing (client-side for registration)

### Backend
- **Node.js** - Runtime environment
- **Express.js** - REST API framework
- **MySQL 8.4.3** - Database
- **JWT** - Authentication tokens (24-hour expiry)
- **Nodemailer** - Email delivery via SMTP

### Email Service
- **SMTP Server**: smtp.dreamhost.com:587
- **Sender**: server@aibot.examrevision.online
- HTML email templates with inline CSS

---

## Architecture

### Application Structure

```
Colts/
├── public/
│   ├── templates/                    # HTML email templates
│   │   ├── registration.html         # Welcome & verification email
│   │   ├── result-notification.html  # Match result emails
│   │   └── standings-notification.html # League table emails
│   ├── images.json
│   ├── .config.json                  # API URL & current season
│   └── assets/                       # Images, logos
├── src/
│   ├── components/
│   │   ├── admin/                    # Admin CRUD components
│   │   │   ├── UsersAdmin.jsx
│   │   │   ├── TeamsAdmin.jsx
│   │   │   ├── FixturesAdmin.jsx
│   │   │   └── ResultsAdmin.jsx
│   │   ├── ProtectedRoute.jsx        # Route guard component
│   │   └── ThreeCardImageFader.jsx   # Homepage carousel
│   ├── pages/
│   │   ├── Home.jsx                  # Public homepage
│   │   ├── About.jsx                 # Public about page
│   │   ├── Fixtures.jsx              # Public fixtures view
│   │   ├── Tables.jsx                # Public standings view
│   │   ├── Login.jsx                 # Authentication page
│   │   ├── Register.jsx              # Follower registration
│   │   ├── Verify.jsx                # Email verification
│   │   ├── ForgotPassword.jsx        # Password reset request
│   │   ├── ResetPassword.jsx         # Password reset form
│   │   ├── Profile.jsx               # User profile editing
│   │   ├── Admin.jsx                 # Admin dashboard
│   │   ├── TeamAdmin.jsx             # Team management
│   │   └── RecalculateStandings.jsx  # Manual standings update
│   ├── utils/
│   │   ├── authHelpers.js            # Auth & CRUD functions
│   │   ├── standingsCalculator.js    # Rugby scoring logic
│   │   ├── dateHelpers.js            # Date formatting
│   │   ├── apiHelpers.js             # API utilities
│   │   └── fileAttachments.js        # File upload handling
│   ├── App.jsx                       # Main app & routing
│   ├── App.css                       # Global styles
│   ├── Layout.jsx                    # App layout wrapper
│   ├── menu.jsx                      # Navigation menu
│   └── main.jsx                      # App entry point
├── data/
│   └── devonrfccolts.sql            # Database schema
├── package.json
├── vite.config.js
└── README.md
```

---

## Database Schema

### Core Tables

#### `tblusers`
```sql
CREATE TABLE `tblusers` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL,
  `login` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,  -- bcrypt hash
  `authority` int NOT NULL DEFAULT 0,  -- 0=spectator, 1=local admin, 2=full admin
  `authorityOver` int NOT NULL DEFAULT 0,  -- FK to tblteams.id
  `validLogin` int DEFAULT 0,  -- 0=unverified, 1=verified
  `verificationToken` varchar(64),  -- Hex token for email verification
  `tokenExpiresAt` datetime  -- Token expiration timestamp
);
```

#### `tblteams`
```sql
CREATE TABLE `tblteams` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `teamName` varchar(50) NOT NULL,
  `teamClub` varchar(50) NOT NULL,
  `teamLogo` longtext,  -- Base64 encoded with data URI prefix
  `playsIn` int NOT NULL  -- FK to tblleagues.id
);
```

#### `tblleagues`
```sql
CREATE TABLE `tblleagues` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `leagueName` varchar(50) NOT NULL,
  `leagueSeason` varchar(50) NOT NULL  -- e.g., "2025-26"
);
```

#### `tblfixtures`
```sql
CREATE TABLE `tblfixtures` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `leagueID` int NOT NULL,  -- FK to tblleagues.id
  `homeTeam` int NOT NULL,  -- FK to tblteams.id
  `awayTeam` int NOT NULL,  -- FK to tblteams.id
  `date` datetime NOT NULL,
  `venue` varchar(255) NOT NULL,
  `referee` int,  -- FK to tblusers.id
  `status` int NOT NULL DEFAULT 0  -- 0=scheduled, 1=underway, 2=completed, 3=cancelled, 4=abandoned
);
```

#### `tblresults`
```sql
CREATE TABLE `tblresults` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `fixtureID` int NOT NULL,  -- FK to tblfixtures.id
  `homeScore` int NOT NULL DEFAULT 0,
  `awayScore` int NOT NULL DEFAULT 0,
  `homeScorers` json,  -- Array of scorer objects
  `awayScorers` json,  -- Array of scorer objects
  `submittedBy` int NOT NULL,  -- FK to tblusers.id
  `dateSubmitted` datetime
);
```

**Scorer JSON Format:**
```json
[
  {
    "playerName": "John Smith",
    "scoreType": "try",  // try|conversion|penalty|dropGoal
    "points": 5,
    "minute": 23,
    "isPenaltyTry": false
  }
]
```

#### `tblstandings`
```sql
CREATE TABLE `tblstandings` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `leagueID` int NOT NULL,  -- FK to tblleagues.id
  `teamID` int NOT NULL,  -- FK to tblteams.id
  `played` int NOT NULL DEFAULT 0,
  `won` int NOT NULL DEFAULT 0,
  `drawn` int NOT NULL DEFAULT 0,
  `lost` int NOT NULL DEFAULT 0,
  `pointsFor` int NOT NULL DEFAULT 0,
  `pointsAgainst` int NOT NULL DEFAULT 0,
  `pointsDifference` int NOT NULL DEFAULT 0,
  `bonusPoints` int NOT NULL DEFAULT 0,
  `points` int NOT NULL DEFAULT 0
);
```

**Note**: Position is calculated dynamically in the frontend and not stored in the database.

---

## Frontend Structure

### Component Hierarchy

```
App (Router)
├── Layout (Navigation)
│   ├── Home
│   │   └── ThreeCardImageFader (Carousel)
│   ├── About
│   ├── Fixtures (Public - no auth)
│   ├── Tables (Public - no auth)
│   ├── Login
│   ├── Register
│   ├── Verify
│   └── ProtectedRoute (Auth guard)
│       ├── Admin (Dashboard)
│       │   ├── UsersAdmin
│       │   ├── TeamsAdmin
│       │   ├── FixturesAdmin
│       │   └── ResultsAdmin
│       ├── TeamAdmin
│       └── RecalculateStandings
```

### Key Components

#### `App.jsx`
- Root component with React Router setup
- Defines all routes (public and protected)
- Loads Layout wrapper for consistent navigation

#### `Layout.jsx`
- Provides consistent page structure
- Navigation menu integration
- Outlet for child routes

#### `ProtectedRoute.jsx`
- Route guard component
- Checks for valid JWT token in localStorage
- Redirects to login if not authenticated
- Can enforce minimum authority level

#### Admin Components

**UsersAdmin.jsx**
- CRUD operations for user accounts
- Password hashing with bcrypt
- Authority level management
- Team assignment (authorityOver)

**TeamsAdmin.jsx**
- Team management
- Logo upload (base64 conversion)
- League assignment

**FixturesAdmin.jsx**
- Fixture scheduling
- Date picker integration (react-datepicker)
- Home/away team selection
- Venue and referee assignment

**ResultsAdmin.jsx**
- Record match results
- Detailed scorer tracking (player, type, points, minute)
- Automatic standings updates
- Email notifications to followers

#### Public Pages

**Fixtures.jsx**
- Displays scheduled and completed matches
- No authentication required
- Uses publicRead API endpoint
- Shows league, teams, date, venue, and scores

**Tables.jsx**
- Displays league standings
- Sorted by: points → goal difference → points scored
- No authentication required
- Filtered by current season from config

---

## Configuration

### `.config.json` (in public/)

```json
{
  "api": "http://localhost:3000",
  "currentSeason": "2025-26"
}
```

**Purpose:**
- Centralizes API base URL for deployment flexibility
- Defines current season for standings calculation
- Loaded dynamically by frontend components

**Usage in Code:**
```javascript
import { getApiUrl } from '../utils/authHelpers';
const apiUrl = getApiUrl();  // Returns config.api value
```

---

## Authentication & Authorization

### Authentication Flow

1. **Login**
   - User submits login/password
   - Backend validates with bcrypt
   - Returns JWT token (24-hour expiry) + user object
   - Frontend stores in localStorage

2. **Protected Route Access**
   - ProtectedRoute checks for token
   - Validates token hasn't expired
   - Redirects to login if invalid/missing

3. **API Requests**
   - authHelpers automatically includes token in headers
   - Backend validates token on each request
   - 403 response triggers logout and redirect

### Registration & Verification Flow

1. **Registration** (`/register`)
   - User fills registration form
   - Password validated (8+ chars, mixed case, numbers, special chars)
   - User created via `/api/auth/register` endpoint (no JWT required)
   - Backend handles password hashing with bcrypt
   - User created with `validLogin = 0`
   - Verification token generated (64-char hex, 24hr expiry)
   - Welcome email sent with verification link

2. **Email Verification** (`/verify?token=...`)
   - User clicks link in email
   - Token validated by backend
   - `validLogin` set to 1
   - User can now log in

3. **Login Protection**
   - Backend checks `validLogin = 1` before allowing login
   - Returns 403 if email not verified
   - Frontend displays clear error message

### Password Reset Flow

1. **Request Reset** (`/forgot-password`)
   - User enters email address
   - System generates verification token (reuses registration token system)
   - Password reset email sent with secure link
   - Generic success message (doesn't reveal if email exists)

2. **Reset Password** (`/reset-password?token=...&login=...`)
   - User clicks link in email
   - Token validated by backend
   - User enters new password with validation
   - Password sent to `/api/auth/reset-password` endpoint
   - Backend hashes password and updates database
   - Token cleared (single-use)
   - User redirected to login

3. **Security Features**
   - Tokens expire after 24 hours
   - Single-use tokens (cleared after successful reset)
   - No authentication required (user can't log in to reset password)
   - Password complexity validation enforced
   - Generic responses prevent email enumeration

### Profile Management

**All Users** (`/profile`)
- Edit first name and last name
- Change password (requires current password verification)
- Password complexity validation enforced
- Email notification sent after changes

**Followers Only** (authority = 0)
- Can change which team they follow (authorityOver)
- Team dropdown for easy selection

**Security**
- Current password required for password changes
- Password validated on frontend and hashed on backend
- Profile changes trigger email notification
- Login/email cannot be changed

### Authority Levels

| Level | Name | Access |
|-------|------|--------|
| 0 | Spectator/Follower | No admin access, receives emails, can edit profile |
| 1 | Local Admin | Manages specific team, can edit profile |
| 2 | Full Admin | Complete system access, can edit profile |

---

## Core Features

### 1. Fixture Management

**Features:**
- Create scheduled matches with date/time picker
- Assign home and away teams
- Set venue and optional referee
- Track fixture status (scheduled → underway → completed/cancelled/abandoned)

**Admin Interface:**
- Calendar-based date selection (react-datepicker)
- Team dropdowns filtered by league
- Inline editing and deletion
- Status color coding

### 2. Result Recording

**Features:**
- Record final scores
- Track individual scorers with:
  - Player name
  - Score type (try, conversion, penalty, drop goal)
  - Points (auto-calculated based on type)
  - Minute of score
  - Penalty try checkbox
- Calculate total points from scorers
- Update fixture status to "completed"

**Data Validation:**
- Scorer totals should match final score
- All scorers require player name (except penalty tries)

**Automatic Actions:**
- Updates league standings (calculateLeagueStandings)
- Sends email notifications to followers of both teams

### 3. League Standings

**Calculation Rules (Rugby Union):**
- **Win**: 4 points
- **Draw**: 2 points each
- **Loss**: 0 points
- **Bonus Points**:
  - +1 for scoring 4+ tries
  - +1 for losing by ≤7 points

**Sorting Order:**
1. Total points (descending)
2. Points difference (descending)
3. Points scored (descending)

**Automatic Updates:**
- Triggered when result status = "completed"
- Recalculates all teams in affected league
- Only processes current season fixtures

**Manual Recalculation:**
- Admin-triggered full recalculation
- Processes all leagues in current season
- Sends standings email to all followers

### 4. Rugby Scoring System

**Score Types:**

| Type | Points | Notes |
|------|--------|-------|
| Try | 5 | Standard try |
| Conversion | 2 | After try |
| Penalty | 3 | Penalty kick |
| Drop Goal | 3 | In open play |

**Penalty Try:**
- Automatically named "Penalty Try"
- Worth 5 points
- No player name required

---

## Email Notification System

### Email Templates

All templates in `public/templates/` use HTML with inline CSS for email client compatibility.

#### 1. Registration Email (`registration.html`)

**Triggers:** New follower registration

**Placeholders:**
- `{{firstName}}`, `{{lastName}}` - User name
- `{{login}}` - Email/username
- `{{teamName}}` - Selected team
- `{{verificationLink}}` - Verification URL with token

**Content:**
- Welcome message
- Team confirmation
- Large "Verify My Email Address" button
- 24-hour expiration warning
- Plain text link fallback

#### 2. Password Reset Email (`password-reset.html`)

**Triggers:** User requests password reset via "Forgot Password"

**Placeholders:**
- `{{firstName}}`, `{{lastName}}` - User name (generic "User" if unavailable)
- `{{login}}` - Email address
- `{{resetLink}}` - Password reset URL with token

**Content:**
- Password reset request confirmation
- "Reset My Password" button
- 24-hour expiration notice
- Security warning if request not made by user
- Plain text link fallback

**Security:**
- Generic success message prevents email enumeration
- Token is single-use and expires in 24 hours
- No authentication required to request reset

#### 3. Profile Update Email (`profile-update.html`)

**Triggers:** User updates profile (name, password, or team)

**Placeholders:**
- `{{firstName}}`, `{{lastName}}` - User name
- `{{login}}` - Email address
- `{{changes}}` - HTML list of changes made
- `{{timestamp}}` - Date/time of update

**Content:**
- Confirmation of profile changes
- Detailed list of what was changed
- Security warning if changes not made by user
- Login email reminder

**Changes Tracked:**
- Name updates (first/last name)
- Password changes (shows "Password changed", not the password)
- Team selection changes (for followers)

#### 4. Result Notification (`result-notification.html`)

**Triggers:** Match result submitted (status = completed)

**Recipients:** Followers (authority = 0) of home or away team

**Placeholders:**
- `{{firstName}}` - Follower name
- `{{teamName}}` - Their followed team
- `{{homeTeamName}}`, `{{awayTeamName}}` - Competing teams
- `{{homeScore}}`, `{{awayScore}}` - Final scores
- `{{homeTeamLogo}}`, `{{awayTeamLogo}}` - Team logos (base64 data URIs)
- `{{leagueName}}`, `{{leagueSeason}}` - League info
- `{{matchDate}}` - Formatted match date
- `{{venue}}` - Match location
- `{{homeScorersSection}}`, `{{awayScorersSection}}` - Scorer details

**Content:**
- Match score with team logos
- Detailed scorer breakdown
- League and match information

**Implementation Notes:**
- Team logos use direct data URI from database (already includes `data:image/png;base64,` prefix)
- No additional encoding needed

#### 5. Standings Notification (`standings-notification.html`)

**Triggers:** Manual standings recalculation

**Recipients:** All followers (authority = 0)

**Placeholders:**
- `{{firstName}}` - Follower name
- `{{season}}` - Current season (from config)
- `{{updateDate}}` - Recalculation timestamp
- `{{leagueTables}}` - HTML tables for all leagues

**Content:**
- Complete standings tables for all current season leagues
- Position, team name, P/W/D/L, points for/against/difference, bonus points, total points
- Legend explaining abbreviations

### Email Sending Implementation

**Location:** `ResultsAdmin.jsx`, `RecalculateStandings.jsx`, `Profile.jsx`, `ForgotPassword.jsx`

**Process:**
1. Load HTML template from `/templates/`
2. Fetch relevant data (users, teams, standings)
3. Build dynamic HTML sections (scorers, tables, changes)
4. Replace placeholders with actual data
5. Send via `/api/email/send` endpoint
6. Log success/failure for each recipient

**Error Handling:**
- Email failures don't block primary operations
- Errors logged to console
- Operations continue even if emails fail

---

## Data Flow

### Registration Flow
```
User Form
  ↓
Register.jsx (validate password)
  ↓
POST /api/auth/register (create user, hash password)
  ↓
POST /api/verification/generate (create token)
  ↓
Fetch registration.html template
  ↓
Replace placeholders
  ↓
POST /api/email/send (send verification)
  ↓
Success message displayed
```

### Result Submission Flow
```
ResultsAdmin.jsx (enter scores & scorers)
  ↓
POST /api/crud/create (save result)
  ↓
POST /api/crud/update (update fixture status)
  ↓
updateStandingsForFixture() (recalculate league)
  ↓
sendResultNotifications() (if status = completed)
  ↓
  ├── POST /api/crud/read (get followers)
  ├── Fetch result-notification.html
  ├── Build scorer sections
  └── POST /api/email/send (for each follower)
```

### Standings Recalculation Flow
```
RecalculateStandings.jsx (admin triggers)
  ↓
calculateLeagueStandings() (for each league)
  ↓
  ├── Fetch fixtures (status = completed)
  ├── Calculate points & bonuses
  ├── POST /api/crud/update (save standings)
  └── Return success
  ↓
sendStandingsNotifications()
  ↓
  ├── POST /api/crud/read (get all followers)
  ├── POST /api/crud/read (get standings)
  ├── Fetch standings-notification.html
  ├── Build league tables HTML
  └── POST /api/email/send (for each follower)
```

### Public Page Data Flow
```
Fixtures.jsx / Tables.jsx
  ↓
publicRead() from authHelpers
  ↓
POST /api/public/read (no auth required)
  ↓
Backend validates table is allowed
  ↓
Returns records
  ↓
Frontend displays data
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- MySQL 8.4.3
- SMTP server credentials

### Database Setup

1. Create database:
```sql
CREATE DATABASE devonrfccolts;
USE devonrfccolts;
```

2. Import schema:
```bash
mysql -u root -p devonrfccolts < data/devonrfccolts.sql
```

3. Verify email verification columns exist:
```sql
ALTER TABLE tblusers 
ADD COLUMN validLogin INT DEFAULT 0,
ADD COLUMN verificationToken VARCHAR(64),
ADD COLUMN tokenExpiresAt DATETIME;
```

### Backend Setup

See `BACKEND-INSTRUCTIONS.txt` for complete backend configuration including:
- Express.js API setup
- JWT authentication configuration
- CRUD endpoint implementation
- Email service configuration

**Required Endpoints:**
- POST `/api/auth/login` - User authentication
- POST `/api/auth/register` - User registration (no JWT)
- POST `/api/verification/generate` - Create verification token
- POST `/api/verification/verify` - Validate token
- POST `/api/email/send` - Send HTML emails
- POST `/api/crud/create` - Create records
- POST `/api/crud/read` - Read records
- POST `/api/crud/update` - Update records
- POST `/api/crud/delete` - Delete records
- POST `/api/public/read` - Public read access

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API URL in `public/.config.json`:
```json
{
  "api": "http://localhost:3000",
  "currentSeason": "2025-26"
}
```

3. Start development server:
```bash
npm run dev
```

4. Access application:
```
http://localhost:5173
```

### Production Build

```bash
npm run build
npm run preview
```

---

## Development

### Code Organization

**Utilities (`src/utils/`):**

- **authHelpers.js**
  - `getUser()` - Get current user from localStorage
  - `isAuthenticated()` - Check if user has valid token
  - `crudRequest()` - Authenticated CRUD operations
  - `publicRead()` - Public data access
  - `getApiUrl()` - Get API URL from config

- **standingsCalculator.js**
  - `calculateLeagueStandings()` - Full league recalculation
  - `updateStandingsForFixture()` - Single fixture update
  - Implements rugby union scoring rules

- **dateHelpers.js**
  - Date formatting utilities
  - MySQL datetime conversion

### Styling

**Global Styles (`App.css`):**
- Color scheme: Green (#00a755), Dark (#1c1c1c), White (#f2f2f2)
- Responsive design with media queries
- Admin panel styles (`.admin-*` classes)
- Form validation styles (`.error`, `.success-message`)
- Authentication page styles (`.auth-container`, `.auth-box`)

**Component-Specific:**
- `ThreeCardImageFader.css` - Homepage carousel animations

### Adding New Features

**1. New Admin CRUD Component:**
```javascript
// src/components/admin/MyAdmin.jsx
import { crudRequest, getUser } from '../../utils/authHelpers';

function MyAdmin() {
  const user = getUser();
  const [data, setData] = useState([]);
  
  const fetchData = async () => {
    const result = await crudRequest('read', { table: 'mytable' });
    if (result.status_code === 200) {
      setData(result.data.records || result.data);
    }
  };
  
  // ... CRUD operations
}
```

**2. New Email Template:**
1. Create HTML file in `public/templates/`
2. Use inline CSS for email compatibility
3. Add `{{placeholder}}` markers
4. Load with `fetch('/templates/mytemplate.html')`
5. Replace placeholders with `.replace(/{{name}}/g, value)`

**3. New Public Page:**
1. Create component in `src/pages/`
2. Use `publicRead()` for data access (no auth)
3. Add route in `App.jsx` (outside ProtectedRoute)

---

## Backend API Reference

For complete backend API documentation including:
- Authentication endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/reset-password`)
- Verification endpoints (`/api/verification/generate`, `/api/verification/verify`)
- CRUD operations
- Public endpoints
- Email service
- Error handling
- Security requirements

See: `BACKEND-INSTRUCTIONS.txt`

**Password Reset Endpoint:** See `BACKEND-PASSWORD-RESET.txt` for implementation details of the `/api/auth/reset-password` endpoint.

---

## Key Design Decisions

### 1. Password Hashing
- Registration uses `/api/auth/register` endpoint
- Backend handles bcrypt hashing (10 salt rounds)
- Login sends plain password (backend validates)
- Password reset sends plain password to `/api/auth/reset-password` (backend hashes)
- Secure over HTTPS/TLS in production

### 2. Token Reuse for Password Reset
- Password reset reuses the verification token system
- Same `verificationToken` and `tokenExpiresAt` columns
- Tokens are single-use (cleared after successful reset)
- 24-hour expiration for security
- No additional database schema required

### 3. No JWT for Public Pages
- Fixtures and Tables accessible without login
- Uses separate `/api/public/read` endpoint
- Improves user experience for spectators
- Backend enforces read-only and table restrictions

### 4. Dynamic Standings Calculation
- Position calculated in frontend, not stored
- Allows flexibility in sorting rules
- Reduces database complexity
- Recalculation rebuilds entire league standings

### 5. Email Templates with Inline CSS
- Ensures compatibility with email clients
- Templates stored as static HTML files
- Placeholder replacement for dynamic content
- Team logos embedded as base64 data URIs (already includes prefix)

### 6. Configuration in Public Directory
- `.config.json` accessible to frontend
- No build step required for config changes
- Easy deployment to different environments
- Loaded dynamically at runtime

### 7. Self-Service Profile Management
- All users can edit their own profile
- Password changes require current password verification
- Followers can change team selection
- Email notifications for all profile changes
- Login/email cannot be changed for security

---

## Common Tasks

### Reset User Password
1. User navigates to Login page
2. Clicks "Forgot Password?" link
3. Enters email address
4. Receives password reset email
5. Clicks link in email (valid 24 hours)
6. Enters new password
7. Redirected to login

### Update Profile
1. User clicks their name in menu
2. Navigates to Profile page
3. Edit name, password, or team (followers only)
4. Submit changes
5. Receive confirmation email

### Update Current Season
1. Edit `public/.config.json`
2. Change `currentSeason` value
3. Reload application

### Add New Team
1. Login as admin
2. Navigate to Admin → Team Management
3. Upload logo (base64 conversion automatic)
4. Assign to league

### Trigger Standings Email
1. Login as admin
2. Navigate to Admin → Recalculate League Standings
3. Click "Recalculate All Standings"
4. Emails sent automatically to all followers

### Debug Email Issues
1. Check browser console for error logs
2. Verify SMTP configuration in backend
3. Check recipient email addresses in tblusers
4. Verify templates exist in `public/templates/`
5. For team logos, verify teamLogo field includes full data URI with `data:image/png;base64,` prefix

---

## Security Considerations

### Authentication
- JWT tokens expire after 24 hours
- Tokens stored in localStorage (consider httpOnly cookies for production)
- Backend validates all requests

### Passwords
- Bcrypt hashing with 10 salt rounds (backend)
- Frontend validation enforces complexity
- Never stored in plain text

### Email Verification
- 64-character hex tokens
- 24-hour expiration
- One-time use (backend invalidates after verification)

### Public Endpoints
- Read-only access
- Restricted to safe tables (no user data)
- Maximum record limits enforced

### Input Validation
- Frontend validates form inputs
- Backend also validates (defense in depth)
- SQL injection prevention via parameterized queries

---

## Troubleshooting

### "Invalid credentials" on login
- Check user exists in database
- Verify password is correctly hashed
- Check `validLogin = 1` for verified users

### Email not sending
- Verify SMTP credentials in backend
- Check template exists in `public/templates/`
- Verify recipient has valid email in `login` field
- Check backend console for error messages

### Team logos not showing in emails
- Verify teamLogo field contains full data URI: `data:image/png;base64,{base64data}`
- Check logo was uploaded correctly in TeamsAdmin
- Verify base64 encoding is valid

### Standings not updating
- Verify fixture status = 2 (completed)
- Check result record exists in tblresults
- Ensure league season matches config `currentSeason`
- Check browser console for errors

### Public pages showing "Failed to load"
- Verify backend `/api/public/read` endpoint exists
- Check table name is in allowed list
- Verify backend is running on correct port
- Check `.config.json` has correct API URL

---

## Project Metadata

**Version:** 1.0  
**Last Updated:** November 7, 2025  
**Frontend:** React 19.1.1 + Vite 7.1.7  
**Backend:** Node.js + Express + MySQL 8.4.3  
**License:** Proprietary  
**Organization:** Devon RFU

---

## Contact & Support

For backend setup and configuration, refer to `BACKEND-INSTRUCTIONS.txt`.

For registration system specifics, see `REGISTRATION-SYSTEM-SUMMARY.txt` (deprecated - info now in this README).
