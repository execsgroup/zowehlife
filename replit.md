# Zoweh Life

## Overview
Zoweh Life is a ministry management web application designed to track new converts across multiple ministries. Its primary purpose is to streamline the process of spiritual growth and community integration. The application features a robust three-tier role system (Platform Admin, Ministry Admin, Leader) to manage ministry operations, approve leaders, and oversee convert follow-ups. The vision is to empower ministries with efficient tools for disciple-making, enhancing their reach and impact.

## User Preferences
- Uses dark/light theme toggle
- Mobile-responsive design with sidebar navigation for dashboard

## System Architecture
The application is built with a clear separation of concerns, utilizing a React frontend and an Express backend.

### UI/UX Decisions
- **Frontend Framework**: React
- **Styling**: TailwindCSS for utility-first styling.
- **UI Components**: `shadcn/ui` for accessible and customizable UI components.
- **Responsiveness**: Mobile-responsive design is a core principle, ensuring usability across various devices.
- **Theming**: "Radiant Journey" vibrant color template with dark/light theme toggle.
  - **Light**: Primary Royal Indigo (#4F46E5), Accent Vibrant Teal (#14B8A6), Coral (#FB7185), Gold (#F59E0B)
  - **Dark**: Bright Indigo (#6D67FF), Teal (#2DD4BF), Coral (#FB7185), Gold (#FBBF24)
  - Semantic tokens: `coral`, `gold`, `success` in tailwind.config.ts
  - Gradient utilities: `.bg-gradient-primary`, `.bg-gradient-secondary`, `.bg-gradient-warm`, `.text-gradient-primary`, `.gradient-strip` in index.css
  - Sidebar uses neutral background (card color) with indigo active indicator.

### Technical Implementations
- **Authentication**: Session-based authentication is used with `bcrypt` for secure password hashing. Member accounts use a separate session namespace (`memberAccountId`, `personId`, `currentMinistryId`).
- **Authorization**: A three-tier staff role system plus member accounts:
    - **ADMIN (Platform Admin)**: Manages platform-wide settings and ministry registrations.
    - **MINISTRY_ADMIN**: Manages a specific ministry, including leader approvals.
    - **LEADER**: Manages converts within their assigned ministry.
    - **Member Accounts**: Converts and members can access their own portal to view journey and submit prayer requests.
- **Database**: PostgreSQL is the chosen relational database, managed with Drizzle ORM.
- **Routing**: `wouter` is used for client-side routing.
- **Email Notifications**: Automated email reminders are sent for follow-ups, including initial emails and day-before reminders.
- **AI Integration**: An AI Text Helper, powered by OpenAI (gpt-5.2 model), assists leaders in drafting follow-up emails.
- **Follow-Up System**: A structured workflow for new member follow-ups includes automated stage progression and completion prompts.
- **Public Registration Links**: Churches can generate unique, shareable links for Salvation Forms, New Member Forms, and Member Forms, allowing self-submission which is automatically associated with the correct church.
- **Ministry & Leader Registration Flow**:
    - Ministries register and are approved by a Platform Admin.
    - Ministry Admins can directly add leaders (max 3 per ministry) with auto-generated passwords.
- **Dynamic API Routing**: Role-based API path hooks (`useBasePath` and `useApiBasePath`) enable shared components to work across Leader, Ministry Admin, and Admin roles by dynamically resolving frontend routes and API endpoints.
- **Church Logo Upload**: Leaders can upload church logos (up to 5MB, image only) via their dashboard, stored in Replit's Object Storage and displayed on public forms.
- **Video Conferencing**: Jitsi Meet integration allows for auto-generated unique video call links for follow-ups without requiring external accounts or API keys.

### Core Features
- **Convert Management**: Leaders can add, update, and track converts.
- **Follow-Up Scheduling**: Tools to schedule follow-ups with customizable email templates and optional video call links.
- **Check-in Recording**: Leaders can record outcomes and notes for completed follow-ups.
- **Dashboard Statistics**: Role-based dashboards provide relevant statistics for Platform Admins, Ministry Admins, and Leaders.
- **Account Request Management**: Admins can approve or deny ministry and leader account requests.
- **Prayer Request Submission**: Public form for submitting prayer requests.
- **Member Portal**: A dedicated portal for converts and members to:
    - View their spiritual journey timeline across ministries
    - Track scheduled and completed follow-up sessions with video meeting links
    - Submit and view prayer requests
    - Write private journal entries with optional ministry sharing
    - Switch between multiple ministry affiliations
- **Member Account System**: Secure account provisioning with:
    - Automatic account creation when converts/members register via public forms
    - Claim tokens (SHA-256 hashed, 24-hour expiry, one-time use via usedAt field) sent via email for secure password setup
    - Multi-ministry affiliation support (one person can belong to multiple ministries)
    - Person identity management using normalized email as primary key
    - Account status lifecycle: PENDING_CLAIM → ACTIVE (can be SUSPENDED by admins)
    - Session separation: Staff login clears member session and vice versa to prevent role confusion
- **Member Account Management**: Leaders and Ministry Admins can:
    - View all member portal accounts for their ministry
    - See account status (Pending Claim, Active, Suspended)
    - Resend claim tokens for accounts that haven't been claimed yet
    - Suspend or activate member accounts (Ministry Admins only)
    - View member affiliation type (convert, new_member, member) and last login
- **Ministry Plan Model**: A 4-tier subscription plan system per ministry with Stripe payment integration:
    - **Free** ($0/mo): 1 Admin + 1 Leader account, all platform features, auto-approved immediately
    - **Foundations** ($19.99/mo): 1 Admin + 1 Leader account, all platform features
    - **Formation** ($29.99/mo): 1 Admin + up to 3 Leader accounts, all platform features
    - **Stewardship** ($59.99/mo): 1 Admin + up to 10 Leader accounts, all platform features
    - Plan is stored on the `churches` table as a `ministry_plan` enum column
    - Leader limits are enforced at all creation points (direct add, account requests)
    - Platform Admins can view and change a ministry's plan from the Ministries page and edit dialog
    - Plan is displayed as a badge on the ministry list table and ministry profile page
    - **Auto-Approval System**: Ministries are auto-approved upon successful payment (free tier approves immediately without Stripe checkout). The `autoApproveMinistry()` helper in `server/routes.ts` creates the church, generates a temporary password, creates the admin user account, and sends credentials via email.
    - **Subscription Lifecycle**: Tracked via `stripeCustomerId`, `stripeSubscriptionId`, and `subscriptionStatus` columns on the `churches` table. Status values: `active`, `free`, `past_due`, `suspended`, `canceled`.
    - **Stripe Webhook Integration**: Handles `invoice.payment_failed` (sets status to `past_due`), `invoice.payment_succeeded` (restores to `active`), `customer.subscription.deleted` (sets to `suspended`), and `checkout.session.completed` (auto-approves pending ministries).
    - **Read-Only Enforcement**: Middleware blocks POST/PATCH/DELETE operations for ministries with inactive subscriptions (`past_due`, `suspended`, `canceled`). Billing endpoints are excluded to allow payment updates.
    - **Billing Management**: Ministry admins can access their Stripe Customer Portal via `/api/ministry-admin/billing/portal` to update payment methods and view invoices. Dedicated billing page at `/ministry-admin/billing`.
    - **Subscription Status Banner**: Dashboard-wide banner component alerts users of inactive subscriptions with quick-fix actions for admins.
    - **Stripe Payment Flow**: Ministry registration requires Stripe checkout before auto-approval
      - Plans/prices fetched from Stripe API at `/api/stripe/ministry-plans`
      - Registration creates ministry_request, then Stripe checkout session
      - On payment success, webhook auto-approves and creates ministry + admin account
      - Stripe credentials managed via Replit connector (sandbox mode)
      - Products seeded via `server/seed-stripe-products.ts`
- **Remove from Ministry**: Leaders and Admins can remove converts, new members, and members from their ministry:
    - Removes the ministry affiliation only (does NOT deactivate member portal account)
    - Person is notified via email about removal (if email is on file)
    - Person can still join other ministries through public registration forms

## Environment Configuration
The application uses environment-aware URL generation to ensure consistent behavior across development and production:
- **APP_URL**: Set in production (e.g., `https://zowehlife.com`) for all email links and URLs
- **REPLIT_DEV_DOMAIN**: Automatically available in development for dev URLs
- **Centralized URL Utility**: `server/utils/url.ts` provides `getBaseUrl()` and `buildUrl()` functions used across the application
- All components use dynamic paths via `useBasePath()` (frontend routes) and `useApiBasePath()` (API endpoints)

## External Dependencies
- **PostgreSQL**: Primary database for data storage.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database.
- **Replit Object Storage**: Stores uploaded church logos.
- **OpenAI API**: Powers the AI Text Helper for generating and refining email content (gpt-5.2 model).
- **Jitsi Meet**: Integrated for generating unique video conferencing links for follow-ups.
- **Stripe**: Payment processing for ministry subscription plans, managed via Replit connector (sandbox mode).