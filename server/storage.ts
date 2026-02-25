import {
  churches,
  users,
  converts,
  checkins,
  prayerRequests,
  auditLog,
  accountRequests,
  emailReminders,
  contactRequests,
  ministryRequests,
  newMembers,
  newMemberCheckins,
  members,
  memberCheckins,
  guests,
  guestCheckins,
  archivedMinistries,
  persons,
  memberAccounts,
  ministryAffiliations,
  accountClaimTokens,
  memberPrayerRequests,
  journalEntries,
  type Church,
  type InsertChurch,
  type User,
  type InsertUser,
  type Convert,
  type InsertConvert,
  type Checkin,
  type InsertCheckin,
  type PrayerRequest,
  type InsertPrayerRequest,
  type InsertAuditLog,
  type AccountRequest,
  type InsertAccountRequest,
  type ContactRequest,
  type InsertContactRequest,
  type MinistryRequest,
  type InsertMinistryRequest,
  type NewMember,
  type InsertNewMember,
  type NewMemberCheckin,
  type InsertNewMemberCheckin,
  type Member,
  type InsertMember,
  type MemberCheckin,
  type InsertMemberCheckin,
  type Guest,
  type InsertGuest,
  type GuestCheckin,
  type InsertGuestCheckin,
  type ArchivedMinistry,
  type InsertArchivedMinistry,
  type Person,
  type InsertPerson,
  type MemberAccount,
  type InsertMemberAccount,
  type MinistryAffiliation,
  type InsertMinistryAffiliation,
  type AccountClaimToken,
  type InsertAccountClaimToken,
  type MemberPrayerRequest,
  type InsertMemberPrayerRequest,
  type JournalEntry,
  type InsertJournalEntry,
  massFollowups,
  massFollowupParticipants,
  type MassFollowup,
  type InsertMassFollowup,
  type MassFollowupParticipant,
  type InsertMassFollowupParticipant,
  smsUsage,
  scheduledAnnouncements,
  type ScheduledAnnouncement,
  type InsertScheduledAnnouncement,
  formConfigurations,
  type FormConfiguration,
  passwordResetTokens,
  type PasswordResetToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, lte, gte, lt, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  getAdminCount(): Promise<number>;
  getLeaders(): Promise<User[]>;
  getLeadersByChurch(churchId: string): Promise<User[]>;
  getUsersByChurch(churchId: string): Promise<User[]>;

  // Churches
  getChurch(id: string): Promise<Church | undefined>;
  getChurchByName(name: string): Promise<Church | undefined>;
  getChurchByToken(token: string): Promise<Church | undefined>;
  getChurches(): Promise<Church[]>;
  createChurch(church: InsertChurch): Promise<Church>;
  findOrCreateChurch(name: string): Promise<{ church: Church; created: boolean }>;
  updateChurch(id: string, church: Partial<InsertChurch>): Promise<Church>;
  updateChurchSubscription(id: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionStatus?: "active" | "past_due" | "suspended" | "canceled" | "free" }): Promise<Church>;
  getChurchByStripeCustomerId(customerId: string): Promise<Church | undefined>;
  getChurchByStripeSubscriptionId(subscriptionId: string): Promise<Church | undefined>;
  updateChurchLogo(id: string, logoUrl: string): Promise<void>;
  generateTokenForChurch(id: string): Promise<Church>;

  // SMS Usage
  getSmsUsage(churchId: string, billingPeriod: string): Promise<{ smsCount: number; mmsCount: number }>;
  incrementSmsUsage(churchId: string, billingPeriod: string, type: "sms" | "mms"): Promise<void>;

  // Converts
  getConvert(id: string): Promise<Convert | undefined>;
  getConverts(): Promise<Convert[]>;
  getConvertsByChurch(churchId: string): Promise<Convert[]>;
  createConvert(convert: InsertConvert): Promise<Convert>;
  createPublicConvert(churchId: string, data: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    dateOfBirth?: string;
    country?: string;
    salvationDecision?: string;
    wantsContact?: string;
    gender?: string;
    ageGroup?: string;
    isChurchMember?: string;
    prayerRequest?: string;
    customFieldData?: Record<string, any>;
  }): Promise<Convert>;
  updateConvert(id: string, convert: Partial<InsertConvert>): Promise<Convert>;
  deleteConvert(id: string): Promise<void>;

  // Checkins
  getCheckin(id: string): Promise<Checkin | undefined>;
  getCheckinsByConvert(convertId: string): Promise<Checkin[]>;
  getCheckinsByChurch(churchId: string): Promise<Checkin[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;
  getFollowupsDue(churchId?: string): Promise<Checkin[]>;
  getUpcomingFollowups(churchId: string, userId?: string): Promise<Array<{
    id: string;
    convertId: string;
    convertFirstName: string;
    convertLastName: string;
    convertPhone: string | null;
    convertEmail: string | null;
    nextFollowupDate: string;
    nextFollowupTime: string | null;
    notes: string | null;
    videoLink: string | null;
    scheduledByName: string | null;
  }>>;

  // Prayer Requests
  getPrayerRequests(): Promise<PrayerRequest[]>;
  getPrayerRequestsByChurch(churchName: string): Promise<PrayerRequest[]>;
  createPrayerRequest(request: InsertPrayerRequest): Promise<PrayerRequest>;

  // Contact Requests
  getContactRequests(): Promise<ContactRequest[]>;
  getContactRequestsByChurch(churchName: string): Promise<ContactRequest[]>;
  createContactRequest(request: InsertContactRequest): Promise<ContactRequest>;

  // Audit Log
  createAuditLog(log: InsertAuditLog): Promise<void>;

  // Account Requests
  getAccountRequests(): Promise<AccountRequest[]>;
  getAccountRequestsByChurch(churchId: string): Promise<AccountRequest[]>;
  getPendingAccountRequests(): Promise<AccountRequest[]>;
  getPendingAccountRequestsByChurch(churchId: string): Promise<AccountRequest[]>;
  getAccountRequest(id: string): Promise<AccountRequest | undefined>;
  createAccountRequest(request: InsertAccountRequest): Promise<AccountRequest>;
  updateAccountRequest(id: string, data: Partial<InsertAccountRequest>): Promise<AccountRequest>;
  updateAccountRequestStatus(id: string, status: "APPROVED" | "DENIED", reviewedByUserId: string): Promise<AccountRequest>;

  // Ministry Requests
  getMinistryRequests(): Promise<MinistryRequest[]>;
  getPendingMinistryRequests(): Promise<MinistryRequest[]>;
  getMinistryRequest(id: string): Promise<MinistryRequest | undefined>;
  createMinistryRequest(request: InsertMinistryRequest): Promise<MinistryRequest>;
  updateMinistryRequest(id: string, data: Partial<InsertMinistryRequest>): Promise<MinistryRequest>;
  updateMinistryRequestStatus(id: string, status: "APPROVED" | "DENIED", reviewedByUserId: string): Promise<MinistryRequest>;
  updateMinistryRequestPayment(requestId: string, stripeSessionId: string): Promise<void>;
  updateMinistryRequestPaymentStatus(requestId: string, paymentStatus: string): Promise<void>;
  getMinistryRequestByStripeSession(stripeSessionId: string): Promise<MinistryRequest | undefined>;

  // Email Reminders
  hasReminderBeenSent(checkinId: string, reminderType: string): Promise<boolean>;
  recordReminderSent(checkinId: string, reminderType: string): Promise<void>;
  getCheckinsWithUpcomingFollowups(): Promise<Array<{
    checkinId: string;
    convertId: string;
    convertFirstName: string;
    convertLastName: string;
    convertEmail: string | null;
    convertPhone: string | null;
    leaderName: string;
    leaderEmail: string;
    churchId: string;
    churchName: string;
    nextFollowupDate: string;
    nextFollowupTime: string | null;
    notificationMethod: string;
    videoLink: string | null;
  }>>;
  getExpiredScheduledFollowups(): Promise<Array<{ id: string; nextFollowupDate: string }>>;
  updateCheckinOutcome(id: string, outcome: "CONNECTED" | "NO_RESPONSE" | "NEEDS_PRAYER" | "SCHEDULED_VISIT" | "REFERRED" | "OTHER" | "NOT_COMPLETED" | "NEEDS_FOLLOWUP"): Promise<void>;
  completeCheckin(id: string, data: { outcome: string; notes: string; checkinDate: string }): Promise<void>;
  completeNewMemberCheckin(id: string, data: { outcome: string; notes: string; checkinDate: string }): Promise<void>;
  markConvertsAsNeverContacted(): Promise<number>;
  getNewMemberCheckinsWithUpcomingFollowups(): Promise<Array<{
    checkinId: string;
    newMemberId: string;
    newMemberFirstName: string;
    newMemberLastName: string;
    newMemberEmail: string | null;
    newMemberPhone: string | null;
    leaderName: string;
    leaderEmail: string;
    churchId: string;
    churchName: string;
    nextFollowupDate: string;
    nextFollowupTime: string | null;
    customReminderSubject: string | null;
    customReminderMessage: string | null;
    notificationMethod: string;
    videoLink: string | null;
  }>>;

  // Archived Ministries
  getArchivedMinistries(): Promise<ArchivedMinistry[]>;
  getArchivedMinistry(id: string): Promise<ArchivedMinistry | undefined>;
  archiveMinistry(churchId: string, deletedByUserId: string, deletedByRole: string): Promise<ArchivedMinistry>;
  reinstateMinistry(archivedId: string): Promise<Church>;
  deleteArchivedMinistry(id: string): Promise<void>;

  // Stats
  getAdminStats(): Promise<{
    totalChurches: number;
    totalLeaders: number;
    totalConverts: number;
    convertsLast30Days: number;
    followupsDue: number;
    recentPrayerRequests: number;
  }>;

  getLeaderStats(churchId: string, userId?: string): Promise<{
    churchName: string;
    totalConverts: number;
    newConverts: number;
    activeConverts: number;
    followupsDue: Array<{
      id: string;
      convertId: string;
      convertName: string;
      nextFollowupDate: string;
      nextFollowupTime: string | null;
      videoLink: string | null;
      scheduledByName: string | null;
    }>;
  }>;

  getMinistryAdminStats(churchId: string): Promise<{
    totalConverts: number;
    newConverts: number;
    totalLeaders: number;
    totalNewMembers: number;
    totalMembers: number;
  }>;

  // Reporting
  getGrowthTrends(churchId?: string): Promise<Array<{ month: string; converts: number; newMembers: number; members: number }>>;
  getStatusBreakdown(churchId?: string): Promise<Array<{ status: string; count: number }>>;
  getFollowUpStageBreakdown(churchId?: string): Promise<Array<{ stage: string; count: number }>>;
  getCheckinOutcomes(churchId?: string): Promise<Array<{ outcome: string; count: number }>>;
  getLeaderPerformanceMetrics(churchId: string): Promise<Array<{
    leaderId: string;
    leaderName: string;
    totalConverts: number;
    totalNewMembers: number;
    totalMembers: number;
    scheduledFollowups: number;
    completedFollowups: number;
    lastActivity: string | null;
  }>>;

  // New Members
  getNewMember(id: string): Promise<NewMember | undefined>;
  getNewMembers(): Promise<NewMember[]>;
  getNewMembersByChurch(churchId: string): Promise<NewMember[]>;
  createNewMember(newMember: InsertNewMember): Promise<NewMember>;
  createPublicNewMember(churchId: string, data: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    dateOfBirth?: string;
    address?: string;
    country?: string;
    gender?: string;
    ageGroup?: string;
    notes?: string;
    customFieldData?: Record<string, any>;
  }): Promise<NewMember>;
  updateNewMember(id: string, data: Partial<InsertNewMember>): Promise<NewMember>;
  deleteNewMember(id: string): Promise<void>;

  // New Member Checkins
  getNewMemberCheckin(id: string): Promise<NewMemberCheckin | undefined>;
  getNewMemberCheckinsByNewMember(newMemberId: string): Promise<NewMemberCheckin[]>;
  getNewMemberCheckinsByChurch(churchId: string): Promise<NewMemberCheckin[]>;
  createNewMemberCheckin(checkin: InsertNewMemberCheckin): Promise<NewMemberCheckin>;
  getNewMemberFollowupsDue(churchId: string, userId?: string): Promise<Array<{
    id: string;
    newMemberId: string;
    newMemberFirstName: string;
    newMemberLastName: string;
    newMemberPhone: string | null;
    newMemberEmail: string | null;
    nextFollowupDate: string;
    nextFollowupTime: string | null;
    notes: string | null;
    videoLink: string | null;
    scheduledByName: string | null;
  }>>;

  // Members
  getMember(id: string): Promise<Member | undefined>;
  getMembers(): Promise<Member[]>;
  getMembersByChurch(churchId: string): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  createPublicMember(churchId: string, data: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    dateOfBirth?: string;
    address?: string;
    country?: string;
    gender?: string;
    memberSince?: string;
    notes?: string;
    customFieldData?: Record<string, any>;
  }): Promise<Member>;
  updateMember(id: string, data: Partial<InsertMember>): Promise<Member>;
  deleteMember(id: string): Promise<void>;

  // Member Check-ins
  getMemberCheckin(id: string): Promise<MemberCheckin | undefined>;
  getMemberCheckins(memberId: string): Promise<MemberCheckin[]>;
  createMemberCheckin(checkin: InsertMemberCheckin): Promise<MemberCheckin>;
  completeMemberCheckin(id: string, data: { outcome: string; notes: string; checkinDate: string }): Promise<void>;

  // Follow-up outcome lookups
  getLastFollowupOutcomesForConverts(churchId: string): Promise<Map<string, string>>;
  getLastFollowupOutcomesForNewMembers(churchId: string): Promise<Map<string, string>>;
  getLastFollowupOutcomesForMembers(churchId: string): Promise<Map<string, string>>;
  getMemberFollowupsDue(churchId: string, userId?: string): Promise<Array<{
    id: string;
    memberId: string;
    memberFirstName: string;
    memberLastName: string;
    memberPhone: string | null;
    memberEmail: string | null;
    nextFollowupDate: string;
    nextFollowupTime: string | null;
    notes: string | null;
    videoLink: string | null;
    scheduledByName: string | null;
  }>>;

  // Guests
  getGuest(id: string): Promise<Guest | undefined>;
  getGuestsByChurch(churchId: string): Promise<Guest[]>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: string, data: Partial<InsertGuest>): Promise<Guest>;
  deleteGuest(id: string): Promise<void>;

  // Guest Check-ins
  createGuestCheckin(checkin: InsertGuestCheckin): Promise<GuestCheckin>;

  // New Member Follow-up Stage
  updateNewMemberFollowUpStage(id: string, stage: string, completedAt?: Date): Promise<NewMember>;
  getNewMembersForFollowUpCheck(daysAgo: number): Promise<NewMember[]>;
  getNewMembersNeedingContactReminder(days: number): Promise<NewMember[]>;
  getNewMembersNeedingSecondFollowUp(days: number): Promise<NewMember[]>;
  getNewMembersNeedingFinalFollowUp(days: number): Promise<NewMember[]>;

  // Convert New Member to Member or Guest
  convertNewMemberToMember(newMemberId: string, userId: string): Promise<Member>;
  convertNewMemberToGuest(newMemberId: string, userId: string): Promise<Guest>;

  // Church Token Methods
  getChurchByNewMemberToken(token: string): Promise<Church | undefined>;
  getChurchByMemberToken(token: string): Promise<Church | undefined>;
  generateNewMemberTokenForChurch(id: string): Promise<Church>;
  generateMemberTokenForChurch(id: string): Promise<Church>;

  // Persons (Member identity)
  getPerson(id: string): Promise<Person | undefined>;
  getPersonByEmail(email: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: string, data: Partial<InsertPerson>): Promise<Person>;

  // Member Accounts
  getMemberAccount(id: string): Promise<MemberAccount | undefined>;
  getMemberAccountByPersonId(personId: string): Promise<MemberAccount | undefined>;
  getMemberAccountByEmail(email: string): Promise<MemberAccount | undefined>;
  createMemberAccount(account: InsertMemberAccount): Promise<MemberAccount>;
  updateMemberAccountPassword(id: string, passwordHash: string): Promise<void>;
  updateMemberAccountStatus(id: string, status: "PENDING_CLAIM" | "ACTIVE" | "SUSPENDED"): Promise<void>;
  updateMemberAccountLastLogin(id: string): Promise<void>;

  // Ministry Affiliations
  getMinistryAffiliation(id: string): Promise<MinistryAffiliation | undefined>;
  getAffiliationsByPerson(personId: string): Promise<MinistryAffiliation[]>;
  getAffiliationsByMinistry(ministryId: string): Promise<MinistryAffiliation[]>;
  createMinistryAffiliation(affiliation: InsertMinistryAffiliation): Promise<MinistryAffiliation>;
  updateMinistryAffiliationType(id: string, type: "convert" | "new_member" | "member"): Promise<MinistryAffiliation>;
  checkAffiliationExists(personId: string, ministryId: string): Promise<MinistryAffiliation | undefined>;
  deleteMinistryAffiliation(id: string): Promise<void>;
  getAffiliationByRecordId(recordType: "convert" | "new_member" | "member", recordId: string): Promise<MinistryAffiliation | undefined>;

  // Member Accounts - Admin queries
  getMemberAccountsWithDetailsByMinistry(ministryId: string): Promise<{
    memberAccount: MemberAccount;
    person: Person;
    affiliation: MinistryAffiliation;
  }[]>;

  // Account Claim Tokens
  createAccountClaimToken(token: InsertAccountClaimToken): Promise<AccountClaimToken>;
  getValidClaimToken(tokenHash: string): Promise<AccountClaimToken | undefined>;
  markClaimTokenUsed(id: string): Promise<void>;
  invalidateExistingTokens(memberAccountId: string): Promise<void>;

  // Member Prayer Requests
  getMemberPrayerRequest(id: string): Promise<MemberPrayerRequest | undefined>;
  getMemberPrayerRequestsByPerson(personId: string, ministryId?: string): Promise<MemberPrayerRequest[]>;
  getMemberPrayerRequestsByMinistry(ministryId: string): Promise<MemberPrayerRequest[]>;
  createMemberPrayerRequest(request: InsertMemberPrayerRequest): Promise<MemberPrayerRequest>;
  updateMemberPrayerRequest(id: string, data: Partial<InsertMemberPrayerRequest>): Promise<MemberPrayerRequest>;
  updateMemberPrayerRequestStatus(id: string, status: "SUBMITTED" | "BEING_PRAYED_FOR" | "FOLLOWUP_SCHEDULED" | "ANSWERED" | "CLOSED"): Promise<MemberPrayerRequest>;

  // Journal Entries
  getJournalEntry(id: string): Promise<JournalEntry | undefined>;
  getJournalEntriesByPerson(personId: string): Promise<JournalEntry[]>;
  getJournalEntriesSharedWithMinistry(ministryId: string): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: string, data: Partial<InsertJournalEntry>): Promise<JournalEntry>;
  deleteJournalEntry(id: string): Promise<void>;

  // Mass Follow-ups
  createMassFollowup(data: InsertMassFollowup): Promise<MassFollowup>;
  getMassFollowup(id: string): Promise<MassFollowup | undefined>;
  getMassFollowupsByChurch(churchId: string): Promise<MassFollowup[]>;
  updateMassFollowup(id: string, data: Partial<InsertMassFollowup>): Promise<MassFollowup>;
  createMassFollowupParticipant(data: InsertMassFollowupParticipant): Promise<MassFollowupParticipant>;
  getMassFollowupParticipants(massFollowupId: string): Promise<MassFollowupParticipant[]>;
  updateMassFollowupParticipant(id: string, data: Partial<InsertMassFollowupParticipant>): Promise<MassFollowupParticipant>;

  // Scheduled Announcements
  createScheduledAnnouncement(data: InsertScheduledAnnouncement): Promise<ScheduledAnnouncement>;
  getScheduledAnnouncementsByChurch(churchId: string): Promise<ScheduledAnnouncement[]>;
  getScheduledAnnouncement(id: string): Promise<ScheduledAnnouncement | undefined>;
  updateScheduledAnnouncementStatus(id: string, status: "PENDING" | "SENT" | "FAILED" | "CANCELLED", errorMessage?: string): Promise<void>;
  getPendingScheduledAnnouncements(beforeDate: Date): Promise<ScheduledAnnouncement[]>;

  // Form Configurations
  getFormConfiguration(churchId: string, formType: "convert" | "new_member" | "member"): Promise<FormConfiguration | undefined>;
  getFormConfigurations(churchId: string): Promise<FormConfiguration[]>;
  upsertFormConfiguration(churchId: string, formType: "convert" | "new_member" | "member", data: { title?: string; heroTitle?: string; description?: string; fieldConfig: any; customFields: any }): Promise<FormConfiguration>;

  // Password Reset Tokens
  createPasswordResetToken(email: string, tokenHash: string, accountType: "staff" | "member", expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  invalidatePasswordResetTokens(email: string, accountType: "staff" | "member"): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAdminCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "ADMIN"));
    return Number(result[0]?.count || 0);
  }

  async getLeaders(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.role, "LEADER"))
      .orderBy(desc(users.createdAt));
  }

  async getLeadersByChurch(churchId: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(and(eq(users.role, "LEADER"), eq(users.churchId, churchId)));
  }

  async getUsersByChurch(churchId: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.churchId, churchId))
      .orderBy(desc(users.createdAt));
  }

  // Churches
  async getChurch(id: string): Promise<Church | undefined> {
    const [church] = await db.select().from(churches).where(eq(churches.id, id));
    return church || undefined;
  }

  async getChurchByName(name: string): Promise<Church | undefined> {
    const [church] = await db.select().from(churches).where(eq(churches.name, name));
    return church || undefined;
  }

  async getChurchByToken(token: string): Promise<Church | undefined> {
    const [church] = await db.select().from(churches).where(eq(churches.publicToken, token));
    return church || undefined;
  }

  async getChurches(): Promise<Church[]> {
    return db.select().from(churches).orderBy(desc(churches.createdAt));
  }

  async createChurch(insertChurch: InsertChurch): Promise<Church> {
    // Generate unique tokens for all three form types with retry logic
    const maxRetries = 5;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const publicToken = this.generateRandomToken();
        const newMemberToken = this.generateRandomToken();
        const memberToken = this.generateRandomToken();
        const [church] = await db.insert(churches).values({ 
          ...insertChurch, 
          publicToken,
          newMemberToken,
          memberToken,
        }).returning();
        return church;
      } catch (error: any) {
        // Check if it's a unique constraint violation for any token
        if (error?.code === '23505' && 
            (error?.constraint?.includes('public_token') || 
             error?.constraint?.includes('new_member_token') ||
             error?.constraint?.includes('member_token'))) {
          lastError = error;
          continue; // Retry with new tokens
        }
        throw error; // Re-throw other errors
      }
    }
    
    throw new Error(`Failed to generate unique tokens after ${maxRetries} attempts`);
  }

  private generateRandomToken(): string {
    // Generate a random 12-character alphanumeric token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  async findOrCreateChurch(name: string): Promise<{ church: Church; created: boolean }> {
    let church = await this.getChurchByName(name);
    if (!church) {
      church = await this.createChurch({ name });
      return { church, created: true };
    }
    return { church, created: false };
  }

  async updateChurch(id: string, updateData: Partial<InsertChurch>): Promise<Church> {
    const [church] = await db
      .update(churches)
      .set(updateData)
      .where(eq(churches.id, id))
      .returning();
    return church;
  }

  async updateChurchSubscription(id: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionStatus?: "active" | "past_due" | "suspended" | "canceled" | "free" }): Promise<Church> {
    const [church] = await db
      .update(churches)
      .set(data)
      .where(eq(churches.id, id))
      .returning();
    return church;
  }

  async getChurchByStripeCustomerId(customerId: string): Promise<Church | undefined> {
    const [church] = await db.select().from(churches).where(eq(churches.stripeCustomerId, customerId)).limit(1);
    return church;
  }

  async getChurchByStripeSubscriptionId(subscriptionId: string): Promise<Church | undefined> {
    const [church] = await db.select().from(churches).where(eq(churches.stripeSubscriptionId, subscriptionId)).limit(1);
    return church;
  }

  async updateChurchLogo(id: string, logoUrl: string): Promise<void> {
    await db
      .update(churches)
      .set({ logoUrl })
      .where(eq(churches.id, id));
  }

  async generateTokenForChurch(id: string): Promise<Church> {
    const maxRetries = 5;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = this.generateRandomToken();
        const [church] = await db
          .update(churches)
          .set({ publicToken: token })
          .where(eq(churches.id, id))
          .returning();
        return church;
      } catch (error: any) {
        if (error?.code === '23505' && error?.constraint?.includes('public_token')) {
          continue;
        }
        throw error;
      }
    }
    
    throw new Error(`Failed to generate unique token after ${maxRetries} attempts`);
  }

  // SMS Usage
  async getSmsUsage(churchId: string, billingPeriod: string): Promise<{ smsCount: number; mmsCount: number }> {
    const [usage] = await db
      .select()
      .from(smsUsage)
      .where(and(eq(smsUsage.churchId, churchId), eq(smsUsage.billingPeriod, billingPeriod)));
    return usage ? { smsCount: usage.smsCount, mmsCount: usage.mmsCount } : { smsCount: 0, mmsCount: 0 };
  }

  async incrementSmsUsage(churchId: string, billingPeriod: string, type: "sms" | "mms"): Promise<void> {
    const [existing] = await db
      .select()
      .from(smsUsage)
      .where(and(eq(smsUsage.churchId, churchId), eq(smsUsage.billingPeriod, billingPeriod)));

    if (existing) {
      const updateData = type === "sms"
        ? { smsCount: existing.smsCount + 1, updatedAt: new Date() }
        : { mmsCount: existing.mmsCount + 1, updatedAt: new Date() };
      await db.update(smsUsage).set(updateData).where(eq(smsUsage.id, existing.id));
    } else {
      await db.insert(smsUsage).values({
        churchId,
        billingPeriod,
        smsCount: type === "sms" ? 1 : 0,
        mmsCount: type === "mms" ? 1 : 0,
      });
    }
  }

  // Converts
  async getConvert(id: string): Promise<Convert | undefined> {
    const [convert] = await db.select().from(converts).where(eq(converts.id, id));
    return convert || undefined;
  }

  async getConverts(): Promise<Convert[]> {
    return db.select().from(converts).orderBy(desc(converts.createdAt));
  }

  async getConvertsByChurch(churchId: string): Promise<Convert[]> {
    return db
      .select()
      .from(converts)
      .where(eq(converts.churchId, churchId))
      .orderBy(desc(converts.createdAt));
  }

  async createConvert(insertConvert: InsertConvert): Promise<Convert> {
    const [convert] = await db.insert(converts).values(insertConvert).returning();
    return convert;
  }

  async createPublicConvert(churchId: string, data: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    dateOfBirth?: string;
    country?: string;
    salvationDecision?: string;
    wantsContact?: string;
    gender?: string;
    ageGroup?: string;
    isChurchMember?: string;
    prayerRequest?: string;
    customFieldData?: Record<string, any>;
  }): Promise<Convert> {
    const [convert] = await db.insert(converts).values({
      churchId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      email: data.email || null,
      dateOfBirth: data.dateOfBirth || null,
      country: data.country || null,
      salvationDecision: data.salvationDecision || null,
      wantsContact: data.wantsContact || null,
      gender: data.gender || null,
      ageGroup: data.ageGroup || null,
      isChurchMember: data.isChurchMember || null,
      prayerRequest: data.prayerRequest || null,
      customFieldData: data.customFieldData || null,
      selfSubmitted: "true",
      createdByUserId: null,
    }).returning();
    return convert;
  }

  async updateConvert(id: string, updateData: Partial<InsertConvert>): Promise<Convert> {
    const [convert] = await db
      .update(converts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(converts.id, id))
      .returning();
    return convert;
  }

  async deleteConvert(id: string): Promise<void> {
    // First delete related checkins (foreign key constraint)
    await db.delete(checkins).where(eq(checkins.convertId, id));
    // Delete any ministry affiliations referencing this convert
    await db.delete(ministryAffiliations).where(eq(ministryAffiliations.convertId, id));
    // Now delete the convert
    await db.delete(converts).where(eq(converts.id, id));
  }

  // Checkins
  async getCheckin(id: string): Promise<Checkin | undefined> {
    const [checkin] = await db.select().from(checkins).where(eq(checkins.id, id));
    return checkin || undefined;
  }

  async getCheckinsByConvert(convertId: string): Promise<Checkin[]> {
    return db
      .select()
      .from(checkins)
      .where(eq(checkins.convertId, convertId))
      .orderBy(desc(checkins.checkinDate));
  }

  async getCheckinsByChurch(churchId: string): Promise<Checkin[]> {
    return db
      .select()
      .from(checkins)
      .where(eq(checkins.churchId, churchId))
      .orderBy(desc(checkins.checkinDate));
  }

  async createCheckin(insertCheckin: InsertCheckin): Promise<Checkin> {
    const [checkin] = await db.insert(checkins).values(insertCheckin).returning();
    return checkin;
  }

  async getFollowupsDue(churchId?: string): Promise<Checkin[]> {
    const today = new Date().toISOString().split("T")[0];
    const query = db
      .select()
      .from(checkins)
      .where(
        churchId
          ? and(lte(checkins.nextFollowupDate, today), eq(checkins.churchId, churchId))
          : lte(checkins.nextFollowupDate, today)
      )
      .orderBy(checkins.nextFollowupDate);
    return query;
  }

  async getUpcomingFollowups(churchId: string, userId?: string) {
    const today = new Date().toISOString().split("T")[0];
    const conditions = [
      gte(checkins.nextFollowupDate, today),
      eq(checkins.churchId, churchId),
      eq(checkins.outcome, "SCHEDULED_VISIT")
    ];
    if (userId) {
      conditions.push(eq(checkins.createdByUserId, userId));
    }
    const results = await db
      .select({
        id: checkins.id,
        convertId: checkins.convertId,
        convertFirstName: converts.firstName,
        convertLastName: converts.lastName,
        convertPhone: converts.phone,
        convertEmail: converts.email,
        nextFollowupDate: checkins.nextFollowupDate,
        nextFollowupTime: checkins.nextFollowupTime,
        notes: checkins.notes,
        videoLink: checkins.videoLink,
        scheduledByFirstName: users.firstName,
        scheduledByLastName: users.lastName,
      })
      .from(checkins)
      .innerJoin(converts, eq(checkins.convertId, converts.id))
      .leftJoin(users, eq(checkins.createdByUserId, users.id))
      .where(and(...conditions))
      .orderBy(checkins.nextFollowupDate);
    return results.map(r => ({
      id: r.id,
      convertId: r.convertId,
      convertFirstName: r.convertFirstName,
      convertLastName: r.convertLastName,
      convertPhone: r.convertPhone,
      convertEmail: r.convertEmail,
      nextFollowupDate: r.nextFollowupDate || "",
      nextFollowupTime: r.nextFollowupTime,
      notes: r.notes,
      videoLink: r.videoLink,
      scheduledByName: r.scheduledByFirstName && r.scheduledByLastName
        ? `${r.scheduledByFirstName} ${r.scheduledByLastName}` : null,
    }));
  }

  // Prayer Requests
  async getPrayerRequests(): Promise<PrayerRequest[]> {
    return db.select().from(prayerRequests).orderBy(desc(prayerRequests.createdAt));
  }

  async getPrayerRequestsByChurch(churchName: string): Promise<PrayerRequest[]> {
    return db.select().from(prayerRequests)
      .where(eq(prayerRequests.churchPreference, churchName))
      .orderBy(desc(prayerRequests.createdAt));
  }

  async createPrayerRequest(insertRequest: InsertPrayerRequest): Promise<PrayerRequest> {
    const [request] = await db.insert(prayerRequests).values(insertRequest).returning();
    return request;
  }

  // Contact Requests
  async getContactRequests(): Promise<ContactRequest[]> {
    return db.select().from(contactRequests).orderBy(desc(contactRequests.createdAt));
  }

  async getContactRequestsByChurch(churchName: string): Promise<ContactRequest[]> {
    return db.select().from(contactRequests)
      .where(eq(contactRequests.churchPreference, churchName))
      .orderBy(desc(contactRequests.createdAt));
  }

  async createContactRequest(insertRequest: InsertContactRequest): Promise<ContactRequest> {
    const [request] = await db.insert(contactRequests).values(insertRequest).returning();
    return request;
  }

  // Audit Log
  async createAuditLog(log: InsertAuditLog): Promise<void> {
    await db.insert(auditLog).values(log);
  }

  // Account Requests
  async getAccountRequests(): Promise<AccountRequest[]> {
    return db.select().from(accountRequests).orderBy(desc(accountRequests.createdAt));
  }

  async getAccountRequestsByChurch(churchId: string): Promise<AccountRequest[]> {
    return db
      .select()
      .from(accountRequests)
      .where(eq(accountRequests.churchId, churchId))
      .orderBy(desc(accountRequests.createdAt));
  }

  async getPendingAccountRequests(): Promise<AccountRequest[]> {
    return db
      .select()
      .from(accountRequests)
      .where(eq(accountRequests.status, "PENDING"))
      .orderBy(desc(accountRequests.createdAt));
  }

  async getPendingAccountRequestsByChurch(churchId: string): Promise<AccountRequest[]> {
    return db
      .select()
      .from(accountRequests)
      .where(and(eq(accountRequests.status, "PENDING"), eq(accountRequests.churchId, churchId)))
      .orderBy(desc(accountRequests.createdAt));
  }

  async getAccountRequest(id: string): Promise<AccountRequest | undefined> {
    const [request] = await db.select().from(accountRequests).where(eq(accountRequests.id, id));
    return request || undefined;
  }

  async createAccountRequest(insertRequest: InsertAccountRequest): Promise<AccountRequest> {
    const [request] = await db.insert(accountRequests).values(insertRequest).returning();
    return request;
  }

  async updateAccountRequest(id: string, data: Partial<InsertAccountRequest>): Promise<AccountRequest> {
    const [request] = await db
      .update(accountRequests)
      .set(data)
      .where(eq(accountRequests.id, id))
      .returning();
    return request;
  }

  async updateAccountRequestStatus(id: string, status: "APPROVED" | "DENIED", reviewedByUserId: string): Promise<AccountRequest> {
    const [request] = await db
      .update(accountRequests)
      .set({ status, reviewedByUserId, reviewedAt: new Date() })
      .where(eq(accountRequests.id, id))
      .returning();
    return request;
  }

  // Ministry Requests
  async getMinistryRequests(): Promise<MinistryRequest[]> {
    return db.select().from(ministryRequests).orderBy(desc(ministryRequests.createdAt));
  }

  async getPendingMinistryRequests(): Promise<MinistryRequest[]> {
    return db
      .select()
      .from(ministryRequests)
      .where(eq(ministryRequests.status, "PENDING"))
      .orderBy(desc(ministryRequests.createdAt));
  }

  async getMinistryRequest(id: string): Promise<MinistryRequest | undefined> {
    const [request] = await db.select().from(ministryRequests).where(eq(ministryRequests.id, id));
    return request || undefined;
  }

  async createMinistryRequest(insertRequest: InsertMinistryRequest): Promise<MinistryRequest> {
    const [request] = await db.insert(ministryRequests).values(insertRequest).returning();
    return request;
  }

  async updateMinistryRequest(id: string, data: Partial<InsertMinistryRequest>): Promise<MinistryRequest> {
    const [request] = await db
      .update(ministryRequests)
      .set(data)
      .where(eq(ministryRequests.id, id))
      .returning();
    return request;
  }

  async updateMinistryRequestStatus(id: string, status: "APPROVED" | "DENIED", reviewedByUserId: string): Promise<MinistryRequest> {
    const [request] = await db
      .update(ministryRequests)
      .set({ status, reviewedByUserId, reviewedAt: new Date() })
      .where(eq(ministryRequests.id, id))
      .returning();
    return request;
  }

  async updateMinistryRequestPayment(requestId: string, stripeSessionId: string): Promise<void> {
    await db
      .update(ministryRequests)
      .set({ stripeSessionId, paymentStatus: "pending" })
      .where(eq(ministryRequests.id, requestId));
  }

  async updateMinistryRequestPaymentStatus(requestId: string, paymentStatus: string): Promise<void> {
    await db
      .update(ministryRequests)
      .set({ paymentStatus })
      .where(eq(ministryRequests.id, requestId));
  }

  async getMinistryRequestByStripeSession(stripeSessionId: string): Promise<MinistryRequest | undefined> {
    const [request] = await db
      .select()
      .from(ministryRequests)
      .where(eq(ministryRequests.stripeSessionId, stripeSessionId));
    return request;
  }

  // Stats
  async getAdminStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const today = new Date().toISOString().split("T")[0];

    const [churchCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(churches);

    const [leaderCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "LEADER"));

    const [convertCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(converts);

    const [recentConvertCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(converts)
      .where(gte(converts.createdAt, thirtyDaysAgo));

    const [followupsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(checkins)
      .where(lte(checkins.nextFollowupDate, today));

    const [prayerCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(prayerRequests)
      .where(gte(prayerRequests.createdAt, thirtyDaysAgo));

    return {
      totalChurches: Number(churchCount?.count || 0),
      totalLeaders: Number(leaderCount?.count || 0),
      totalConverts: Number(convertCount?.count || 0),
      convertsLast30Days: Number(recentConvertCount?.count || 0),
      followupsDue: Number(followupsCount?.count || 0),
      recentPrayerRequests: Number(prayerCount?.count || 0),
    };
  }

  async getLeaderStats(churchId: string, userId?: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const today = new Date().toISOString().split("T")[0];

    const church = await this.getChurch(churchId);

    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(converts)
      .where(eq(converts.churchId, churchId));

    const [newCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(converts)
      .where(and(eq(converts.churchId, churchId), gte(converts.createdAt, thirtyDaysAgo)));

    const [activeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(converts)
      .where(and(eq(converts.churchId, churchId), eq(converts.status, "ACTIVE")));

    const followupConditions = [
      eq(checkins.churchId, churchId),
      lte(checkins.nextFollowupDate, today),
    ];
    if (userId) {
      followupConditions.push(eq(checkins.createdByUserId, userId));
    }

    const followups = await db
      .select({
        id: checkins.id,
        convertId: checkins.convertId,
        nextFollowupDate: checkins.nextFollowupDate,
        nextFollowupTime: checkins.nextFollowupTime,
        videoLink: checkins.videoLink,
        firstName: converts.firstName,
        lastName: converts.lastName,
        scheduledByFirstName: users.firstName,
        scheduledByLastName: users.lastName,
      })
      .from(checkins)
      .innerJoin(converts, eq(checkins.convertId, converts.id))
      .leftJoin(users, eq(checkins.createdByUserId, users.id))
      .where(and(...followupConditions))
      .orderBy(checkins.nextFollowupDate);

    return {
      churchName: church?.name || "",
      totalConverts: Number(totalCount?.count || 0),
      newConverts: Number(newCount?.count || 0),
      activeConverts: Number(activeCount?.count || 0),
      followupsDue: followups.map((f) => ({
        id: f.id,
        convertId: f.convertId,
        convertName: `${f.firstName} ${f.lastName}`,
        nextFollowupDate: f.nextFollowupDate || "",
        nextFollowupTime: f.nextFollowupTime,
        videoLink: f.videoLink || null,
        scheduledByName: f.scheduledByFirstName && f.scheduledByLastName
          ? `${f.scheduledByFirstName} ${f.scheduledByLastName}` : null,
      })),
    };
  }

  async getMinistryAdminStats(churchId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(converts)
      .where(eq(converts.churchId, churchId));

    const [newCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(converts)
      .where(and(eq(converts.churchId, churchId), gte(converts.createdAt, thirtyDaysAgo)));

    const [leaderCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.churchId, churchId), eq(users.role, "LEADER")));

    const [newMemberCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(newMembers)
      .where(eq(newMembers.churchId, churchId));

    const [memberCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(members)
      .where(eq(members.churchId, churchId));

    return {
      totalConverts: Number(totalCount?.count || 0),
      newConverts: Number(newCount?.count || 0),
      totalLeaders: Number(leaderCount?.count || 0),
      totalNewMembers: Number(newMemberCount?.count || 0),
      totalMembers: Number(memberCount?.count || 0),
    };
  }

  // Reporting
  async getGrowthTrends(churchId?: string): Promise<Array<{ month: string; converts: number; newMembers: number; members: number }>> {
    const months: Array<{ month: string; converts: number; newMembers: number; members: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 1);
      const label = `${year}-${String(month + 1).padStart(2, '0')}`;

      const conditions = churchId
        ? and(gte(converts.createdAt, start), lt(converts.createdAt, end), eq(converts.churchId, churchId))
        : and(gte(converts.createdAt, start), lt(converts.createdAt, end));

      const nmConditions = churchId
        ? and(gte(newMembers.createdAt, start), lt(newMembers.createdAt, end), eq(newMembers.churchId, churchId))
        : and(gte(newMembers.createdAt, start), lt(newMembers.createdAt, end));

      const mConditions = churchId
        ? and(gte(members.createdAt, start), lt(members.createdAt, end), eq(members.churchId, churchId))
        : and(gte(members.createdAt, start), lt(members.createdAt, end));

      const [cCount] = await db.select({ count: sql<number>`count(*)` }).from(converts).where(conditions);
      const [nmCount] = await db.select({ count: sql<number>`count(*)` }).from(newMembers).where(nmConditions);
      const [mCount] = await db.select({ count: sql<number>`count(*)` }).from(members).where(mConditions);

      months.push({
        month: label,
        converts: Number(cCount?.count || 0),
        newMembers: Number(nmCount?.count || 0),
        members: Number(mCount?.count || 0),
      });
    }
    return months;
  }

  async getStatusBreakdown(churchId?: string): Promise<Array<{ status: string; count: number }>> {
    const condition = churchId ? eq(converts.churchId, churchId) : undefined;
    const results = await db
      .select({ status: converts.status, count: sql<number>`count(*)` })
      .from(converts)
      .where(condition)
      .groupBy(converts.status);
    return results.map(r => ({ status: r.status, count: Number(r.count) }));
  }

  async getFollowUpStageBreakdown(churchId?: string): Promise<Array<{ stage: string; count: number }>> {
    const cCondition = churchId ? eq(converts.churchId, churchId) : undefined;
    const nmCondition = churchId ? eq(newMembers.churchId, churchId) : undefined;

    const convertStages = await db
      .select({ stage: sql<string>`'convert_' || ${converts.status}`, count: sql<number>`count(*)` })
      .from(converts)
      .where(cCondition)
      .groupBy(converts.status);

    const nmStages = await db
      .select({ stage: newMembers.followUpStage, count: sql<number>`count(*)` })
      .from(newMembers)
      .where(nmCondition)
      .groupBy(newMembers.followUpStage);

    return [
      ...nmStages.map(r => ({ stage: r.stage, count: Number(r.count) })),
    ];
  }

  async getCheckinOutcomes(churchId?: string): Promise<Array<{ outcome: string; count: number }>> {
    const condition = churchId ? eq(checkins.churchId, churchId) : undefined;
    const results = await db
      .select({ outcome: checkins.outcome, count: sql<number>`count(*)` })
      .from(checkins)
      .where(condition)
      .groupBy(checkins.outcome);
    return results.map(r => ({ outcome: r.outcome, count: Number(r.count) }));
  }

  async getLeaderPerformanceMetrics(churchId: string): Promise<Array<{
    leaderId: string;
    leaderName: string;
    totalConverts: number;
    totalNewMembers: number;
    totalMembers: number;
    scheduledFollowups: number;
    completedFollowups: number;
    lastActivity: string | null;
  }>> {
    const leaders = await this.getLeadersByChurch(churchId);

    const results = await Promise.all(
      leaders.map(async (leader) => {
        const [convertCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(converts)
          .where(and(eq(converts.churchId, churchId), eq(converts.createdByUserId, leader.id)));

        const [newMemberCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(newMembers)
          .where(and(eq(newMembers.churchId, churchId), eq(newMembers.createdByUserId, leader.id)));

        const [memberCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(members)
          .where(and(eq(members.churchId, churchId), eq(members.createdByUserId, leader.id)));

        const [scheduledCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(checkins)
          .where(and(
            eq(checkins.churchId, churchId),
            eq(checkins.createdByUserId, leader.id),
            eq(checkins.outcome, "SCHEDULED_VISIT")
          ));

        const [completedCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(checkins)
          .where(and(
            eq(checkins.churchId, churchId),
            eq(checkins.createdByUserId, leader.id),
            sql`${checkins.outcome} != 'SCHEDULED_VISIT'`
          ));

        const [lastCheckin] = await db
          .select({ date: checkins.createdAt })
          .from(checkins)
          .where(and(eq(checkins.churchId, churchId), eq(checkins.createdByUserId, leader.id)))
          .orderBy(desc(checkins.createdAt))
          .limit(1);

        const [lastConvert] = await db
          .select({ date: converts.createdAt })
          .from(converts)
          .where(and(eq(converts.churchId, churchId), eq(converts.createdByUserId, leader.id)))
          .orderBy(desc(converts.createdAt))
          .limit(1);

        const dates = [lastCheckin?.date, lastConvert?.date].filter(Boolean) as Date[];
        const lastActivity = dates.length > 0
          ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
          : null;

        return {
          leaderId: leader.id,
          leaderName: `${leader.firstName} ${leader.lastName}`,
          totalConverts: Number(convertCount.count),
          totalNewMembers: Number(newMemberCount.count),
          totalMembers: Number(memberCount.count),
          scheduledFollowups: Number(scheduledCount.count),
          completedFollowups: Number(completedCount.count),
          lastActivity,
        };
      })
    );

    return results;
  }

  // Email Reminders
  async hasReminderBeenSent(checkinId: string, reminderType: string): Promise<boolean> {
    const result = await db
      .select()
      .from(emailReminders)
      .where(
        and(
          eq(emailReminders.checkinId, checkinId),
          eq(emailReminders.reminderType, reminderType)
        )
      );
    return result.length > 0;
  }

  async recordReminderSent(checkinId: string, reminderType: string): Promise<void> {
    await db.insert(emailReminders).values({
      checkinId,
      reminderType,
    });
  }

  async getCheckinsWithUpcomingFollowups(): Promise<Array<{
    checkinId: string;
    convertId: string;
    convertFirstName: string;
    convertLastName: string;
    convertEmail: string | null;
    convertPhone: string | null;
    leaderName: string;
    leaderEmail: string;
    churchId: string;
    churchName: string;
    nextFollowupDate: string;
    nextFollowupTime: string | null;
    notificationMethod: string;
    videoLink: string | null;
  }>> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const results = await db
      .select({
        checkinId: checkins.id,
        convertId: checkins.convertId,
        convertFirstName: converts.firstName,
        convertLastName: converts.lastName,
        convertEmail: converts.email,
        convertPhone: converts.phone,
        leaderFirstName: users.firstName,
        leaderLastName: users.lastName,
        leaderEmail: users.email,
        churchId: churches.id,
        churchName: churches.name,
        nextFollowupDate: checkins.nextFollowupDate,
        nextFollowupTime: checkins.nextFollowupTime,
        notificationMethod: checkins.notificationMethod,
        videoLink: checkins.videoLink,
      })
      .from(checkins)
      .innerJoin(converts, eq(checkins.convertId, converts.id))
      .innerJoin(users, eq(checkins.createdByUserId, users.id))
      .innerJoin(churches, eq(checkins.churchId, churches.id))
      .where(
        and(
          eq(checkins.nextFollowupDate, tomorrowStr),
          eq(checkins.outcome, "SCHEDULED_VISIT")
        )
      );

    return results.map(r => ({
      checkinId: r.checkinId,
      convertId: r.convertId,
      convertFirstName: r.convertFirstName,
      convertLastName: r.convertLastName,
      convertEmail: r.convertEmail,
      convertPhone: r.convertPhone,
      leaderName: `${r.leaderFirstName} ${r.leaderLastName}`,
      leaderEmail: r.leaderEmail,
      churchId: r.churchId,
      churchName: r.churchName,
      nextFollowupDate: r.nextFollowupDate || "",
      nextFollowupTime: r.nextFollowupTime,
      notificationMethod: r.notificationMethod || "email",
      videoLink: r.videoLink,
    }));
  }

  async getExpiredScheduledFollowups(): Promise<Array<{ id: string; nextFollowupDate: string }>> {
    // Get follow-ups that are SCHEDULED_VISIT and more than 5 days past their scheduled date
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().split("T")[0];

    const results = await db
      .select({
        id: checkins.id,
        nextFollowupDate: checkins.nextFollowupDate,
      })
      .from(checkins)
      .where(
        and(
          eq(checkins.outcome, "SCHEDULED_VISIT"),
          isNotNull(checkins.nextFollowupDate),
          lte(checkins.nextFollowupDate, fiveDaysAgoStr)
        )
      );

    return results.map(r => ({
      id: r.id,
      nextFollowupDate: r.nextFollowupDate || "",
    }));
  }

  async updateCheckinOutcome(id: string, outcome: "CONNECTED" | "NO_RESPONSE" | "NEEDS_PRAYER" | "SCHEDULED_VISIT" | "REFERRED" | "OTHER" | "NOT_COMPLETED"): Promise<void> {
    await db.update(checkins).set({ outcome }).where(eq(checkins.id, id));
  }

  async completeCheckin(id: string, data: { outcome: string; notes: string; checkinDate: string }): Promise<void> {
    await db.update(checkins).set({
      outcome: data.outcome as any,
      notes: data.notes,
      checkinDate: data.checkinDate,
    }).where(eq(checkins.id, id));
  }

  async completeNewMemberCheckin(id: string, data: { outcome: string; notes: string; checkinDate: string }): Promise<void> {
    await db.update(newMemberCheckins).set({
      outcome: data.outcome as any,
      notes: data.notes,
      checkinDate: data.checkinDate,
    }).where(eq(newMemberCheckins.id, id));
  }

  async markConvertsAsNeverContacted(): Promise<number> {
    // Find converts that are still "NEW" and created more than 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db
      .update(converts)
      .set({ status: "NEVER_CONTACTED" })
      .where(
        and(
          eq(converts.status, "NEW"),
          lt(converts.createdAt, thirtyDaysAgo)
        )
      )
      .returning({ id: converts.id });

    return result.length;
  }

  async getNewMemberCheckinsWithUpcomingFollowups(): Promise<Array<{
    checkinId: string;
    newMemberId: string;
    newMemberFirstName: string;
    newMemberLastName: string;
    newMemberEmail: string | null;
    newMemberPhone: string | null;
    leaderName: string;
    leaderEmail: string;
    churchId: string;
    churchName: string;
    nextFollowupDate: string;
    nextFollowupTime: string | null;
    customReminderSubject: string | null;
    customReminderMessage: string | null;
    notificationMethod: string;
    videoLink: string | null;
  }>> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const results = await db
      .select({
        checkinId: newMemberCheckins.id,
        newMemberId: newMemberCheckins.newMemberId,
        newMemberFirstName: newMembers.firstName,
        newMemberLastName: newMembers.lastName,
        newMemberEmail: newMembers.email,
        newMemberPhone: newMembers.phone,
        leaderFirstName: users.firstName,
        leaderLastName: users.lastName,
        leaderEmail: users.email,
        churchId: churches.id,
        churchName: churches.name,
        nextFollowupDate: newMemberCheckins.nextFollowupDate,
        nextFollowupTime: newMemberCheckins.nextFollowupTime,
        customReminderSubject: newMemberCheckins.customReminderSubject,
        customReminderMessage: newMemberCheckins.customReminderMessage,
        notificationMethod: newMemberCheckins.notificationMethod,
        videoLink: newMemberCheckins.videoLink,
      })
      .from(newMemberCheckins)
      .innerJoin(newMembers, eq(newMemberCheckins.newMemberId, newMembers.id))
      .innerJoin(users, eq(newMemberCheckins.createdByUserId, users.id))
      .innerJoin(churches, eq(newMemberCheckins.churchId, churches.id))
      .where(
        and(
          eq(newMemberCheckins.nextFollowupDate, tomorrowStr),
          eq(newMemberCheckins.outcome, "SCHEDULED_VISIT")
        )
      );

    return results.map(r => ({
      checkinId: r.checkinId,
      newMemberId: r.newMemberId,
      newMemberFirstName: r.newMemberFirstName,
      newMemberLastName: r.newMemberLastName,
      newMemberEmail: r.newMemberEmail,
      newMemberPhone: r.newMemberPhone,
      leaderName: `${r.leaderFirstName} ${r.leaderLastName}`,
      leaderEmail: r.leaderEmail,
      churchId: r.churchId,
      churchName: r.churchName,
      nextFollowupDate: r.nextFollowupDate || "",
      nextFollowupTime: r.nextFollowupTime,
      customReminderSubject: r.customReminderSubject,
      customReminderMessage: r.customReminderMessage,
      notificationMethod: r.notificationMethod || "email",
      videoLink: r.videoLink,
    }));
  }

  // New Members
  async getNewMember(id: string): Promise<NewMember | undefined> {
    const [newMember] = await db.select().from(newMembers).where(eq(newMembers.id, id));
    return newMember || undefined;
  }

  async getNewMembers(): Promise<NewMember[]> {
    return db.select().from(newMembers).orderBy(desc(newMembers.createdAt));
  }

  async getNewMembersByChurch(churchId: string): Promise<NewMember[]> {
    return db
      .select()
      .from(newMembers)
      .where(eq(newMembers.churchId, churchId))
      .orderBy(desc(newMembers.createdAt));
  }

  async createNewMember(insertNewMember: InsertNewMember): Promise<NewMember> {
    const [newMember] = await db.insert(newMembers).values(insertNewMember).returning();
    return newMember;
  }

  async createPublicNewMember(churchId: string, data: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    dateOfBirth?: string;
    address?: string;
    country?: string;
    gender?: string;
    ageGroup?: string;
    notes?: string;
    customFieldData?: Record<string, any>;
  }): Promise<NewMember> {
    const [newMember] = await db.insert(newMembers).values({
      churchId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      email: data.email || null,
      dateOfBirth: data.dateOfBirth || null,
      address: data.address || null,
      country: data.country || null,
      gender: data.gender || null,
      ageGroup: data.ageGroup || null,
      notes: data.notes || null,
      customFieldData: data.customFieldData || null,
      selfSubmitted: "true",
      createdByUserId: null,
    }).returning();
    return newMember;
  }

  async updateNewMember(id: string, updateData: Partial<InsertNewMember>): Promise<NewMember> {
    const [newMember] = await db
      .update(newMembers)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(newMembers.id, id))
      .returning();
    return newMember;
  }

  async deleteNewMember(id: string): Promise<void> {
    // First delete related checkins (foreign key constraint)
    await db.delete(newMemberCheckins).where(eq(newMemberCheckins.newMemberId, id));
    // Delete any ministry affiliations referencing this new member
    await db.delete(ministryAffiliations).where(eq(ministryAffiliations.newMemberId, id));
    // Now delete the new member
    await db.delete(newMembers).where(eq(newMembers.id, id));
  }

  // New Member Checkins
  async getNewMemberCheckin(id: string): Promise<NewMemberCheckin | undefined> {
    const [checkin] = await db.select().from(newMemberCheckins).where(eq(newMemberCheckins.id, id));
    return checkin || undefined;
  }

  async getNewMemberCheckinsByNewMember(newMemberId: string): Promise<NewMemberCheckin[]> {
    return db
      .select()
      .from(newMemberCheckins)
      .where(eq(newMemberCheckins.newMemberId, newMemberId))
      .orderBy(desc(newMemberCheckins.checkinDate));
  }

  async getNewMemberCheckinsByChurch(churchId: string): Promise<NewMemberCheckin[]> {
    return db
      .select()
      .from(newMemberCheckins)
      .where(eq(newMemberCheckins.churchId, churchId))
      .orderBy(desc(newMemberCheckins.checkinDate));
  }

  async createNewMemberCheckin(insertCheckin: InsertNewMemberCheckin): Promise<NewMemberCheckin> {
    const [checkin] = await db.insert(newMemberCheckins).values(insertCheckin).returning();
    return checkin;
  }

  async getNewMemberFollowupsDue(churchId: string, userId?: string): Promise<Array<{
    id: string;
    newMemberId: string;
    newMemberFirstName: string;
    newMemberLastName: string;
    newMemberPhone: string | null;
    newMemberEmail: string | null;
    nextFollowupDate: string;
    nextFollowupTime: string | null;
    notes: string | null;
    videoLink: string | null;
    scheduledByName: string | null;
  }>> {
    const today = new Date().toISOString().split("T")[0];
    const conditions = [
      gte(newMemberCheckins.nextFollowupDate, today),
      eq(newMemberCheckins.churchId, churchId),
      eq(newMemberCheckins.outcome, "SCHEDULED_VISIT")
    ];
    if (userId) {
      conditions.push(eq(newMemberCheckins.createdByUserId, userId));
    }
    const results = await db
      .select({
        id: newMemberCheckins.id,
        newMemberId: newMemberCheckins.newMemberId,
        newMemberFirstName: newMembers.firstName,
        newMemberLastName: newMembers.lastName,
        newMemberPhone: newMembers.phone,
        newMemberEmail: newMembers.email,
        nextFollowupDate: newMemberCheckins.nextFollowupDate,
        nextFollowupTime: newMemberCheckins.nextFollowupTime,
        notes: newMemberCheckins.notes,
        videoLink: newMemberCheckins.videoLink,
        scheduledByFirstName: users.firstName,
        scheduledByLastName: users.lastName,
      })
      .from(newMemberCheckins)
      .innerJoin(newMembers, eq(newMemberCheckins.newMemberId, newMembers.id))
      .leftJoin(users, eq(newMemberCheckins.createdByUserId, users.id))
      .where(and(...conditions))
      .orderBy(newMemberCheckins.nextFollowupDate);

    return results.map(r => ({
      id: r.id,
      newMemberId: r.newMemberId,
      newMemberFirstName: r.newMemberFirstName,
      newMemberLastName: r.newMemberLastName,
      newMemberPhone: r.newMemberPhone,
      newMemberEmail: r.newMemberEmail,
      nextFollowupDate: r.nextFollowupDate || "",
      nextFollowupTime: r.nextFollowupTime,
      notes: r.notes,
      videoLink: r.videoLink,
      scheduledByName: r.scheduledByFirstName && r.scheduledByLastName
        ? `${r.scheduledByFirstName} ${r.scheduledByLastName}` : null,
    }));
  }

  // Members
  async getMember(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member || undefined;
  }

  async getMembers(): Promise<Member[]> {
    return db.select().from(members).orderBy(desc(members.createdAt));
  }

  async getMembersByChurch(churchId: string): Promise<Member[]> {
    return db
      .select()
      .from(members)
      .where(eq(members.churchId, churchId))
      .orderBy(desc(members.createdAt));
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const [member] = await db.insert(members).values(insertMember).returning();
    return member;
  }

  async createPublicMember(churchId: string, data: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    dateOfBirth?: string;
    address?: string;
    country?: string;
    gender?: string;
    memberSince?: string;
    notes?: string;
    customFieldData?: Record<string, any>;
  }): Promise<Member> {
    const [member] = await db.insert(members).values({
      churchId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      email: data.email || null,
      dateOfBirth: data.dateOfBirth || null,
      address: data.address || null,
      country: data.country || null,
      gender: data.gender || null,
      memberSince: data.memberSince || null,
      notes: data.notes || null,
      customFieldData: data.customFieldData || null,
      selfSubmitted: "true",
      createdByUserId: null,
    }).returning();
    return member;
  }

  async updateMember(id: string, updateData: Partial<InsertMember>): Promise<Member> {
    const [member] = await db
      .update(members)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(members.id, id))
      .returning();
    return member;
  }

  async deleteMember(id: string): Promise<void> {
    // First delete related checkins (foreign key constraint)
    await db.delete(memberCheckins).where(eq(memberCheckins.memberId, id));
    // Delete any ministry affiliations referencing this member
    await db.delete(ministryAffiliations).where(eq(ministryAffiliations.memberId, id));
    // Now delete the member
    await db.delete(members).where(eq(members.id, id));
  }

  // Church Token Methods
  async getChurchByNewMemberToken(token: string): Promise<Church | undefined> {
    const [church] = await db.select().from(churches).where(eq(churches.newMemberToken, token));
    return church || undefined;
  }

  async getChurchByMemberToken(token: string): Promise<Church | undefined> {
    const [church] = await db.select().from(churches).where(eq(churches.memberToken, token));
    return church || undefined;
  }

  async generateNewMemberTokenForChurch(id: string): Promise<Church> {
    const maxRetries = 5;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = this.generateRandomToken();
        const [church] = await db
          .update(churches)
          .set({ newMemberToken: token })
          .where(eq(churches.id, id))
          .returning();
        return church;
      } catch (error: any) {
        if (error?.code === '23505' && error?.constraint?.includes('new_member_token')) {
          continue;
        }
        throw error;
      }
    }
    
    throw new Error(`Failed to generate unique new member token after ${maxRetries} attempts`);
  }

  async generateMemberTokenForChurch(id: string): Promise<Church> {
    const maxRetries = 5;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = this.generateRandomToken();
        const [church] = await db
          .update(churches)
          .set({ memberToken: token })
          .where(eq(churches.id, id))
          .returning();
        return church;
      } catch (error: any) {
        if (error?.code === '23505' && error?.constraint?.includes('member_token')) {
          continue;
        }
        throw error;
      }
    }
    
    throw new Error(`Failed to generate unique member token after ${maxRetries} attempts`);
  }

  // Member Check-ins
  async getMemberCheckin(id: string): Promise<MemberCheckin | undefined> {
    const [checkin] = await db.select().from(memberCheckins).where(eq(memberCheckins.id, id));
    return checkin || undefined;
  }

  async getMemberCheckins(memberId: string): Promise<MemberCheckin[]> {
    return db.select().from(memberCheckins).where(eq(memberCheckins.memberId, memberId)).orderBy(desc(memberCheckins.createdAt));
  }

  async createMemberCheckin(checkin: InsertMemberCheckin): Promise<MemberCheckin> {
    const [created] = await db.insert(memberCheckins).values(checkin).returning();
    return created;
  }

  async completeMemberCheckin(id: string, data: { outcome: string; notes: string; checkinDate: string }): Promise<void> {
    await db.update(memberCheckins).set({
      outcome: data.outcome as any,
      notes: data.notes,
      checkinDate: data.checkinDate,
    }).where(eq(memberCheckins.id, id));
  }

  async getLastFollowupOutcomesForConverts(churchId: string): Promise<Map<string, string>> {
    const results = await db.execute(sql`
      SELECT DISTINCT ON (c.convert_id) c.convert_id, c.outcome
      FROM checkins c
      WHERE c.church_id = ${churchId}
        AND c.outcome != 'SCHEDULED_VISIT'
      ORDER BY c.convert_id, c.checkin_date DESC, c.created_at DESC
    `);
    const map = new Map<string, string>();
    for (const row of results.rows as any[]) {
      map.set(row.convert_id, row.outcome);
    }
    return map;
  }

  async getLastFollowupOutcomesForNewMembers(churchId: string): Promise<Map<string, string>> {
    const results = await db.execute(sql`
      SELECT DISTINCT ON (c.new_member_id) c.new_member_id, c.outcome
      FROM new_member_checkins c
      WHERE c.church_id = ${churchId}
        AND c.outcome != 'SCHEDULED_VISIT'
      ORDER BY c.new_member_id, c.checkin_date DESC, c.created_at DESC
    `);
    const map = new Map<string, string>();
    for (const row of results.rows as any[]) {
      map.set(row.new_member_id, row.outcome);
    }
    return map;
  }

  async getLastFollowupOutcomesForMembers(churchId: string): Promise<Map<string, string>> {
    const results = await db.execute(sql`
      SELECT DISTINCT ON (c.member_id) c.member_id, c.outcome
      FROM member_checkins c
      WHERE c.church_id = ${churchId}
        AND c.outcome != 'SCHEDULED_VISIT'
      ORDER BY c.member_id, c.checkin_date DESC, c.created_at DESC
    `);
    const map = new Map<string, string>();
    for (const row of results.rows as any[]) {
      map.set(row.member_id, row.outcome);
    }
    return map;
  }

  async getMemberFollowupsDue(churchId: string, userId?: string): Promise<Array<{
    id: string;
    memberId: string;
    memberFirstName: string;
    memberLastName: string;
    memberPhone: string | null;
    memberEmail: string | null;
    nextFollowupDate: string;
    nextFollowupTime: string | null;
    notes: string | null;
    videoLink: string | null;
    scheduledByName: string | null;
  }>> {
    const conditions = [
      eq(memberCheckins.churchId, churchId),
      eq(memberCheckins.outcome, "SCHEDULED_VISIT"),
      isNotNull(memberCheckins.nextFollowupDate)
    ];
    if (userId) {
      conditions.push(eq(memberCheckins.createdByUserId, userId));
    }
    const results = await db
      .select({
        id: memberCheckins.id,
        memberId: memberCheckins.memberId,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        memberPhone: members.phone,
        memberEmail: members.email,
        nextFollowupDate: memberCheckins.nextFollowupDate,
        nextFollowupTime: memberCheckins.nextFollowupTime,
        notes: memberCheckins.notes,
        videoLink: memberCheckins.videoLink,
        scheduledByFirstName: users.firstName,
        scheduledByLastName: users.lastName,
      })
      .from(memberCheckins)
      .innerJoin(members, eq(memberCheckins.memberId, members.id))
      .leftJoin(users, eq(memberCheckins.createdByUserId, users.id))
      .where(and(...conditions))
      .orderBy(memberCheckins.nextFollowupDate);
    return results.map(r => ({
      id: r.id,
      memberId: r.memberId,
      memberFirstName: r.memberFirstName,
      memberLastName: r.memberLastName,
      memberPhone: r.memberPhone,
      memberEmail: r.memberEmail,
      nextFollowupDate: r.nextFollowupDate || "",
      nextFollowupTime: r.nextFollowupTime,
      notes: r.notes,
      videoLink: r.videoLink,
      scheduledByName: r.scheduledByFirstName && r.scheduledByLastName
        ? `${r.scheduledByFirstName} ${r.scheduledByLastName}` : null,
    }));
  }

  // Guests
  async getGuest(id: string): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.id, id));
    return guest || undefined;
  }

  async getGuestsByChurch(churchId: string): Promise<Guest[]> {
    return db.select().from(guests).where(eq(guests.churchId, churchId)).orderBy(desc(guests.createdAt));
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const [created] = await db.insert(guests).values(guest).returning();
    return created;
  }

  async updateGuest(id: string, data: Partial<InsertGuest>): Promise<Guest> {
    const [updated] = await db.update(guests).set({ ...data, updatedAt: new Date() }).where(eq(guests.id, id)).returning();
    return updated;
  }

  async deleteGuest(id: string): Promise<void> {
    await db.delete(guests).where(eq(guests.id, id));
  }

  // Guest Check-ins
  async createGuestCheckin(checkin: InsertGuestCheckin): Promise<GuestCheckin> {
    const [created] = await db.insert(guestCheckins).values(checkin).returning();
    return created;
  }

  // New Member Follow-up Stage
  async updateNewMemberFollowUpStage(id: string, stage: string, completedAt?: Date): Promise<NewMember> {
    const updateData: any = { followUpStage: stage, updatedAt: new Date() };
    if (completedAt) {
      updateData.lastFollowUpCompletedAt = completedAt;
    }
    const [updated] = await db.update(newMembers).set(updateData).where(eq(newMembers.id, id)).returning();
    return updated;
  }

  async getNewMembersForFollowUpCheck(daysAgo: number): Promise<NewMember[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    
    return db.select().from(newMembers).where(
      and(
        isNotNull(newMembers.lastFollowUpCompletedAt),
        lte(newMembers.lastFollowUpCompletedAt, cutoffDate)
      )
    );
  }

  // Get new members who joined X days ago and have never been contacted (still in NEW stage)
  async getNewMembersNeedingContactReminder(days: number): Promise<NewMember[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return db.select().from(newMembers).where(
      and(
        eq(newMembers.followUpStage, "NEW"),
        lte(newMembers.createdAt, cutoffDate)
      )
    );
  }

  // Get new members who completed first follow-up X days ago and are in FIRST_COMPLETED stage
  async getNewMembersNeedingSecondFollowUp(days: number): Promise<NewMember[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return db.select().from(newMembers).where(
      and(
        eq(newMembers.followUpStage, "FIRST_COMPLETED"),
        isNotNull(newMembers.lastFollowUpCompletedAt),
        lte(newMembers.lastFollowUpCompletedAt, cutoffDate)
      )
    );
  }

  // Get new members who completed second follow-up X days ago and are in SECOND_COMPLETED stage
  async getNewMembersNeedingFinalFollowUp(days: number): Promise<NewMember[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return db.select().from(newMembers).where(
      and(
        eq(newMembers.followUpStage, "SECOND_COMPLETED"),
        isNotNull(newMembers.lastFollowUpCompletedAt),
        lte(newMembers.lastFollowUpCompletedAt, cutoffDate)
      )
    );
  }

  // Convert New Member to Member or Guest
  async convertNewMemberToMember(newMemberId: string, userId: string): Promise<Member> {
    const newMember = await this.getNewMember(newMemberId);
    if (!newMember) {
      throw new Error("New member not found");
    }

    const [member] = await db.insert(members).values({
      churchId: newMember.churchId,
      createdByUserId: userId,
      firstName: newMember.firstName,
      lastName: newMember.lastName,
      dateOfBirth: newMember.dateOfBirth,
      phone: newMember.phone,
      email: newMember.email,
      address: newMember.address,
      country: newMember.country,
      gender: newMember.gender,
      ageGroup: newMember.ageGroup,
      memberSince: new Date().toISOString().split('T')[0],
      notes: newMember.notes,
      selfSubmitted: "false",
    }).returning();

    // Delete the new member record
    await db.delete(newMembers).where(eq(newMembers.id, newMemberId));

    return member;
  }

  async convertNewMemberToGuest(newMemberId: string, userId: string): Promise<Guest> {
    const newMember = await this.getNewMember(newMemberId);
    if (!newMember) {
      throw new Error("New member not found");
    }

    const [guest] = await db.insert(guests).values({
      churchId: newMember.churchId,
      createdByUserId: userId,
      firstName: newMember.firstName,
      lastName: newMember.lastName,
      dateOfBirth: newMember.dateOfBirth,
      phone: newMember.phone,
      email: newMember.email,
      address: newMember.address,
      country: newMember.country,
      gender: newMember.gender,
      ageGroup: newMember.ageGroup,
      notes: newMember.notes,
      sourceType: "new_member",
      sourceId: newMemberId,
    }).returning();

    // Delete the new member record
    await db.delete(newMembers).where(eq(newMembers.id, newMemberId));

    return guest;
  }

  // Archived Ministries
  async getArchivedMinistries(): Promise<ArchivedMinistry[]> {
    return db.select().from(archivedMinistries).orderBy(desc(archivedMinistries.archivedAt));
  }

  async getArchivedMinistry(id: string): Promise<ArchivedMinistry | undefined> {
    const [archived] = await db.select().from(archivedMinistries).where(eq(archivedMinistries.id, id));
    return archived || undefined;
  }

  async archiveMinistry(churchId: string, deletedByUserId: string, deletedByRole: string): Promise<ArchivedMinistry> {
    // Get the church data
    const church = await this.getChurch(churchId);
    if (!church) {
      throw new Error("Church not found");
    }

    // Get all ministry users (ministry admins and leaders)
    const ministryUsers = await this.getUsersByChurch(churchId);
    const safeUsers = ministryUsers.map(({ passwordHash, ...user }) => user);

    // Get all converts and their check-ins
    const ministryConverts = await this.getConvertsByChurch(churchId);
    const convertCheckins: Checkin[] = [];
    for (const convert of ministryConverts) {
      const checkinList = await db.select().from(checkins).where(eq(checkins.convertId, convert.id));
      convertCheckins.push(...checkinList);
    }

    // Get all new members and their check-ins
    const ministryNewMembers = await this.getNewMembersByChurch(churchId);
    const newMemberCheckinsList: NewMemberCheckin[] = [];
    for (const newMember of ministryNewMembers) {
      const checkinList = await db.select().from(newMemberCheckins).where(eq(newMemberCheckins.newMemberId, newMember.id));
      newMemberCheckinsList.push(...checkinList);
    }

    // Get all members
    const ministryMembers = await this.getMembersByChurch(churchId);

    // Create backup data object
    const backupData = {
      church: {
        id: church.id,
        name: church.name,
        location: church.location,
        logoUrl: church.logoUrl,
        publicToken: church.publicToken,
        newMemberToken: church.newMemberToken,
        memberToken: church.memberToken,
        createdAt: church.createdAt,
      },
      users: safeUsers,
      converts: ministryConverts,
      checkins: convertCheckins,
      newMembers: ministryNewMembers,
      newMemberCheckins: newMemberCheckinsList,
      members: ministryMembers,
    };

    // Create the archived ministry record
    const [archived] = await db
      .insert(archivedMinistries)
      .values({
        originalChurchId: churchId,
        churchName: church.name,
        churchLocation: church.location,
        churchLogoUrl: church.logoUrl,
        deletedByUserId,
        deletedByRole,
        backupData,
      })
      .returning();

    // Delete all related data in reverse order of dependencies
    // 1. Delete email reminders for checkins
    for (const checkin of convertCheckins) {
      await db.delete(emailReminders).where(eq(emailReminders.checkinId, checkin.id));
    }

    // 2. Delete checkins
    await db.delete(checkins).where(eq(checkins.churchId, churchId));

    // 3. Delete new member checkins
    await db.delete(newMemberCheckins).where(eq(newMemberCheckins.churchId, churchId));

    // 4. Delete converts
    await db.delete(converts).where(eq(converts.churchId, churchId));

    // 5. Delete new members
    await db.delete(newMembers).where(eq(newMembers.churchId, churchId));

    // 6. Delete members
    await db.delete(members).where(eq(members.churchId, churchId));

    // 7. Delete account requests for this church
    await db.delete(accountRequests).where(eq(accountRequests.churchId, churchId));

    // 8. Delete users (leaders and ministry admin)
    await db.delete(users).where(eq(users.churchId, churchId));

    // 9. Delete the church
    await db.delete(churches).where(eq(churches.id, churchId));

    return archived;
  }

  async reinstateMinistry(archivedId: string): Promise<Church> {
    const archived = await this.getArchivedMinistry(archivedId);
    if (!archived) {
      throw new Error("Archived ministry not found");
    }

    const backupData = archived.backupData as {
      church: Church;
      users: Omit<User, 'passwordHash'>[];
      converts: Convert[];
      checkins: Checkin[];
      newMembers: NewMember[];
      newMemberCheckins: NewMemberCheckin[];
      members: Member[];
    };

    // Recreate the church with a new ID but same data
    const [restoredChurch] = await db
      .insert(churches)
      .values({
        name: backupData.church.name,
        location: backupData.church.location,
        logoUrl: backupData.church.logoUrl,
        publicToken: backupData.church.publicToken,
        newMemberToken: backupData.church.newMemberToken,
        memberToken: backupData.church.memberToken,
      })
      .returning();

    // ID mapping from old IDs to new IDs
    const userIdMap = new Map<string, string>();
    const convertIdMap = new Map<string, string>();
    const newMemberIdMap = new Map<string, string>();

    // Recreate users with new IDs (need to generate new temporary passwords)
    for (const user of backupData.users) {
      const bcrypt = await import("bcrypt");
      const tempPassword = `restored_${Math.random().toString(36).substring(2, 10)}`;
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      const [restoredUser] = await db
        .insert(users)
        .values({
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          passwordHash,
          churchId: restoredChurch.id,
        })
        .returning();
      
      userIdMap.set(user.id, restoredUser.id);
    }

    // Recreate converts with new IDs
    for (const convert of backupData.converts) {
      const createdByUserId = convert.createdByUserId ? userIdMap.get(convert.createdByUserId) : null;
      
      const [restoredConvert] = await db
        .insert(converts)
        .values({
          churchId: restoredChurch.id,
          createdByUserId: createdByUserId || null,
          firstName: convert.firstName,
          lastName: convert.lastName,
          dateOfBirth: convert.dateOfBirth,
          birthDay: convert.birthDay,
          birthMonth: convert.birthMonth,
          phone: convert.phone,
          email: convert.email,
          address: convert.address,
          country: convert.country,
          salvationDecision: convert.salvationDecision,
          summaryNotes: convert.summaryNotes,
          status: convert.status,
          selfSubmitted: convert.selfSubmitted,
          wantsContact: convert.wantsContact,
          gender: convert.gender,
          ageGroup: convert.ageGroup,
          isChurchMember: convert.isChurchMember,
          prayerRequest: convert.prayerRequest,
        })
        .returning();
      
      convertIdMap.set(convert.id, restoredConvert.id);
    }

    // Recreate checkins with new IDs
    for (const checkin of backupData.checkins) {
      const convertId = convertIdMap.get(checkin.convertId);
      const createdByUserId = userIdMap.get(checkin.createdByUserId);
      
      if (convertId && createdByUserId) {
        await db.insert(checkins).values({
          convertId,
          churchId: restoredChurch.id,
          createdByUserId,
          checkinDate: checkin.checkinDate,
          notes: checkin.notes,
          outcome: checkin.outcome,
          nextFollowupDate: checkin.nextFollowupDate,
          videoLink: checkin.videoLink,
        });
      }
    }

    // Recreate new members with new IDs
    for (const newMember of backupData.newMembers) {
      const createdByUserId = newMember.createdByUserId ? userIdMap.get(newMember.createdByUserId) : null;
      
      const [restoredNewMember] = await db
        .insert(newMembers)
        .values({
          churchId: restoredChurch.id,
          createdByUserId: createdByUserId || null,
          firstName: newMember.firstName,
          lastName: newMember.lastName,
          dateOfBirth: newMember.dateOfBirth,
          phone: newMember.phone,
          email: newMember.email,
          address: newMember.address,
          country: newMember.country,
          gender: newMember.gender,
          ageGroup: newMember.ageGroup,
          notes: newMember.notes,
          status: newMember.status,
          selfSubmitted: newMember.selfSubmitted,
        })
        .returning();
      
      newMemberIdMap.set(newMember.id, restoredNewMember.id);
    }

    // Recreate new member checkins
    for (const checkin of backupData.newMemberCheckins) {
      const newMemberId = newMemberIdMap.get(checkin.newMemberId);
      const createdByUserId = userIdMap.get(checkin.createdByUserId);
      
      if (newMemberId && createdByUserId) {
        await db.insert(newMemberCheckins).values({
          newMemberId,
          churchId: restoredChurch.id,
          createdByUserId,
          checkinDate: checkin.checkinDate,
          notes: checkin.notes,
          outcome: checkin.outcome,
          nextFollowupDate: checkin.nextFollowupDate,
          videoLink: checkin.videoLink,
        });
      }
    }

    // Recreate members
    for (const member of backupData.members) {
      const createdByUserId = member.createdByUserId ? userIdMap.get(member.createdByUserId) : null;
      
      await db.insert(members).values({
        churchId: restoredChurch.id,
        createdByUserId: createdByUserId || null,
        firstName: member.firstName,
        lastName: member.lastName,
        dateOfBirth: member.dateOfBirth,
        phone: member.phone,
        email: member.email,
        address: member.address,
        country: member.country,
        gender: member.gender,
        memberSince: member.memberSince,
        notes: member.notes,
        selfSubmitted: member.selfSubmitted,
      });
    }

    // Delete the archived ministry record
    await db.delete(archivedMinistries).where(eq(archivedMinistries.id, archivedId));

    return restoredChurch;
  }

  async deleteArchivedMinistry(id: string): Promise<void> {
    await db.delete(archivedMinistries).where(eq(archivedMinistries.id, id));
  }

  // Persons (Member identity)
  async getPerson(id: string): Promise<Person | undefined> {
    const result = await db.select().from(persons).where(eq(persons.id, id));
    return result[0];
  }

  async getPersonByEmail(email: string): Promise<Person | undefined> {
    const result = await db.select().from(persons).where(eq(persons.email, email.toLowerCase()));
    return result[0];
  }

  async createPerson(person: InsertPerson): Promise<Person> {
    const result = await db.insert(persons).values({
      ...person,
      email: person.email.toLowerCase(),
    }).returning();
    return result[0];
  }

  async updatePerson(id: string, data: Partial<InsertPerson>): Promise<Person> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.email) {
      updateData.email = data.email.toLowerCase();
    }
    const result = await db.update(persons).set(updateData).where(eq(persons.id, id)).returning();
    return result[0];
  }

  // Member Accounts
  async getMemberAccount(id: string): Promise<MemberAccount | undefined> {
    const result = await db.select().from(memberAccounts).where(eq(memberAccounts.id, id));
    return result[0];
  }

  async getMemberAccountByPersonId(personId: string): Promise<MemberAccount | undefined> {
    const result = await db.select().from(memberAccounts).where(eq(memberAccounts.personId, personId));
    return result[0];
  }

  async getMemberAccountByEmail(email: string): Promise<MemberAccount | undefined> {
    const person = await this.getPersonByEmail(email);
    if (!person) return undefined;
    return this.getMemberAccountByPersonId(person.id);
  }

  async createMemberAccount(account: InsertMemberAccount): Promise<MemberAccount> {
    const result = await db.insert(memberAccounts).values(account).returning();
    return result[0];
  }

  async updateMemberAccountPassword(id: string, passwordHash: string): Promise<void> {
    await db.update(memberAccounts).set({ 
      passwordHash,
      status: "ACTIVE"
    }).where(eq(memberAccounts.id, id));
  }

  async updateMemberAccountStatus(id: string, status: "PENDING_CLAIM" | "ACTIVE" | "SUSPENDED"): Promise<void> {
    await db.update(memberAccounts).set({ status }).where(eq(memberAccounts.id, id));
  }

  async updateMemberAccountLastLogin(id: string): Promise<void> {
    await db.update(memberAccounts).set({ lastLoginAt: new Date() }).where(eq(memberAccounts.id, id));
  }

  // Ministry Affiliations
  async getMinistryAffiliation(id: string): Promise<MinistryAffiliation | undefined> {
    const result = await db.select().from(ministryAffiliations).where(eq(ministryAffiliations.id, id));
    return result[0];
  }

  async getAffiliationsByPerson(personId: string): Promise<MinistryAffiliation[]> {
    return db.select().from(ministryAffiliations).where(eq(ministryAffiliations.personId, personId));
  }

  async getAffiliationsByMinistry(ministryId: string): Promise<MinistryAffiliation[]> {
    return db.select().from(ministryAffiliations).where(eq(ministryAffiliations.ministryId, ministryId));
  }

  async createMinistryAffiliation(affiliation: InsertMinistryAffiliation): Promise<MinistryAffiliation> {
    const result = await db.insert(ministryAffiliations).values(affiliation).returning();
    return result[0];
  }

  async updateMinistryAffiliationType(id: string, type: "convert" | "new_member" | "member"): Promise<MinistryAffiliation> {
    const result = await db.update(ministryAffiliations).set({ relationshipType: type }).where(eq(ministryAffiliations.id, id)).returning();
    return result[0];
  }

  async checkAffiliationExists(personId: string, ministryId: string): Promise<MinistryAffiliation | undefined> {
    const result = await db.select().from(ministryAffiliations).where(
      and(
        eq(ministryAffiliations.personId, personId),
        eq(ministryAffiliations.ministryId, ministryId)
      )
    );
    return result[0];
  }

  async deleteMinistryAffiliation(id: string): Promise<void> {
    await db.delete(ministryAffiliations).where(eq(ministryAffiliations.id, id));
  }

  async getAffiliationByRecordId(recordType: "convert" | "new_member" | "member", recordId: string): Promise<MinistryAffiliation | undefined> {
    let result;
    if (recordType === "convert") {
      result = await db.select().from(ministryAffiliations).where(eq(ministryAffiliations.convertId, recordId));
    } else if (recordType === "new_member") {
      result = await db.select().from(ministryAffiliations).where(eq(ministryAffiliations.newMemberId, recordId));
    } else {
      result = await db.select().from(ministryAffiliations).where(eq(ministryAffiliations.memberId, recordId));
    }
    return result[0];
  }

  async getMemberAccountsWithDetailsByMinistry(ministryId: string): Promise<{
    memberAccount: MemberAccount;
    person: Person;
    affiliation: MinistryAffiliation;
  }[]> {
    const results = await db
      .select({
        memberAccount: memberAccounts,
        person: persons,
        affiliation: ministryAffiliations,
      })
      .from(ministryAffiliations)
      .innerJoin(persons, eq(ministryAffiliations.personId, persons.id))
      .innerJoin(memberAccounts, eq(persons.id, memberAccounts.personId))
      .where(eq(ministryAffiliations.ministryId, ministryId));
    return results;
  }

  // Account Claim Tokens
  async createAccountClaimToken(token: InsertAccountClaimToken): Promise<AccountClaimToken> {
    const result = await db.insert(accountClaimTokens).values(token).returning();
    return result[0];
  }

  async getValidClaimToken(tokenHash: string): Promise<AccountClaimToken | undefined> {
    const result = await db.select().from(accountClaimTokens).where(
      and(
        eq(accountClaimTokens.tokenHash, tokenHash),
        gte(accountClaimTokens.expiresAt, new Date())
      )
    );
    // Only return if not used
    const token = result[0];
    if (token && !token.usedAt) {
      return token;
    }
    return undefined;
  }

  async markClaimTokenUsed(id: string): Promise<void> {
    await db.update(accountClaimTokens).set({ usedAt: new Date() }).where(eq(accountClaimTokens.id, id));
  }

  async invalidateExistingTokens(memberAccountId: string): Promise<void> {
    await db.update(accountClaimTokens).set({ usedAt: new Date() }).where(
      and(
        eq(accountClaimTokens.memberAccountId, memberAccountId),
        sql`${accountClaimTokens.usedAt} IS NULL`
      )
    );
  }

  // Member Prayer Requests
  async getMemberPrayerRequest(id: string): Promise<MemberPrayerRequest | undefined> {
    const result = await db.select().from(memberPrayerRequests).where(eq(memberPrayerRequests.id, id));
    return result[0];
  }

  async getMemberPrayerRequestsByPerson(personId: string, ministryId?: string): Promise<MemberPrayerRequest[]> {
    if (ministryId) {
      return db.select().from(memberPrayerRequests).where(
        and(
          eq(memberPrayerRequests.personId, personId),
          eq(memberPrayerRequests.ministryId, ministryId)
        )
      ).orderBy(desc(memberPrayerRequests.createdAt));
    }
    return db.select().from(memberPrayerRequests).where(eq(memberPrayerRequests.personId, personId)).orderBy(desc(memberPrayerRequests.createdAt));
  }

  async getMemberPrayerRequestsByMinistry(ministryId: string): Promise<MemberPrayerRequest[]> {
    return db.select().from(memberPrayerRequests).where(eq(memberPrayerRequests.ministryId, ministryId)).orderBy(desc(memberPrayerRequests.createdAt));
  }

  async createMemberPrayerRequest(request: InsertMemberPrayerRequest): Promise<MemberPrayerRequest> {
    const result = await db.insert(memberPrayerRequests).values(request).returning();
    return result[0];
  }

  async updateMemberPrayerRequest(id: string, data: Partial<InsertMemberPrayerRequest>): Promise<MemberPrayerRequest> {
    const result = await db.update(memberPrayerRequests).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(memberPrayerRequests.id, id)).returning();
    return result[0];
  }

  async updateMemberPrayerRequestStatus(id: string, status: "SUBMITTED" | "BEING_PRAYED_FOR" | "FOLLOWUP_SCHEDULED" | "ANSWERED" | "CLOSED"): Promise<MemberPrayerRequest> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === "ANSWERED" || status === "CLOSED") {
      updateData.resolvedAt = new Date();
    }
    const result = await db.update(memberPrayerRequests).set(updateData).where(eq(memberPrayerRequests.id, id)).returning();
    return result[0];
  }

  // Journal Entries
  async getJournalEntry(id: string): Promise<JournalEntry | undefined> {
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
    return entry || undefined;
  }

  async getJournalEntriesByPerson(personId: string): Promise<JournalEntry[]> {
    return await db.select().from(journalEntries)
      .where(eq(journalEntries.personId, personId))
      .orderBy(desc(journalEntries.createdAt));
  }

  async getJournalEntriesSharedWithMinistry(ministryId: string): Promise<JournalEntry[]> {
    return await db.select().from(journalEntries)
      .where(and(
        eq(journalEntries.sharedWithMinistryId, ministryId),
        eq(journalEntries.isPrivate, "false")
      ))
      .orderBy(desc(journalEntries.createdAt));
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [created] = await db.insert(journalEntries).values(entry).returning();
    return created;
  }

  async updateJournalEntry(id: string, data: Partial<InsertJournalEntry>): Promise<JournalEntry> {
    const result = await db.update(journalEntries).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(journalEntries.id, id)).returning();
    return result[0];
  }

  async deleteJournalEntry(id: string): Promise<void> {
    await db.delete(journalEntries).where(eq(journalEntries.id, id));
  }

  // Mass Follow-ups
  async createMassFollowup(data: InsertMassFollowup): Promise<MassFollowup> {
    const [created] = await db.insert(massFollowups).values(data).returning();
    return created;
  }

  async getMassFollowup(id: string): Promise<MassFollowup | undefined> {
    const [result] = await db.select().from(massFollowups).where(eq(massFollowups.id, id));
    return result || undefined;
  }

  async getMassFollowupsByChurch(churchId: string): Promise<MassFollowup[]> {
    return await db.select().from(massFollowups)
      .where(eq(massFollowups.churchId, churchId))
      .orderBy(desc(massFollowups.createdAt));
  }

  async updateMassFollowup(id: string, data: Partial<InsertMassFollowup>): Promise<MassFollowup> {
    const [updated] = await db.update(massFollowups).set(data).where(eq(massFollowups.id, id)).returning();
    return updated;
  }

  async createMassFollowupParticipant(data: InsertMassFollowupParticipant): Promise<MassFollowupParticipant> {
    const [created] = await db.insert(massFollowupParticipants).values(data).returning();
    return created;
  }

  async getMassFollowupParticipants(massFollowupId: string): Promise<MassFollowupParticipant[]> {
    return await db.select().from(massFollowupParticipants)
      .where(eq(massFollowupParticipants.massFollowupId, massFollowupId))
      .orderBy(massFollowupParticipants.lastName);
  }

  async updateMassFollowupParticipant(id: string, data: Partial<InsertMassFollowupParticipant>): Promise<MassFollowupParticipant> {
    const [updated] = await db.update(massFollowupParticipants).set(data).where(eq(massFollowupParticipants.id, id)).returning();
    return updated;
  }

  async createScheduledAnnouncement(data: InsertScheduledAnnouncement): Promise<ScheduledAnnouncement> {
    const [created] = await db.insert(scheduledAnnouncements).values(data).returning();
    return created;
  }

  async getScheduledAnnouncementsByChurch(churchId: string): Promise<ScheduledAnnouncement[]> {
    return await db.select().from(scheduledAnnouncements)
      .where(and(
        eq(scheduledAnnouncements.churchId, churchId),
        eq(scheduledAnnouncements.status, "PENDING")
      ))
      .orderBy(scheduledAnnouncements.scheduledAt);
  }

  async getScheduledAnnouncement(id: string): Promise<ScheduledAnnouncement | undefined> {
    const [result] = await db.select().from(scheduledAnnouncements)
      .where(eq(scheduledAnnouncements.id, id));
    return result || undefined;
  }

  async updateScheduledAnnouncementStatus(id: string, status: "PENDING" | "SENT" | "FAILED" | "CANCELLED", errorMessage?: string): Promise<void> {
    const updateData: any = { status };
    if (status === "SENT") {
      updateData.sentAt = new Date();
    }
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }
    await db.update(scheduledAnnouncements).set(updateData).where(eq(scheduledAnnouncements.id, id));
  }

  async getPendingScheduledAnnouncements(beforeDate: Date): Promise<ScheduledAnnouncement[]> {
    return await db.select().from(scheduledAnnouncements)
      .where(and(
        eq(scheduledAnnouncements.status, "PENDING"),
        lte(scheduledAnnouncements.scheduledAt, beforeDate)
      ));
  }

  async getFormConfiguration(churchId: string, formType: "convert" | "new_member" | "member"): Promise<FormConfiguration | undefined> {
    const [config] = await db.select().from(formConfigurations)
      .where(and(
        eq(formConfigurations.churchId, churchId),
        eq(formConfigurations.formType, formType)
      ));
    return config || undefined;
  }

  async getFormConfigurations(churchId: string): Promise<FormConfiguration[]> {
    return await db.select().from(formConfigurations)
      .where(eq(formConfigurations.churchId, churchId));
  }

  async upsertFormConfiguration(churchId: string, formType: "convert" | "new_member" | "member", data: { title?: string; heroTitle?: string; description?: string; fieldConfig: any; customFields: any }): Promise<FormConfiguration> {
    const existing = await this.getFormConfiguration(churchId, formType);
    if (existing) {
      const [updated] = await db.update(formConfigurations)
        .set({
          title: data.title,
          heroTitle: data.heroTitle,
          description: data.description,
          fieldConfig: data.fieldConfig,
          customFields: data.customFields,
          updatedAt: new Date(),
        })
        .where(eq(formConfigurations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(formConfigurations)
        .values({
          churchId,
          formType,
          title: data.title,
          heroTitle: data.heroTitle,
          description: data.description,
          fieldConfig: data.fieldConfig,
          customFields: data.customFields,
        })
        .returning();
      return created;
    }
  }

  // Password Reset Tokens
  async createPasswordResetToken(email: string, tokenHash: string, accountType: "staff" | "member", expiresAt: Date): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values({
      email,
      tokenHash,
      accountType,
      expiresAt,
    }).returning();
    return token;
  }

  async getPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | undefined> {
    const [token] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gte(passwordResetTokens.expiresAt, new Date()),
      ));
    if (token && token.usedAt) return undefined;
    return token;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async invalidatePasswordResetTokens(email: string, accountType: "staff" | "member"): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(
        eq(passwordResetTokens.email, email),
        eq(passwordResetTokens.accountType, accountType),
      ));
  }
}

export const storage = new DatabaseStorage();
