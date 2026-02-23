# Zoweh Life

## Overview
Zoweh Life is a ministry management web application designed to track new converts across multiple ministries, empowering disciple-making. It features a three-tier role system (Platform Admin, Ministry Admin, Leader) to manage operations, approve leaders, and oversee convert follow-ups, aiming to enhance the reach and impact of ministries.

## User Preferences
- Uses dark/light theme toggle
- Mobile-responsive design with sidebar navigation for dashboard
- **MANDATORY**: All new UI text in any new feature MUST use `t('key')` calls with translations added to all 4 locale files (`en.json`, `es.json`, `fr.json`, `pt.json`). Never hardcode English strings in components.

## System Architecture
The application uses a React frontend and an Express backend with a clear separation of concerns.

### UI/UX Decisions
- **Frontend Framework**: React, styled with TailwindCSS and `shadcn/ui` components.
- **Responsiveness**: Core principle for usability across devices.
- **Theming**: Enterprise Neutral theme with dark/light toggle. Clean, structured admin UI with a single blue accent.
- **Reusable Layout Components**: `PageHeader`, `Section`, `DashboardLayout`.
- **Internationalization (i18n)**: `react-i18next` for English, Spanish, French, Portuguese translations.

### Technical Implementations
- **Authentication**: Session-based with `bcrypt` for password hashing.
- **Authorization**: Three-tier staff (ADMIN, MINISTRY_ADMIN, LEADER) and Member accounts.
- **Database**: PostgreSQL with Drizzle ORM.
- **Routing**: `wouter` for client-side routing.
- **Email Notifications**: Automated reminders for follow-ups.
- **AI Integration**: OpenAI (gpt-5.2) powered AI Text Helper for email drafting.
- **Follow-Up System**: Structured workflow with automated stage progression.
- **Public Registration Links**: Shareable links for forms (Salvation, New Member, Member) with auto-association to churches.
- **Ministry & Leader Registration**: Ministries approved by Platform Admin; Ministry Admins add leaders.
- **Dynamic API Routing**: Role-based API path hooks (`useBasePath`, `useApiBasePath`) for shared components.
- **Shared Page Components**: Common pages used across Leader and Ministry Admin roles via dynamic path resolution.
- **Church Logo Upload**: Leaders upload logos (max 5MB, image only) stored in Replit's Object Storage.
- **Video Conferencing**: Jitsi Meet integration for unique video call links.

### Core Features
- **Convert Management**: Add, update, track converts.
- **Follow-Up Scheduling**: Customizable templates and video call links.
- **Check-in Recording**: Record outcomes and notes.
- **Dashboard Statistics**: Role-based insights.
- **Account Request Management**: Approve/deny ministry/leader requests.
- **Prayer Request Submission**: Public form.
- **Member Portal**: Dedicated portal for converts/members to view journey, follow-ups, prayer requests, journal, and manage multi-ministry affiliations.
- **Member Account System**: Secure provisioning, claim tokens, multi-ministry support, status lifecycle (PENDING_CLAIM, ACTIVE, SUSPENDED).
- **Member Account Management**: View, resend claim tokens, suspend/activate accounts.
- **Ministry Plan Model**: 4-tier subscription system (Free, Foundations, Formation, Stewardship) with Stripe integration.
    - **Auto-Approval System**: Ministries auto-approved upon payment (free tier immediate).
    - **Subscription Lifecycle**: Tracked via Stripe IDs and status.
    - **Stripe Webhook Integration**: Handles payment events and subscription status.
    - **Read-Only Enforcement**: Blocks operations for inactive subscriptions.
    - **Billing Management**: Ministry admins access Stripe Customer Portal.
- **Announcements**: Mass communication to selected recipient groups (Email, SMS, MMS) with scheduling and tracking.
- **Form Customization**: Ministry Admins customize public forms (Salvation, New Member, Member) with editable titles, descriptions, reorderable standard fields, and custom fields (Text, Dropdown, Yes/No).
- **Remove from Ministry**: Remove individuals from ministry affiliation.

## External Dependencies
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: Database interaction.
- **Replit Object Storage**: Stores church logos.
- **OpenAI API**: AI Text Helper.
- **Jitsi Meet**: Video conferencing integration.
- **Stripe**: Payment processing for subscriptions.