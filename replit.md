# Zoweh Life

## Overview
A ministry management web application with a three-tier role system for tracking new converts across multiple ministries. Platform Admin manages the entire platform, Ministry Admins manage their specific ministry and approve leaders, and Leaders manage converts within their ministry.

## Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── dashboard-layout.tsx
│   │   │   ├── public-nav.tsx
│   │   │   ├── public-footer.tsx
│   │   │   ├── theme-provider.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── admin/      # Platform Admin dashboard pages
│   │   │   ├── ministry-admin/  # Ministry Admin dashboard pages
│   │   │   ├── leader/     # Leader dashboard pages
│   │   │   ├── home.tsx    # Public home page
│   │   │   ├── salvation.tsx
│   │   │   ├── journey.tsx
│   │   │   ├── contact.tsx
│   │   │   ├── login.tsx
│   │   │   └── setup.tsx
│   │   ├── lib/
│   │   │   ├── auth.tsx    # Auth context and hooks
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   ├── App.tsx         # Main app with routing
│   │   ├── main.tsx
│   │   └── index.css       # Tailwind and theme variables
│   └── index.html
├── server/                 # Express backend
│   ├── index.ts
│   ├── routes.ts           # API routes with auth middleware
│   ├── storage.ts          # Database storage layer
│   ├── db.ts               # PostgreSQL connection
│   ├── static.ts
│   └── vite.ts
├── shared/
│   └── schema.ts           # Drizzle schema and Zod validators
└── README.md
```

## Key Architecture Decisions
- **Auth**: Session-based authentication with bcrypt password hashing
- **Roles**: Three-tier role system
  - **ADMIN (Platform Admin)**: Manages entire platform, approves ministry registrations
  - **MINISTRY_ADMIN**: Manages their ministry, approves leader requests for their ministry
  - **LEADER**: Manages converts within their ministry
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React + TailwindCSS + shadcn/ui components
- **Routing**: wouter for client-side routing

## Database Schema
- **churches**: id, name, location, public_token (Salvation Form link), new_member_token (New Member Form link), member_token (Member Form link), logo_url, created_at
- **users**: id, role (ADMIN/MINISTRY_ADMIN/LEADER), first_name, last_name, email, password_hash, church_id, created_at
- **converts**: id, church_id, created_by_user_id (nullable), first_name, last_name, phone, email, address, date_of_birth, birth_day, birth_month, country, salvation_decision, summary_notes, status, self_submitted, wants_contact, gender, age_group, is_church_member, prayer_request
- **new_members**: id, church_id, created_by_user_id (nullable), first_name, last_name, phone, email, address, date_of_birth, country, gender, age_group, status, notes, self_submitted, created_at
- **new_member_checkins**: id, new_member_id, church_id, created_by_user_id, checkin_date, notes, outcome, next_followup_date, video_link
- **members**: id, church_id, created_by_user_id (nullable), first_name, last_name, phone, email, address, date_of_birth, country, gender, member_since, status, notes, self_submitted, created_at
- **ministry_requests**: id, ministry_name, location, admin_first_name, admin_last_name, admin_email, admin_phone, description, status (PENDING/APPROVED/DENIED), reviewed_by_user_id, reviewed_at, created_at

## Church Logo Upload
Leaders can upload a church logo from the "Church Settings" page in their dashboard. The logo will be displayed on the public Salvation Form for new converts. Logos are stored in Replit's Object Storage and can be up to 5MB in size (images only).
- **checkins**: id, convert_id, church_id, created_by_user_id, checkin_date, notes, outcome, next_followup_date, video_link
- **prayer_requests**: id, name, phone, email, message, church_preference
- **account_requests**: id, first_name, last_name, email, phone, church_name (free text), church_id, reason, status (PENDING/APPROVED/DENIED), reviewed_by_user_id, reviewed_at, created_at
- **audit_log**: id, actor_user_id, action, entity_type, entity_id

## Public Registration Links
Each church has three unique tokens that generate shareable links for different registration purposes:

### Salvation Form (Converts)
- URL: `/connect/{publicToken}`
- For new converts making salvation decisions
- Links shared at evangelism events

### New Member Form
- URL: `/new-member/{newMemberToken}`
- For new members joining the church
- Includes fields for personal info, gender, age group

### Member Form  
- URL: `/member/{memberToken}`
- For existing church members to register
- Includes member_since date field

All forms:
- Enable self-registration without requiring leader accounts
- Automatically associate submissions with the correct church
- Mark records as "self_submitted" in the database
- Leaders can copy shareable links from the Leader Dashboard

## Ministry Registration Flow (Three-Tier System)
The system uses a three-tier role hierarchy:

### 1. Ministry Registration (Platform Admin approves)
1. Organization submits registration via "Register a Ministry" form (accessible from footer link)
2. Platform Admin reviews pending ministry registrations at /admin/ministry-requests
3. On approval: ministry is created, Ministry Admin account is created with temporary password
4. Approval email is sent with login credentials

### 2. Leader Account Request Flow (Ministry Admin approves)
1. Prospective leaders submit request via "Become a Leader" form, selecting from existing ministries
2. Ministry Admin for that ministry reviews pending requests at /ministry-admin/account-requests
3. On approval: leader account is created with the ministry association
4. Approval email is sent with temporary password

### Role Capabilities
- **Platform Admin (ADMIN)**: Approves ministry registrations, manages all ministries/leaders/converts, views platform-wide stats
- **Ministry Admin (MINISTRY_ADMIN)**: Approves leader requests for their ministry, views ministry stats and converts
- **Leader (LEADER)**: Manages converts, schedules follow-ups, records check-ins for their ministry

## Follow-Up System
The system separates follow-up actions into two distinct flows:

### Schedule Follow Up (Converts Page)
Leaders use "Schedule Follow Up" button to plan future contact with converts:
- Set a follow-up date
- Optional: Include auto-generated Jitsi Meet video call link (unique per scheduling)
- Customize email subject and message for both leader reminder and convert notification
- Emails are sent immediately when scheduling

### Follow Up Notes (Followups Page)
Leaders record outcomes of completed follow-ups via "Follow Up Notes" button:
- Select outcome (Connected, No Response, Needs Prayer, etc.)
- Add notes about the interaction
- No emails are sent - this is purely for record-keeping

### Automated Email Reminders
1. **Initial Email**: Sent immediately when a follow-up is scheduled - notifies both the leader and the convert (if they have an email) about the upcoming contact
2. **Reminder Email**: Sent one day before the scheduled follow-up date - reminds the convert that someone from the ministry will be reaching out

### Video Call Links
When scheduling a follow-up, leaders can include an auto-generated Jitsi Meet video call link:
- No account or API key required
- Unique room name per scheduling: `{ministryName}-{firstName}-{lastName}-{timestamp}`
- Link included in both leader and convert emails
- Video link is stored in the checkin record
- "Join Meeting" button appears in the Follow-up Timeline when a video link is available

## Action Icons
The application uses icon buttons with hover tooltips for common actions:
- **Follow-ups Page**: Follow Up Note, Schedule Next Follow Up, View Convert Details, Follow Up Timeline
- **Converts Page**: Schedule Follow Up, View Convert Details, Follow Up Timeline

The email reminder scheduler runs hourly to:
1. Check for follow-ups scheduled for the next day and send reminder emails (tracked in `email_reminders` table to prevent duplicates)
2. Mark SCHEDULED_VISIT follow-ups as NOT_COMPLETED if they are more than 5 days past their scheduled date without a follow-up note being recorded

## API Routes
### Public
- `GET /api/public/churches` - Get list of churches for form dropdowns
- `GET /api/public/church/:token` - Get church info by public token
- `POST /api/public/church/:token/converts` - Submit new convert via public link
- `POST /api/prayer-requests` - Submit prayer request
- `POST /api/account-requests` - Submit leader account request

### Auth
- `GET /api/auth/setup-status` - Check if admin setup available
- `POST /api/auth/setup` - Create first admin
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Admin (requires ADMIN role)
- `GET /api/admin/stats` - Dashboard statistics
- `GET/POST /api/admin/churches` - List/create churches
- `PATCH /api/admin/churches/:id` - Update church
- `GET/POST /api/admin/leaders` - List/create leaders
- `POST /api/admin/leaders/:id/reset-password` - Reset leader password
- `GET /api/admin/converts` - List all converts
- `GET /api/admin/converts/export` - Export CSV
- `GET /api/admin/prayer-requests` - List prayer requests
- `GET /api/admin/account-requests` - List leader account requests
- `POST /api/admin/account-requests/:id/approve` - Approve request and create leader account
- `POST /api/admin/account-requests/:id/deny` - Deny account request

### Leader (requires LEADER role)
- `GET /api/leader/stats` - Dashboard statistics
- `GET/POST /api/leader/converts` - List/create converts
- `GET/PATCH /api/leader/converts/:id` - Get/update convert
- `POST /api/leader/converts/:convertId/checkins` - Create check-in (for recording follow-up notes)
- `POST /api/leader/converts/:convertId/schedule-followup` - Schedule a follow-up with email notifications and optional video call link
- `GET/POST /api/leader/new-members` - List/create new members
- `GET/PATCH /api/leader/new-members/:id` - Get/update new member
- `POST /api/leader/new-members/:id/checkins` - Create check-in for new member
- `POST /api/leader/new-members/:id/schedule-followup` - Schedule a follow-up for new member
- `GET /api/leader/new-members/:id/checkins` - Get check-in history for new member
- `GET/POST /api/leader/members` - List/create members
- `GET/PATCH /api/leader/members/:id` - Get/update member
- `POST /api/leader/church/generate-new-member-token` - Generate new member token for shareable link
- `POST /api/leader/church/generate-member-token` - Generate member token for shareable link

### Public
- `GET /api/public/church-new-member/:token` - Get church info for new member form
- `POST /api/public/church-new-member/:token/submit` - Submit new member via public link
- `GET /api/public/church-member/:token` - Get church info for member form
- `POST /api/public/church-member/:token/submit` - Submit member via public link

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection (auto-provided by Replit)
- `ADMIN_SETUP_KEY` - Required for first admin setup
- `SESSION_SECRET` - Session encryption key

## Running the Project
```bash
npm run dev      # Start development server
npm run db:push  # Push schema to database
```

## User Preferences
- Uses dark/light theme toggle
- Mobile-responsive design with sidebar navigation for dashboard
