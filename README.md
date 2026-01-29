# Zoweh Life

A beginner-friendly web application for church organizations to track new converts across multiple churches. Leaders can log in, add new converts belonging to their church, and log follow-up check-in updates over time.

## Features

### Public Site (No Login Required)
- **Home Page**: Welcome message with salvation call-to-action
- **Salvation Page**: Gospel presentation with prayer of salvation
- **Journey Page**: New believer's guide (Bible reading, prayer, community, baptism, discipleship)
- **Contact Page**: Prayer request and contact form

### Admin Features
- Dashboard with metrics (churches, leaders, converts, follow-ups due)
- Church management (create/edit churches)
- Leader management (create leaders, assign to churches, reset passwords)
- View all converts across churches with filtering
- Export converts to CSV
- View prayer requests

### Leader Features
- Dashboard with church-specific metrics
- Manage converts for their assigned church
- Add/edit convert information
- Record check-in notes with outcomes
- Schedule follow-up dates
- Download calendar invites (.ics) for follow-ups

## Setup Instructions

### 1. Add Required Secrets

In Replit, go to the **Secrets** tab and add:

| Secret Name | Description |
|-------------|-------------|
| `ADMIN_SETUP_KEY` | A secret key for creating the first admin account (choose any secure value) |
| `SESSION_SECRET` | A secret key for session encryption (choose any secure random string) |

### 2. Create the First Admin Account

1. Run the application
2. Navigate to `/setup`
3. Enter:
   - Full Name
   - Email
   - Password (minimum 8 characters)
   - Setup Key (the `ADMIN_SETUP_KEY` you set in secrets)
4. Click "Create Admin Account"

**Note**: The setup page is automatically disabled after the first admin is created.

### 3. Admin Creates Churches and Leaders

1. Log in as admin at `/login`
2. Go to **Churches** → Click **Add Church**
3. Enter church name and location
4. Go to **Leaders** → Click **Add Leader**
5. Enter leader details and assign to a church
6. Share the login credentials with the leader

### 4. Leaders Add Converts and Check-ins

1. Leader logs in at `/login`
2. Go to **My Converts** → Click **Add Convert**
3. Enter convert information (name, phone, email, notes)
4. Click on a convert to view their profile
5. Click **Add Check-in** to record a follow-up
6. Set a next follow-up date to track future check-ins

## Data Model

- **Churches**: id, name, location
- **Users**: id, role (ADMIN/LEADER), name, email, password_hash, church_id
- **Converts**: id, church_id, first_name, last_name, phone, email, address, notes, status
- **Check-ins**: id, convert_id, date, notes, outcome, next_followup_date
- **Prayer Requests**: id, name, phone, email, message, church_preference

## Access Control

- **Admin**: Can view/manage all churches, leaders, converts, and prayer requests
- **Leader**: Can only view/manage converts and check-ins for their assigned church

## Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (Replit managed)
- **Authentication**: Session-based with bcrypt password hashing

## Deployment

1. Ensure all secrets are configured
2. Create the first admin account via `/setup`
3. Click "Publish" in Replit to deploy
4. Your app will be available at your Replit URL

## Optional: Email Notifications

Email notifications are not configured by default. The app works fully without email.

If you want to enable email notifications, you would need to:
1. Add `SENDGRID_API_KEY` and `EMAIL_FROM` secrets
2. Implement email sending in the routes (not included in MVP)
