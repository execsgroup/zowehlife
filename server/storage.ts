import {
  churches,
  users,
  converts,
  checkins,
  prayerRequests,
  auditLog,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, lte, gte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  getAdminCount(): Promise<number>;
  getLeaders(): Promise<User[]>;
  getLeadersByChurch(churchId: string): Promise<User[]>;

  // Churches
  getChurch(id: string): Promise<Church | undefined>;
  getChurches(): Promise<Church[]>;
  createChurch(church: InsertChurch): Promise<Church>;
  updateChurch(id: string, church: Partial<InsertChurch>): Promise<Church>;

  // Converts
  getConvert(id: string): Promise<Convert | undefined>;
  getConverts(): Promise<Convert[]>;
  getConvertsByChurch(churchId: string): Promise<Convert[]>;
  createConvert(convert: InsertConvert): Promise<Convert>;
  updateConvert(id: string, convert: Partial<InsertConvert>): Promise<Convert>;

  // Checkins
  getCheckin(id: string): Promise<Checkin | undefined>;
  getCheckinsByConvert(convertId: string): Promise<Checkin[]>;
  getCheckinsByChurch(churchId: string): Promise<Checkin[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;
  getFollowupsDue(churchId?: string): Promise<Checkin[]>;

  // Prayer Requests
  getPrayerRequests(): Promise<PrayerRequest[]>;
  createPrayerRequest(request: InsertPrayerRequest): Promise<PrayerRequest>;

  // Audit Log
  createAuditLog(log: InsertAuditLog): Promise<void>;

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
    }>;
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

  async getChurches(): Promise<Church[]> {
    return db.select().from(churches).orderBy(desc(churches.createdAt));
  }

  async createChurch(insertChurch: InsertChurch): Promise<Church> {
    const [church] = await db.insert(churches).values(insertChurch).returning();
    return church;
  }

  async updateChurch(id: string, updateData: Partial<InsertChurch>): Promise<Church> {
    const [church] = await db
      .update(churches)
      .set(updateData)
      .where(eq(churches.id, id))
      .returning();
    return church;
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

  // Prayer Requests
  async getPrayerRequests(): Promise<PrayerRequest[]> {
    return db.select().from(prayerRequests).orderBy(desc(prayerRequests.createdAt));
  }

  async createPrayerRequest(insertRequest: InsertPrayerRequest): Promise<PrayerRequest> {
    const [request] = await db.insert(prayerRequests).values(insertRequest).returning();
    return request;
  }

  // Audit Log
  async createAuditLog(log: InsertAuditLog): Promise<void> {
    await db.insert(auditLog).values(log);
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
      })),
    };
  }
}

export const storage = new DatabaseStorage();
