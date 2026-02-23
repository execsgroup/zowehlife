import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, date, pgEnum, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "MINISTRY_ADMIN", "LEADER"]);
export const convertStatusEnum = pgEnum("convert_status", ["NEW", "SCHEDULED", "CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "REFERRED", "NOT_COMPLETED", "NEVER_CONTACTED", "ACTIVE", "IN_PROGRESS", "INACTIVE"]);
export const checkinOutcomeEnum = pgEnum("checkin_outcome", ["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER", "NOT_COMPLETED", "NEEDS_FOLLOWUP"]);
export const accountRequestStatusEnum = pgEnum("account_request_status", ["PENDING", "APPROVED", "DENIED"]);
export const followUpStageEnum = pgEnum("follow_up_stage", ["NEW", "CONTACT_NEW_MEMBER", "SCHEDULED", "FIRST_COMPLETED", "INITIATE_SECOND", "SECOND_SCHEDULED", "SECOND_COMPLETED", "INITIATE_FINAL", "FINAL_SCHEDULED", "FINAL_COMPLETED"]);

// Member account enums
export const memberAccountStatusEnum = pgEnum("member_account_status", ["PENDING_CLAIM", "ACTIVE", "SUSPENDED"]);
export const affiliationTypeEnum = pgEnum("affiliation_type", ["convert", "new_member", "member"]);
export const prayerRequestStatusEnum = pgEnum("prayer_request_status", ["SUBMITTED", "BEING_PRAYED_FOR", "FOLLOWUP_SCHEDULED", "ANSWERED", "CLOSED"]);
export const massFollowupStatusEnum = pgEnum("mass_followup_status", ["SCHEDULED", "COMPLETED", "CANCELLED"]);
export const massFollowupCategoryEnum = pgEnum("mass_followup_category", ["converts", "new_members", "members", "guests"]);
export const ministryPlanEnum = pgEnum("ministry_plan", ["free", "foundations", "formation", "stewardship"]);
export const notificationMethodEnum = pgEnum("notification_method", ["email", "sms", "mms"]);

// Subscription status enum
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "suspended", "canceled", "free"]);

// Form type enum for form configurations
export const formTypeEnum = pgEnum("form_type", ["convert", "new_member", "member"]);

// Scheduled announcement status enum
export const scheduledAnnouncementStatusEnum = pgEnum("scheduled_announcement_status", ["PENDING", "SENT", "FAILED", "CANCELLED"]);

// Churches table
export const churches = pgTable("churches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location"),
  logoUrl: text("logo_url"),
  publicToken: text("public_token").unique(),
  newMemberToken: text("new_member_token").unique(),
  memberToken: text("member_token").unique(),
  plan: ministryPlanEnum("plan").notNull().default("foundations"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: userRoleEnum("role").notNull().default("LEADER"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  churchId: varchar("church_id").references(() => churches.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Converts table
export const converts = pgTable("converts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  birthDay: text("birth_day"),
  birthMonth: text("birth_month"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  country: text("country"),
  salvationDecision: text("salvation_decision"),
  summaryNotes: text("summary_notes"),
  status: convertStatusEnum("status").notNull().default("NEW"),
  selfSubmitted: text("self_submitted").default("false"),
  wantsContact: text("wants_contact"),
  gender: text("gender"),
  ageGroup: text("age_group"),
  isChurchMember: text("is_church_member"),
  prayerRequest: text("prayer_request"),
  customFieldData: jsonb("custom_field_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Check-ins table
export const checkins = pgTable("checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  convertId: varchar("convert_id").notNull().references(() => converts.id),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  checkinDate: date("checkin_date").notNull(),
  notes: text("notes"),
  outcome: checkinOutcomeEnum("outcome").notNull(),
  nextFollowupDate: date("next_followup_date"),
  nextFollowupTime: text("next_followup_time"),
  videoLink: text("video_link"),
  notificationMethod: notificationMethodEnum("notification_method").notNull().default("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New Members table
export const newMembers = pgTable("new_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  country: text("country"),
  gender: text("gender"),
  ageGroup: text("age_group"),
  notes: text("notes"),
  status: convertStatusEnum("status").notNull().default("NEW"),
  followUpStage: followUpStageEnum("follow_up_stage").notNull().default("NEW"),
  lastFollowUpCompletedAt: timestamp("last_follow_up_completed_at"),
  selfSubmitted: text("self_submitted").default("false"),
  customFieldData: jsonb("custom_field_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// New Member Check-ins table
export const newMemberCheckins = pgTable("new_member_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  newMemberId: varchar("new_member_id").notNull().references(() => newMembers.id),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  checkinDate: date("checkin_date").notNull(),
  notes: text("notes"),
  outcome: checkinOutcomeEnum("outcome").notNull(),
  nextFollowupDate: date("next_followup_date"),
  nextFollowupTime: text("next_followup_time"),
  videoLink: text("video_link"),
  notificationMethod: notificationMethodEnum("notification_method").notNull().default("email"),
  customReminderSubject: text("custom_reminder_subject"),
  customReminderMessage: text("custom_reminder_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Members table
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  country: text("country"),
  gender: text("gender"),
  ageGroup: text("age_group"),
  memberSince: date("member_since"),
  notes: text("notes"),
  selfSubmitted: text("self_submitted").default("false"),
  customFieldData: jsonb("custom_field_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Member Check-ins table
export const memberCheckins = pgTable("member_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  checkinDate: date("checkin_date").notNull(),
  notes: text("notes"),
  outcome: checkinOutcomeEnum("outcome").notNull(),
  nextFollowupDate: date("next_followup_date"),
  nextFollowupTime: text("next_followup_time"),
  videoLink: text("video_link"),
  notificationMethod: notificationMethodEnum("notification_method").notNull().default("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Guests table
export const guests = pgTable("guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  country: text("country"),
  gender: text("gender"),
  ageGroup: text("age_group"),
  notes: text("notes"),
  sourceType: text("source_type"),
  sourceId: varchar("source_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Guest Check-ins table
export const guestCheckins = pgTable("guest_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestId: varchar("guest_id").notNull().references(() => guests.id),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  checkinDate: date("checkin_date").notNull(),
  notes: text("notes"),
  outcome: checkinOutcomeEnum("outcome").notNull(),
  nextFollowupDate: date("next_followup_date"),
  nextFollowupTime: text("next_followup_time"),
  videoLink: text("video_link"),
  notificationMethod: notificationMethodEnum("notification_method").notNull().default("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SMS/MMS Usage tracking per ministry per billing period
export const smsUsage = pgTable("sms_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  billingPeriod: text("billing_period").notNull(),
  smsCount: integer("sms_count").notNull().default(0),
  mmsCount: integer("mms_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Scheduled announcements table
export const scheduledAnnouncements = pgTable("scheduled_announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  notificationMethod: notificationMethodEnum("notification_method").notNull().default("email"),
  smsMessage: text("sms_message"),
  mmsMediaUrl: text("mms_media_url"),
  imageUrl: text("image_url"),
  recipientGroups: text("recipient_groups").array().notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: scheduledAnnouncementStatusEnum("status").notNull().default("PENDING"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduledAnnouncementSchema = createInsertSchema(scheduledAnnouncements).omit({
  id: true,
  sentAt: true,
  errorMessage: true,
  createdAt: true,
});

export type ScheduledAnnouncement = typeof scheduledAnnouncements.$inferSelect;
export type InsertScheduledAnnouncement = z.infer<typeof insertScheduledAnnouncementSchema>;

// Mass follow-ups table - groups multiple people into one follow-up session
export const massFollowups = pgTable("mass_followups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  category: massFollowupCategoryEnum("category").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time"),
  notes: text("notes"),
  completionNotes: text("completion_notes"),
  status: massFollowupStatusEnum("status").notNull().default("SCHEDULED"),
  customSubject: text("custom_subject"),
  customMessage: text("custom_message"),
  videoLink: text("video_link"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Mass follow-up participants - links individuals to a mass follow-up
export const massFollowupParticipants = pgTable("mass_followup_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  massFollowupId: varchar("mass_followup_id").notNull().references(() => massFollowups.id),
  personCategory: massFollowupCategoryEnum("person_category").notNull(),
  convertId: varchar("convert_id").references(() => converts.id),
  newMemberId: varchar("new_member_id").references(() => newMembers.id),
  memberId: varchar("member_id").references(() => members.id),
  guestId: varchar("guest_id").references(() => guests.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  attended: text("attended").default("false"),
  videoLink: text("video_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Prayer requests table
export const prayerRequests = pgTable("prayer_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  message: text("message").notNull(),
  churchPreference: text("church_preference"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit log table
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Account requests table (for prospective leaders)
export const accountRequests = pgTable("account_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  churchId: varchar("church_id").references(() => churches.id),
  churchName: text("church_name").notNull(),
  reason: text("reason"),
  status: accountRequestStatusEnum("status").notNull().default("PENDING"),
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ministry requests table (for prospective ministries to register)
export const ministryRequests = pgTable("ministry_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ministryName: text("ministry_name").notNull(),
  location: text("location"),
  adminFirstName: text("admin_first_name").notNull(),
  adminLastName: text("admin_last_name").notNull(),
  adminEmail: text("admin_email").notNull(),
  adminPhone: text("admin_phone"),
  description: text("description"),
  plan: ministryPlanEnum("plan").notNull().default("foundations"),
  stripeSessionId: text("stripe_session_id"),
  paymentStatus: text("payment_status").default("unpaid"),
  status: accountRequestStatusEnum("status").notNull().default("PENDING"),
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const churchesRelations = relations(churches, ({ many }) => ({
  users: many(users),
  converts: many(converts),
  checkins: many(checkins),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  church: one(churches, {
    fields: [users.churchId],
    references: [churches.id],
  }),
  converts: many(converts),
  checkins: many(checkins),
}));

export const convertsRelations = relations(converts, ({ one, many }) => ({
  church: one(churches, {
    fields: [converts.churchId],
    references: [churches.id],
  }),
  createdBy: one(users, {
    fields: [converts.createdByUserId],
    references: [users.id],
  }),
  checkins: many(checkins),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
  convert: one(converts, {
    fields: [checkins.convertId],
    references: [converts.id],
  }),
  church: one(churches, {
    fields: [checkins.churchId],
    references: [churches.id],
  }),
  createdBy: one(users, {
    fields: [checkins.createdByUserId],
    references: [users.id],
  }),
}));

// Email reminders tracking table
export const emailReminders = pgTable("email_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checkinId: varchar("checkin_id").notNull(),
  reminderType: text("reminder_type").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

// Contact requests table
export const contactRequests = pgTable("contact_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  churchPreference: text("church_preference"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Archived ministries table (backup for deleted ministries)
export const archivedMinistries = pgTable("archived_ministries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalChurchId: varchar("original_church_id").notNull(),
  churchName: text("church_name").notNull(),
  churchLocation: text("church_location"),
  churchLogoUrl: text("church_logo_url"),
  deletedByUserId: varchar("deleted_by_user_id"),
  deletedByRole: text("deleted_by_role").notNull(), // 'ADMIN' or 'MINISTRY_ADMIN'
  backupData: jsonb("backup_data").notNull(), // Contains all ministry data
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
});

// Persons table - normalized identity keyed by email
export const persons = pgTable("persons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Member accounts table - login credentials for members
export const memberAccounts = pgTable("member_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").notNull().unique().references(() => persons.id),
  passwordHash: text("password_hash"),
  status: memberAccountStatusEnum("status").notNull().default("PENDING_CLAIM"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ministry affiliations table - links persons to ministries
export const ministryAffiliations = pgTable("ministry_affiliations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").notNull().references(() => persons.id),
  ministryId: varchar("ministry_id").notNull().references(() => churches.id),
  relationshipType: affiliationTypeEnum("relationship_type").notNull().default("convert"),
  convertId: varchar("convert_id").references(() => converts.id),
  newMemberId: varchar("new_member_id").references(() => newMembers.id),
  memberId: varchar("member_id").references(() => members.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Account claim tokens table - for secure password setup
export const accountClaimTokens = pgTable("account_claim_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberAccountId: varchar("member_account_id").notNull().references(() => memberAccounts.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Member prayer requests table - for member portal
export const memberPrayerRequests = pgTable("member_prayer_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").notNull().references(() => persons.id),
  ministryId: varchar("ministry_id").notNull().references(() => churches.id),
  request: text("request").notNull(),
  isPrivate: text("is_private").default("true"),
  status: prayerRequestStatusEnum("status").notNull().default("SUBMITTED"),
  leaderNotes: text("leader_notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Journal entries table - private by default, can be shared with leaders
export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").notNull().references(() => persons.id),
  title: text("title"),
  content: text("content").notNull(),
  isPrivate: text("is_private").default("true"),
  sharedWithMinistryId: varchar("shared_with_ministry_id").references(() => churches.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Form Configurations table - stores per-ministry form customization
export const formConfigurations = pgTable("form_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id),
  formType: formTypeEnum("form_type").notNull(),
  title: text("title"),
  heroTitle: text("hero_title"),
  description: text("description"),
  fieldConfig: jsonb("field_config").notNull().default(sql`'[]'::jsonb`),
  customFields: jsonb("custom_fields").notNull().default(sql`'[]'::jsonb`),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Password Reset Tokens table
export const accountTypeEnum = pgEnum("account_type", ["staff", "member"]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  tokenHash: varchar("token_hash").notNull(),
  accountType: accountTypeEnum("account_type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Insert schemas
export const insertChurchSchema = createInsertSchema(churches).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertConvertSchema = createInsertSchema(converts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCheckinSchema = createInsertSchema(checkins).omit({
  id: true,
  createdAt: true,
});

export const insertPrayerRequestSchema = createInsertSchema(prayerRequests).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true,
});

export const insertAccountRequestSchema = createInsertSchema(accountRequests).omit({
  id: true,
  status: true,
  reviewedByUserId: true,
  reviewedAt: true,
  createdAt: true,
});

export const insertMinistryRequestSchema = createInsertSchema(ministryRequests).omit({
  id: true,
  status: true,
  reviewedByUserId: true,
  reviewedAt: true,
  createdAt: true,
});

export const insertContactRequestSchema = createInsertSchema(contactRequests).omit({
  id: true,
  createdAt: true,
});

export const insertArchivedMinistrySchema = createInsertSchema(archivedMinistries).omit({
  id: true,
  archivedAt: true,
});

export const insertNewMemberSchema = createInsertSchema(newMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNewMemberCheckinSchema = createInsertSchema(newMemberCheckins).omit({
  id: true,
  createdAt: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemberCheckinSchema = createInsertSchema(memberCheckins).omit({
  id: true,
  createdAt: true,
});

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGuestCheckinSchema = createInsertSchema(guestCheckins).omit({
  id: true,
  createdAt: true,
});

export const insertSmsUsageSchema = createInsertSchema(smsUsage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMassFollowupSchema = createInsertSchema(massFollowups).omit({
  id: true,
  createdAt: true,
});

export const insertMassFollowupParticipantSchema = createInsertSchema(massFollowupParticipants).omit({
  id: true,
  createdAt: true,
});

export const insertPersonSchema = createInsertSchema(persons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemberAccountSchema = createInsertSchema(memberAccounts).omit({
  id: true,
  createdAt: true,
});

export const insertMinistryAffiliationSchema = createInsertSchema(ministryAffiliations).omit({
  id: true,
  createdAt: true,
});

export const insertAccountClaimTokenSchema = createInsertSchema(accountClaimTokens).omit({
  id: true,
  createdAt: true,
});

export const insertMemberPrayerRequestSchema = createInsertSchema(memberPrayerRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormConfigurationSchema = createInsertSchema(formConfigurations).omit({
  id: true,
  updatedAt: true,
});

// Form field config type definitions
export const formFieldConfigSchema = z.object({
  key: z.string(),
  label: z.string(),
  visible: z.boolean().default(true),
  required: z.boolean().default(false),
  locked: z.boolean().default(false),
});

export const customFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["text", "dropdown", "yes_no"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

export const formConfigUpdateSchema = z.object({
  title: z.string().optional(),
  heroTitle: z.string().optional(),
  description: z.string().optional(),
  fieldConfig: z.array(formFieldConfigSchema),
  customFields: z.array(customFieldSchema),
});

export type FormFieldConfig = z.infer<typeof formFieldConfigSchema>;
export type CustomField = z.infer<typeof customFieldSchema>;
export type FormConfigUpdate = z.infer<typeof formConfigUpdateSchema>;

// Public convert submission schema (for self-submissions via church link)
export const publicConvertSubmissionSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  salvationDecision: z.enum(["I just made Jesus Christ my Lord and Savior", "I have rededicated my life to Jesus"]).optional(),
  wantsContact: z.enum(["Yes", "No"]).optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
  isChurchMember: z.enum(["Yes", "No"]).optional(),
  prayerRequest: z.string().optional(),
  customFieldData: z.record(z.string(), z.any()).optional(),
});

export type PublicConvertSubmission = z.infer<typeof publicConvertSubmissionSchema>;

// Public new member submission schema (for self-submissions via church link)
export const publicNewMemberSubmissionSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
  notes: z.string().optional(),
  customFieldData: z.record(z.string(), z.any()).optional(),
});

export type PublicNewMemberSubmission = z.infer<typeof publicNewMemberSubmissionSchema>;

// Public member submission schema (for self-submissions via church link)
export const publicMemberSubmissionSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
  memberSince: z.string().optional(),
  notes: z.string().optional(),
  customFieldData: z.record(z.string(), z.any()).optional(),
});

export type PublicMemberSubmission = z.infer<typeof publicMemberSubmissionSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// Admin setup schema
export const adminSetupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  setupKey: z.string().min(1, "Setup key is required"),
});

// Types
export type Church = typeof churches.$inferSelect;
export type InsertChurch = z.infer<typeof insertChurchSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Convert = typeof converts.$inferSelect;
export type InsertConvert = z.infer<typeof insertConvertSchema>;

export type Checkin = typeof checkins.$inferSelect;
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;

export type PrayerRequest = typeof prayerRequests.$inferSelect;
export type InsertPrayerRequest = z.infer<typeof insertPrayerRequestSchema>;

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type AccountRequest = typeof accountRequests.$inferSelect;
export type InsertAccountRequest = z.infer<typeof insertAccountRequestSchema>;

export type MinistryRequest = typeof ministryRequests.$inferSelect;
export type InsertMinistryRequest = z.infer<typeof insertMinistryRequestSchema>;

export type ContactRequest = typeof contactRequests.$inferSelect;
export type InsertContactRequest = z.infer<typeof insertContactRequestSchema>;

export type LoginData = z.infer<typeof loginSchema>;
export type AdminSetupData = z.infer<typeof adminSetupSchema>;

export type NewMember = typeof newMembers.$inferSelect;
export type InsertNewMember = z.infer<typeof insertNewMemberSchema>;

export type NewMemberCheckin = typeof newMemberCheckins.$inferSelect;
export type InsertNewMemberCheckin = z.infer<typeof insertNewMemberCheckinSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type MemberCheckin = typeof memberCheckins.$inferSelect;
export type InsertMemberCheckin = z.infer<typeof insertMemberCheckinSchema>;

export type Guest = typeof guests.$inferSelect;
export type InsertGuest = z.infer<typeof insertGuestSchema>;

export type GuestCheckin = typeof guestCheckins.$inferSelect;
export type InsertGuestCheckin = z.infer<typeof insertGuestCheckinSchema>;

export type SmsUsage = typeof smsUsage.$inferSelect;
export type InsertSmsUsage = z.infer<typeof insertSmsUsageSchema>;

export type MassFollowup = typeof massFollowups.$inferSelect;
export type InsertMassFollowup = z.infer<typeof insertMassFollowupSchema>;

export type MassFollowupParticipant = typeof massFollowupParticipants.$inferSelect;
export type InsertMassFollowupParticipant = z.infer<typeof insertMassFollowupParticipantSchema>;

export type ArchivedMinistry = typeof archivedMinistries.$inferSelect;
export type InsertArchivedMinistry = z.infer<typeof insertArchivedMinistrySchema>;

export type Person = typeof persons.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;

export type MemberAccount = typeof memberAccounts.$inferSelect;
export type InsertMemberAccount = z.infer<typeof insertMemberAccountSchema>;

export type MinistryAffiliation = typeof ministryAffiliations.$inferSelect;
export type InsertMinistryAffiliation = z.infer<typeof insertMinistryAffiliationSchema>;

export type AccountClaimToken = typeof accountClaimTokens.$inferSelect;
export type InsertAccountClaimToken = z.infer<typeof insertAccountClaimTokenSchema>;

export type MemberPrayerRequest = typeof memberPrayerRequests.$inferSelect;
export type InsertMemberPrayerRequest = z.infer<typeof insertMemberPrayerRequestSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export type FormConfiguration = typeof formConfigurations.$inferSelect;
export type InsertFormConfiguration = z.infer<typeof insertFormConfigurationSchema>;

// Member claim account schema
export const claimAccountSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type ClaimAccountData = z.infer<typeof claimAccountSchema>;

// Member login schema
export const memberLoginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type MemberLoginData = z.infer<typeof memberLoginSchema>;

// Member prayer request submission schema
export const memberPrayerRequestSubmissionSchema = z.object({
  requestText: z.string().min(1, "Prayer request is required"),
  isPrivate: z.boolean().optional(),
  ministryId: z.string().optional(),
  category: z.string().optional(),
});

export type MemberPrayerRequestSubmission = z.infer<typeof memberPrayerRequestSubmissionSchema>;
