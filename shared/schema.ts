import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "LEADER"]);
export const convertStatusEnum = pgEnum("convert_status", ["NEW", "ACTIVE", "IN_PROGRESS", "CONNECTED", "INACTIVE"]);
export const checkinOutcomeEnum = pgEnum("checkin_outcome", ["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]);
export const accountRequestStatusEnum = pgEnum("account_request_status", ["PENDING", "APPROVED", "DENIED"]);

// Churches table
export const churches = pgTable("churches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location"),
  logoUrl: text("logo_url"),
  publicToken: text("public_token").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: userRoleEnum("role").notNull().default("LEADER"),
  fullName: text("full_name").notNull(),
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
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  churchName: text("church_name").notNull(),
  reason: text("reason"),
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

// Public convert submission schema (for self-submissions via church link)
export const publicConvertSubmissionSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  birthDay: z.string().optional(),
  birthMonth: z.string().optional(),
  country: z.string().optional(),
  salvationDecision: z.enum(["I just made Jesus Christ my Lord and Savior", "I have rededicated my life to Jesus"]).optional(),
  summaryNotes: z.string().optional(),
  wantsContact: z.enum(["Yes", "No"]).optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
  isChurchMember: z.enum(["Yes", "No"]).optional(),
  prayerRequest: z.string().optional(),
});

export type PublicConvertSubmission = z.infer<typeof publicConvertSubmissionSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// Admin setup schema
export const adminSetupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
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

export type LoginData = z.infer<typeof loginSchema>;
export type AdminSetupData = z.infer<typeof adminSetupSchema>;
