# Zoweh Life

## Overview
A church organization web application for tracking new converts across multiple churches. Leaders log in, add converts to their church, and record follow-up check-ins. Admin manages churches and leaders.

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
│   │   │   ├── admin/      # Admin dashboard pages
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
- **Roles**: ADMIN (manages all) and LEADER (manages own church's converts)
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React + TailwindCSS + shadcn/ui components
- **Routing**: wouter for client-side routing

## Database Schema
- **churches**: id, name, location, public_token (unique link token), created_at
- **users**: id, role (ADMIN/LEADER), full_name, email, password_hash, church_id
- **converts**: id, church_id, created_by_user_id (nullable), first_name, last_name, phone, email, address, date_of_birth, birth_day, birth_month, country, salvation_decision, summary_notes, status, self_submitted, wants_contact, gender, age_group, is_church_member, prayer_request

## Church Logo Upload
Leaders can upload a church logo from the "Church Settings" page in their dashboard. The logo will be displayed on the public Salvation Form for new converts. Logos are stored in Replit's Object Storage and can be up to 5MB in size (images only).
- **checkins**: id, convert_id, church_id, created_by_user_id, checkin_date, notes, outcome, next_followup_date
- **prayer_requests**: id, name, phone, email, message, church_preference
- **account_requests**: id, full_name, email, phone, church_name (free text), reason, status (PENDING/APPROVED/DENIED), reviewed_by_user_id, reviewed_at, created_at
- **audit_log**: id, actor_user_id, action, entity_type, entity_id

## Public Church Convert Links
Each church has a unique public token that generates a shareable link (e.g., `/connect/{token}`). Anyone with this link can submit their information as a new convert directly to that church. This enables:
- Church leaders to share a link with new converts at events
- Self-registration without requiring leader accounts
- Automatic association with the correct church
- Converts marked as "self_submitted" in the database

Admin can copy the link from the Churches page using the link icon button.

## Leader Account Request Flow
1. Prospective leaders submit request via public form with church selection (dropdown of existing churches or free-text if not listed)
2. Admin reviews pending requests and can edit all fields before approval
3. On approval: edits are persisted, church is auto-created if it doesn't exist, leader account is created
4. Approval email is sent with temporary password

## Follow-Up Email Notifications
When a leader or admin creates a check-in with a scheduled follow-up date, the system automatically sends email notifications:
1. **Initial Email**: Sent immediately when a follow-up is scheduled - notifies both the leader and the convert (if they have an email) about the upcoming contact
2. **Reminder Email**: Sent one day before the scheduled follow-up date - reminds the convert that someone from the ministry will be reaching out

The email reminder scheduler runs hourly to check for follow-ups scheduled for the next day and sends reminder emails. Sent reminders are tracked in the `email_reminders` table to prevent duplicates.

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
- `POST /api/leader/converts/:convertId/checkins` - Create check-in

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
