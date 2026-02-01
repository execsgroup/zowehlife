import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, date, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "MINISTRY_ADMIN", "LEADER"]);
export const convertStatusEnum = pgEnum("convert_status", ["NEW", "SCHEDULED", "CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "REFERRED", "NOT_COMPLETED", "NEVER_CONTACTED", "ACTIVE", "IN_PROGRESS", "INACTIVE"]);
export const checkinOutcomeEnum = pgEnum("checkin_outcome", ["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER", "NOT_COMPLETED"]);
export const accountRequestStatusEnum = pgEnum("account_request_status", ["PENDING", "APPROVED", "DENIED"]);
export const followUpStageEnum = pgEnum("follow_up_stage", ["NEW", "SCHEDULED", "FIRST_COMPLETED", "INITIATE_SECOND", "SECOND_SCHEDULED", "SECOND_COMPLETED", "INITIATE_FINAL", "FINAL_SCHEDULED", "FINAL_COMPLETED"]);

// Churches table
export const churches = pgTable("churches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location"),
  logoUrl: text("logo_url"),
  publicToken: text("public_token").unique(),
  newMemberToken: text("new_member_token").unique(),
  memberToken: text("member_token").unique(),
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
  videoLink: text("video_link"),
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
  videoLink: text("video_link"),
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
  videoLink: text("video_link"),
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
  checkinId: varchar("checkin_id").notNull().references(() => checkins.id),
  reminderType: text("reminder_type").notNull(), // 'INITIAL' or 'DAY_BEFORE'
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

export type ArchivedMinistry = typeof archivedMinistries.$inferSelect;
export type InsertArchivedMinistry = z.infer<typeof insertArchivedMinistrySchema>;
