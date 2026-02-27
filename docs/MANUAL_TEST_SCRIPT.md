# Zoweh Life – Manual Test Script for QA

This document provides a structured manual test script for QA testers. Tests are organized into three categories: **Landing Page**, **Ministry Admin**, and **Ministry Leader**. Use the checkboxes to record results.

**Prerequisites**
- Application running (e.g. `http://localhost:3000` or staging URL).
- Test accounts: Ministry Admin, Ministry Leader (and optionally Platform Admin).
- Supported browser (Chrome, Firefox, Safari, or Edge); test on at least one desktop and one mobile viewport.

**Legend**
- **P** = Pass  
- **F** = Fail  
- **N/A** = Not applicable  
- **Notes**: Brief description of failure or deviation.

---

## 1. Landing Page Functionality

**Base URL:** `/` (Home)

### 1.1 Navigation & layout

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 1.1.1 | Open the home page. | Page loads; Zoweh Life logo visible; no console errors. | | |
| 1.1.2 | Check header: logo, nav links (Home, Salvation, Journey, Contact), Ministry Login, Member Portal. | All elements visible and clickable. | | |
| 1.1.3 | Click each nav link: Home, Salvation, Journey, Contact. | Correct page loads for each (/, /salvation, /journey, /contact-us). | | |
| 1.1.4 | Click **Ministry Login**. | Redirects to `/login`. | | |
| 1.1.5 | Click **Member Portal**. | Redirects to `/member-portal/login`. | | |
| 1.1.6 | Resize to mobile width; open hamburger/menu. | Mobile menu opens; same links available. | | |
| 1.1.7 | Change language (if language selector present). | Labels/translations update. | | |
| 1.1.8 | Toggle dark/light theme (if present). | Theme switches; content readable. | | |

### 1.2 Hero & primary CTAs

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 1.2.1 | On home, verify hero: headline, short description, and CTA buttons. | Hero text and buttons visible. | | |
| 1.2.2 | Click primary CTA (e.g. “Learn About Salvation”). | Navigates to Salvation page. | | |
| 1.2.3 | Go back; click “Request Prayer” (or equivalent). | Navigates to Contact / prayer request page. | | |
| 1.2.4 | Go back; click “Contact Us”. | Navigates to Contact Us page. | | |

### 1.3 Feature / path cards (Discover Salvation, Grow in Faith, Find Community)

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 1.3.1 | Scroll to the three cards (Discover Salvation, Grow in Faith, Find Community). | All three cards visible with title and description. | | |
| 1.3.2 | Click “Learn More” (or similar) on Discover Salvation. | Goes to `/salvation`. | | |
| 1.3.3 | Return; click “Start Journey” (or similar) on Grow in Faith. | Goes to `/journey`. | | |
| 1.3.4 | Return; click “Get Connected” (or similar) on Find Community. | Goes to Contact/prayer or connect page. | | |

### 1.4 Bottom CTA section (two cards)

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 1.4.1 | Scroll to the two CTA cards (e.g. “Ready to take the next step?” and “Ready to lead your ministry?”). | Both cards visible with title, description, and button. | | |
| 1.4.2 | Click “Contact Us” on the first card. | Navigates to Contact Us page. | | |
| 1.4.3 | Return; click “Sign Up Ministry” (or equivalent) on the second card. | Navigates to Ministry registration page (`/register-ministry`). | | |

### 1.5 Footer

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 1.5.1 | Scroll to footer. | Logo, Quick Links, and “For Ministries” (or similar) section visible. | | |
| 1.5.2 | Click each Quick Link (Salvation, Journey, Prayer, Contact Us). | Each goes to the correct page. | | |
| 1.5.3 | Click “Ministry Sign Up” (or “Register a Ministry”) under For Ministries. | Goes to `/register-ministry`. | | |
| 1.5.4 | Check copyright text. | Current year and “Zoweh Life” (or similar) shown. | | |

### 1.6 Public content pages (no login)

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 1.6.1 | Open `/salvation`. | Salvation content loads; nav and footer same as home. | | |
| 1.6.2 | Open `/journey`. | Journey content loads. | | |
| 1.6.3 | Open `/contact` and submit a prayer request (if form present). | Form submits; success or confirmation message. | | |
| 1.6.4 | Open `/contact-us` and submit contact form (if present). | Form submits; success or confirmation message. | | |
| 1.6.5 | Open `/register-ministry`. | Ministry registration flow starts (steps/plan selection visible). | | |

---

## 2. Ministry Admin Functionality

**Prerequisite:** Log in as **Ministry Admin**.

### 2.1 Login & dashboard

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 2.1.1 | Go to `/login`; enter Ministry Admin email and password; submit. | Login succeeds; redirect to Ministry Admin dashboard. | | |
| 2.1.2 | Verify sidebar: ministry/church name or Zoweh Life logo, and nav groups (Dashboard, People, Engagement, Management, Configuration). | Sidebar shows correct role and sections. | | |
| 2.1.3 | Open **Dashboard**. | Dashboard loads; stats/cards (e.g. Converts, Members, Follow-ups) visible. | | |
| 2.1.4 | If no ministry logo is set: confirm Zoweh Life logo in sidebar. Then upload a logo in Settings and reload. | Logo updates to ministry logo after upload. | | |

### 2.2 People: Converts

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 2.2.1 | Go to **People → Converts**. | Converts list loads (may be empty). | | |
| 2.2.2 | If “Add convert” / “Generate link” exists: generate or copy public convert link. | Link is generated or copied. | | |
| 2.2.3 | Open convert link in incognito/new browser; submit the convert form. | Submission succeeds. | | |
| 2.2.4 | Back in admin, refresh Converts list. | New convert appears in list. | | |
| 2.2.5 | Open a convert’s detail page. | Detail view shows convert info and follow-up status. | | |

### 2.3 People: New Members & Guests

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 2.3.1 | Go to **People → New Members & Guests**. | List loads. | | |
| 2.3.2 | If possible, add a new member/guest (via link or form). | New entry appears. | | |
| 2.3.3 | Open one entry’s detail. | Detail page loads with relevant info. | | |

### 2.4 People: Members

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 2.4.1 | Go to **People → Members**. | Members list loads. | | |
| 2.4.2 | Open a member detail (if any). | Detail page loads. | | |

### 2.5 Engagement: Follow-ups

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 2.5.1 | Go to **Engagement → Follow-ups**. | Follow-ups list/today view loads. | | |
| 2.5.2 | Open a follow-up (if any); complete or add notes. | Can complete or save notes. | | |
| 2.5.3 | From a convert/new member, schedule a follow-up (date, time, notification method: Email, SMS, MMS, etc.). | Follow-up is created; appears in list. | | |

### 2.6 Engagement: Mass Follow-up & Announcements

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 2.6.1 | Go to **Engagement → Mass Follow-up**. | Page loads; can select audience or send (if supported). | | |
| 2.6.2 | Go to **Engagement → Announcements**. | Announcements list/form loads. | | |

### 2.7 Management: Prayer requests, Contact requests, Leaders, Member accounts

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 2.7.1 | Go to **Management → Prayer Requests**. | Prayer requests list loads. | | |
| 2.7.2 | Go to **Management → Contact Requests**. | Contact requests list loads. | | |
| 2.7.3 | Go to **Management → Manage Leaders**. | Leaders list loads; can add/invite or edit (if supported). | | |
| 2.7.4 | Go to **Management → Member Accounts**. | Member accounts list loads. | | |

### 2.8 Configuration: Message Automation, Form settings, Settings, Billing

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 2.8.1 | Go to **Configuration → Message Automation Setup** (or “Messaging”). | Message automation page loads; Converts, Members, New Members & Guests sections or tabs visible. | | |
| 2.8.2 | Change a time rule or message template (if editable); save. | Changes save; no error toast. | | |
| 2.8.3 | Go to **Configuration → Form Settings**. | Form settings (public forms, tokens, etc.) load. | | |
| 2.8.4 | Go to **Configuration → Settings**. | Church/ministry settings load (name, location, logo, etc.). | | |
| 2.8.5 | Upload a ministry logo (choose image, crop if prompted, save). | Upload succeeds; “Logo updated” (or similar); logo appears in sidebar. | | |
| 2.8.6 | Remove logo (if option exists). | Logo removed; Zoweh Life logo shows again in sidebar. | | |
| 2.8.7 | Go to **Configuration → Billing**. | Billing/subscription page loads (may show plan or “Contact us”). | | |

### 2.9 Logout

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 2.9.1 | Open user menu in sidebar; click Logout. | Session ends; redirect to login or home. | | |

---

## 3. Ministry Leader Functionality

**Prerequisite:** Log in as **Ministry Leader**.

### 3.1 Login & dashboard

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 3.1.1 | Go to `/login`; enter Ministry Leader credentials; submit. | Login succeeds; redirect to Leader dashboard. | | |
| 3.1.2 | Verify sidebar: ministry name or logo, and nav (Dashboard, People, Engagement, Management). No “Configuration” or “Billing” (leader has fewer options than Ministry Admin). | Sidebar matches leader role. | | |
| 3.1.3 | Open **Dashboard**. | Dashboard loads; stats and quick actions visible. | | |

### 3.2 People: Converts

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 3.2.1 | Go to **People → Converts**. | Converts list loads. | | |
| 3.2.2 | Generate or copy public convert link (if available). | Link generated. | | |
| 3.2.3 | Open a convert detail; schedule a follow-up (date, time, notification: Email, SMS, MMS, etc.). | Follow-up saves; appears in Follow-ups. | | |
| 3.2.4 | Add a note or complete a follow-up from convert detail. | Note/completion saves. | | |

### 3.3 People: New Members & Guests / Members

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 3.3.1 | Go to **People → New Members & Guests**. | List loads. | | |
| 3.3.2 | Go to **People → Members**. | Members list loads. | | |
| 3.3.3 | Open a new member or member detail. | Detail page loads; follow-up/notes available if supported. | | |

### 3.4 Engagement: Follow-ups, Mass Follow-up, Announcements

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 3.4.1 | Go to **Engagement → Follow-ups**. | Follow-ups list/today view loads. | | |
| 3.4.2 | Complete or reschedule a follow-up. | Action saves. | | |
| 3.4.3 | Go to **Engagement → Mass Follow-up**. | Page loads. | | |
| 3.4.4 | Go to **Engagement → Announcements**. | Announcements page loads. | | |

### 3.5 Management: Prayer requests, Contact requests

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 3.5.1 | Go to **Management → Prayer Requests**. | Prayer requests list loads. | | |
| 3.5.2 | Go to **Management → Contact Requests**. | Contact requests list loads. | | |

### 3.6 Leader-specific restrictions

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 3.6.1 | Confirm there is no **Settings**, **Billing**, **Form Settings**, or **Message Automation Setup** in sidebar. | Leader cannot access these configuration areas. | | |
| 3.6.2 | Confirm there is no **Manage Leaders** or **Member Accounts** in sidebar. | Leader cannot manage leaders or member accounts. | | |
| 3.6.3 | Manually open `/ministry-admin/settings` while logged in as Leader. | Redirect or 403 (access denied). | | |

### 3.7 Logout

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| 3.7.1 | Logout from user menu. | Session ends; redirect to login or home. | | |

---

## Optional / Cross-cutting

| # | Test step | Expected result | P/F | Notes |
|---|-----------|-----------------|-----|-------|
| O.1 | On any page, use browser Back/Forward. | Navigation works without broken state. | | |
| O.2 | Refresh the page while logged in. | User stays logged in (session persists). | | |
| O.3 | Test with a slow network (throttling). | Loading states appear; no permanent spinners or blank screens. | | |
| O.4 | Submit a form with invalid or empty required fields. | Validation messages appear; form does not submit. | | |

---

## Summary

- **Landing Page:** _____ Pass / _____ Fail  
- **Ministry Admin:** _____ Pass / _____ Fail  
- **Ministry Leader:** _____ Pass / _____ Fail  

**Tester name:** _______________________  
**Date:** _______________________  
**Build/Environment:** _______________________  
**Overall notes:** _______________________________________________________
