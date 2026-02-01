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

  // Churches
  getChurch(id: string): Promise<Church | undefined>;
  getChurchByName(name: string): Promise<Church | undefined>;
  getChurchByToken(token: string): Promise<Church | undefined>;
  getChurches(): Promise<Church[]>;
  createChurch(church: InsertChurch): Promise<Church>;
  findOrCreateChurch(name: string): Promise<{ church: Church; created: boolean }>;
  updateChurch(id: string, church: Partial<InsertChurch>): Promise<Church>;
  updateChurchLogo(id: string, logoUrl: string): Promise<void>;
  generateTokenForChurch(id: string): Promise<Church>;

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
  }): Promise<Convert>;
  updateConvert(id: string, convert: Partial<InsertConvert>): Promise<Convert>;

  // Checkins
  getCheckin(id: string): Promise<Checkin | undefined>;
  getCheckinsByConvert(convertId: string): Promise<Checkin[]>;
  getCheckinsByChurch(churchId: string): Promise<Checkin[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;
  getFollowupsDue(churchId?: string): Promise<Checkin[]>;
  getUpcomingFollowups(churchId: string): Promise<Array<{
    id: string;
    convertId: string;
    convertFirstName: string;
    convertLastName: string;
    convertPhone: string | null;
    convertEmail: string | null;
    nextFollowupDate: string;
    notes: string | null;
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

  // Email Reminders
  hasReminderBeenSent(checkinId: string, reminderType: string): Promise<boolean>;
  recordReminderSent(checkinId: string, reminderType: string): Promise<void>;
  getCheckinsWithUpcomingFollowups(): Promise<Array<{
    checkinId: string;
    convertId: string;
    convertFirstName: string;
    convertLastName: string;
    convertEmail: string | null;
    leaderName: string;
    leaderEmail: string;
    churchName: string;
    nextFollowupDate: string;
  }>>;
  getExpiredScheduledFollowups(): Promise<Array<{ id: string; nextFollowupDate: string }>>;
  updateCheckinOutcome(id: string, outcome: "CONNECTED" | "NO_RESPONSE" | "NEEDS_PRAYER" | "SCHEDULED_VISIT" | "REFERRED" | "OTHER" | "NOT_COMPLETED"): Promise<void>;
  markConvertsAsNeverContacted(): Promise<number>;

  // Stats
  getAdminStats(): Promise<{
    totalChurches: number;
    totalLeaders: number;
    totalConverts: number;
    convertsLast30Days: number;
    followupsDue: number;
    recentPrayerRequests: number;
  }>;

  getLeaderStats(churchId: string): Promise<{
    churchName: string;
    totalConverts: number;
    newConverts: number;
    activeConverts: number;
    followupsDue: Array<{
      id: string;
      convertId: string;
      convertName: string;
      nextFollowupDate: string;
      videoLink: string | null;
    }>;
  }>;

  getMinistryAdminStats(churchId: string): Promise<{
    totalConverts: number;
    newConverts: number;
    totalLeaders: number;
  }>;
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
    // Generate a unique token for the church with retry logic
    const maxRetries = 5;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = this.generateRandomToken();
        const [church] = await db.insert(churches).values({ ...insertChurch, publicToken: token }).returning();
        return church;
      } catch (error: any) {
        // Check if it's a unique constraint violation
        if (error?.code === '23505' && error?.constraint?.includes('public_token')) {
          lastError = error;
          continue; // Retry with a new token
        }
        throw error; // Re-throw other errors
      }
    }
    
    throw new Error(`Failed to generate unique token after ${maxRetries} attempts`);
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

  async getUpcomingFollowups(churchId: string) {
    const today = new Date().toISOString().split("T")[0];
    const results = await db
      .select({
        id: checkins.id,
        convertId: checkins.convertId,
        convertFirstName: converts.firstName,
        convertLastName: converts.lastName,
        convertPhone: converts.phone,
        convertEmail: converts.email,
        nextFollowupDate: checkins.nextFollowupDate,
        notes: checkins.notes,
      })
      .from(checkins)
      .innerJoin(converts, eq(checkins.convertId, converts.id))
      .where(
        and(
          gte(checkins.nextFollowupDate, today),
          eq(checkins.churchId, churchId)
        )
      )
      .orderBy(checkins.nextFollowupDate);
    return results.map(r => ({
      ...r,
      nextFollowupDate: r.nextFollowupDate || ""
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

  async getLeaderStats(churchId: string) {
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

    const followups = await db
      .select({
        id: checkins.id,
        convertId: checkins.convertId,
        nextFollowupDate: checkins.nextFollowupDate,
        videoLink: checkins.videoLink,
        firstName: converts.firstName,
        lastName: converts.lastName,
      })
      .from(checkins)
      .innerJoin(converts, eq(checkins.convertId, converts.id))
      .where(and(eq(checkins.churchId, churchId), lte(checkins.nextFollowupDate, today)))
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
        videoLink: f.videoLink || null,
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

    return {
      totalConverts: Number(totalCount?.count || 0),
      newConverts: Number(newCount?.count || 0),
      totalLeaders: Number(leaderCount?.count || 0),
    };
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
    leaderName: string;
    leaderEmail: string;
    churchName: string;
    nextFollowupDate: string;
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
        leaderFirstName: users.firstName,
        leaderLastName: users.lastName,
        leaderEmail: users.email,
        churchName: churches.name,
        nextFollowupDate: checkins.nextFollowupDate,
      })
      .from(checkins)
      .innerJoin(converts, eq(checkins.convertId, converts.id))
      .innerJoin(users, eq(checkins.createdByUserId, users.id))
      .innerJoin(churches, eq(checkins.churchId, churches.id))
      .where(eq(checkins.nextFollowupDate, tomorrowStr));

    return results.map(r => ({
      checkinId: r.checkinId,
      convertId: r.convertId,
      convertFirstName: r.convertFirstName,
      convertLastName: r.convertLastName,
      convertEmail: r.convertEmail,
      leaderName: `${r.leaderFirstName} ${r.leaderLastName}`,
      leaderEmail: r.leaderEmail,
      churchName: r.churchName,
      nextFollowupDate: r.nextFollowupDate || "",
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
}

export const storage = new DatabaseStorage();
