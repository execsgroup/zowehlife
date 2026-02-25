import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { OUTCOME_TO_STATUS, DB_STATUS_TO_DISPLAY, EXPORT_STATUS_LABELS } from "@shared/status-constants";
import { sendFollowUpNotification, sendFollowUpReminderEmail, sendAccountApprovalEmail, sendMinistryAdminApprovalEmail, sendAccountDenialEmail, sendMinistryRemovalEmail, getUncachableResendClient } from "./email";
import { startReminderScheduler } from "./scheduler";
import { SMS_PLAN_LIMITS, getCurrentBillingPeriod, sendSms, sendMms, formatPhoneForSms, buildFollowUpSmsMessage } from "./sms";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { buildUrl } from "./utils/url";
import { generateJitsiLink, generateMassJitsiLink, generatePersonalJitsiLink } from "./utils/jitsi";
import { getMaxLeadersForPlan, getLeaderLimitMessage } from "./utils/plan-limits";
import OpenAI from "openai";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import {
  provisionMemberAccountForConvert,
  provisionMemberAccountForMember,
  authenticateMember,
  claimAccountWithToken,
  resendClaimEmail,
  resendClaimToken,
} from "./member-account-service";
import {
  insertChurchSchema,
  insertPrayerRequestSchema,
  insertContactRequestSchema,
  insertAccountRequestSchema,
  insertMinistryRequestSchema,
  loginSchema,
  adminSetupSchema,
  publicConvertSubmissionSchema,
  publicNewMemberSubmissionSchema,
  publicMemberSubmissionSchema,
  claimAccountSchema,
  memberLoginSchema,
  memberPrayerRequestSubmissionSchema,
  formConfigUpdateSchema,
} from "@shared/schema";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function parseExcelBuffer(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  return rows;
}

function normalizeColumnName(col: string): string {
  return col.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mapRowToFields(row: Record<string, string>, columnMap: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [rawCol, value] of Object.entries(row)) {
    const normalized = normalizeColumnName(rawCol);
    if (columnMap[normalized]) {
      result[columnMap[normalized]] = String(value).trim();
    }
  }
  return result;
}


declare module "express-session" {
  interface SessionData {
    userId?: string;
    memberAccountId?: string;
    personId?: string;
    currentMinistryId?: string;
  }
}

// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Middleware to check admin role
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }

  (req as any).user = user;
  next();
}

// Middleware to check leader role (also allows Ministry Admin)
async function requireLeader(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || (user.role !== "LEADER" && user.role !== "MINISTRY_ADMIN")) {
    return res.status(403).json({ message: "Forbidden - Leader access required" });
  }

  if (!user.churchId) {
    return res.status(403).json({ message: "Leader not assigned to a church" });
  }

  (req as any).user = user;
  next();
}

// Middleware to check ministry admin role
async function requireMinistryAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "MINISTRY_ADMIN") {
    return res.status(403).json({ message: "Forbidden - Ministry Admin access required" });
  }

  if (!user.churchId) {
    return res.status(403).json({ message: "Ministry Admin not assigned to a ministry" });
  }

  (req as any).user = user;
  next();
}

// Middleware to check subscription status and enforce read-only for past_due/suspended ministries
async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  if (!req.session.userId) {
    return next();
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || !user.churchId || user.role === "ADMIN") {
    return next();
  }

  const billingExclusions = [
    "/api/ministry-admin/billing/portal",
    "/api/ministry-admin/subscription",
    "/api/leader/subscription",
  ];
  if (billingExclusions.some(p => req.path === p)) {
    return next();
  }

  const church = await storage.getChurch(user.churchId);
  if (!church) {
    return next();
  }

  if (church.subscriptionStatus === "past_due" || church.subscriptionStatus === "suspended" || church.subscriptionStatus === "canceled") {
    return res.status(403).json({
      message: "Your ministry subscription is inactive. Please update your payment method to regain full access.",
      subscriptionStatus: church.subscriptionStatus,
      readOnly: true,
    });
  }

  next();
}

// Rate limiting for login
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const record = loginAttempts.get(ip);

  if (record) {
    if (now - record.lastAttempt > windowMs) {
      // Reset after window expires
      loginAttempts.set(ip, { count: 1, lastAttempt: now });
    } else if (record.count >= maxAttempts) {
      return res.status(429).json({
        message: "Too many login attempts. Please try again later.",
      });
    } else {
      record.count++;
      record.lastAttempt = now;
    }
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  }

  next();
}

async function autoApproveMinistry(data: {
  ministryName: string;
  location: string | null;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string | null;
  description: string | null;
  plan: "free" | "foundations" | "formation" | "stewardship";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}): Promise<{ church: any; user: any; tempPassword: string }> {
  const existingUser = await storage.getUserByEmail(data.adminEmail);
  if (existingUser) {
    throw new Error("An account with this email already exists");
  }

  const existingChurch = await storage.getChurchByName(data.ministryName);
  if (existingChurch) {
    throw new Error("A ministry with this name already exists");
  }

  const church = await storage.createChurch({
    name: data.ministryName,
    location: data.location,
    plan: data.plan,
  });

  if (data.plan === "free") {
    await storage.updateChurchSubscription(church.id, { subscriptionStatus: "free" });
  } else if (data.stripeCustomerId || data.stripeSubscriptionId) {
    await storage.updateChurchSubscription(church.id, {
      stripeCustomerId: data.stripeCustomerId || undefined,
      stripeSubscriptionId: data.stripeSubscriptionId || undefined,
      subscriptionStatus: "active",
    });
  }

  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const newUser = await storage.createUser({
    role: "MINISTRY_ADMIN",
    firstName: data.adminFirstName,
    lastName: data.adminLastName,
    email: data.adminEmail,
    passwordHash,
    churchId: church.id,
  });

  await storage.createAuditLog({
    actorUserId: newUser.id,
    action: "AUTO_APPROVE_MINISTRY",
    entityType: "CHURCH",
    entityId: church.id,
  });

  const emailResult = await sendMinistryAdminApprovalEmail({
    adminName: `${data.adminFirstName} ${data.adminLastName}`,
    adminEmail: data.adminEmail,
    ministryName: church.name,
    temporaryPassword: tempPassword,
  });

  if (!emailResult.success) {
    console.error("Failed to send auto-approval email:", emailResult.error);
  }

  return { church, user: newUser, tempPassword };
}

async function enrichCheckinsWithSchedulerName<T extends { createdByUserId: string }>(
  checkinsList: T[]
): Promise<(T & { scheduledByName: string | null })[]> {
  const userIds = [...new Set(checkinsList.map(c => c.createdByUserId).filter(Boolean))];
  const userMap = new Map<string, string>();
  for (const uid of userIds) {
    const u = await storage.getUser(uid);
    if (u) userMap.set(uid, `${u.firstName} ${u.lastName}`);
  }
  return checkinsList.map(c => ({
    ...c,
    scheduledByName: userMap.get(c.createdByUserId) || null,
  }));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "fallback-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Register object storage routes
  registerObjectStorageRoutes(app);

  app.post("/api/mms-image/upload-url", requireAuth, async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      const baseUrl = buildUrl("", req);
      const publicUrl = `${baseUrl}${objectPath}`;
      res.json({ uploadURL, objectPath, publicUrl });
    } catch (error) {
      console.error("Error generating MMS upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Apply subscription enforcement middleware to leader and ministry-admin write routes
  app.use("/api/leader", requireActiveSubscription);
  app.use("/api/ministry-admin", requireActiveSubscription);

  // ==================== TEST EMAIL ROUTE ====================
  // Debug endpoint to test email sending
  app.post("/api/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email address required" });
      }
      
      console.log("[Test Email] Attempting to send test email to:", email);
      
      const result = await sendFollowUpNotification({
        convertName: "Test Convert",
        convertEmail: undefined, // Don't send to convert for this test
        leaderName: "Test Leader",
        leaderEmail: email,
        churchName: "Test Ministry",
        followUpDate: new Date().toISOString().split('T')[0],
        notes: "This is a test email to verify email sending works",
      });
      
      console.log("[Test Email] Result:", result);
      
      if (result.success) {
        res.json({ success: true, message: "Test email sent successfully! Check your inbox." });
      } else {
        res.status(500).json({ success: false, message: "Email sending failed", error: result.error });
      }
    } catch (error: any) {
      console.error("[Test Email] Error:", error);
      res.status(500).json({ success: false, message: error.message || "Unknown error" });
    }
  });

  // ==================== AUTH ROUTES ====================

  // Admin password reset (using setup key)
  app.post("/api/auth/admin-reset", async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        newPassword: z.string().min(8),
        setupKey: z.string().min(1),
      });

      const data = schema.parse(req.body);

      // Verify setup key
      if (data.setupKey !== process.env.ADMIN_SETUP_KEY) {
        return res.status(401).json({ message: "Invalid setup key" });
      }

      // Find admin user by email
      const user = await storage.getUserByEmail(data.email);
      if (!user || user.role !== "ADMIN") {
        return res.status(404).json({ message: "Admin account not found with this email" });
      }

      // Update password
      const passwordHash = await bcrypt.hash(data.newPassword, 10);
      await storage.updateUserPassword(user.id, passwordHash);

      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Password Reset - Request reset link (works for all account types)
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const normalizedEmail = email.toLowerCase().trim();

      let accountType: "staff" | "member" | null = null;
      let userName = "";

      const staffUser = await storage.getUserByEmail(normalizedEmail);
      if (staffUser) {
        accountType = "staff";
        userName = `${staffUser.firstName} ${staffUser.lastName}`.trim();
      } else {
        const memberAccount = await storage.getMemberAccountByEmail(normalizedEmail);
        if (memberAccount && memberAccount.status === "ACTIVE") {
          accountType = "member";
          const person = await storage.getPerson(memberAccount.personId);
          userName = person ? `${person.firstName} ${person.lastName}` : "Member";
        }
      }

      if (accountType) {
        await storage.invalidatePasswordResetTokens(normalizedEmail, accountType);

        const crypto = await import("crypto");
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await storage.createPasswordResetToken(normalizedEmail, tokenHash, accountType, expiresAt);

        const resetUrl = buildUrl(`/reset-password?token=${rawToken}&type=${accountType}`, req);

        try {
          const { client, fromEmail } = await getUncachableResendClient();
          await client.emails.send({
            from: fromEmail || "noreply@zowehlife.com",
            to: normalizedEmail,
            subject: "Password Reset Request",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563EB;">Password Reset Request</h2>
                <p>Hello ${userName},</p>
                <p>We received a request to reset your password. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #999; font-size: 12px;">Zoweh Life Ministry Platform</p>
              </div>
            `,
          });
        } catch (emailError) {
          console.error("Failed to send password reset email:", emailError);
        }
      }

      res.json({ message: "If an account exists with that email, a reset link has been sent." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Password Reset - Complete reset with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const data = z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8),
        accountType: z.enum(["staff", "member"]),
      }).parse(req.body);

      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(data.token).digest("hex");

      const resetToken = await storage.getPasswordResetTokenByHash(tokenHash);
      if (!resetToken || resetToken.accountType !== data.accountType) {
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      }

      const passwordHash = await bcrypt.hash(data.newPassword, 10);

      if (data.accountType === "staff") {
        const user = await storage.getUserByEmail(resetToken.email);
        if (!user) {
          return res.status(404).json({ message: "Account not found" });
        }
        await storage.updateUserPassword(user.id, passwordHash);
      } else {
        const memberAccount = await storage.getMemberAccountByEmail(resetToken.email);
        if (!memberAccount) {
          return res.status(404).json({ message: "Account not found" });
        }
        await storage.updateMemberAccountPassword(memberAccount.id, passwordHash);
      }

      await storage.markPasswordResetTokenUsed(resetToken.id);

      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error in reset password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Check if setup is available
  app.get("/api/auth/setup-status", async (req, res) => {
    try {
      const adminCount = await storage.getAdminCount();
      res.json({ available: adminCount === 0 });
    } catch (error) {
      res.status(500).json({ message: "Failed to check setup status" });
    }
  });

  // First admin setup
  app.post("/api/auth/setup", async (req, res) => {
    try {
      const data = adminSetupSchema.parse(req.body);

      // Check if admin already exists
      const adminCount = await storage.getAdminCount();
      if (adminCount > 0) {
        return res.status(400).json({ message: "Admin account already exists" });
      }

      // Verify setup key (trim to handle accidental whitespace)
      const envKey = process.env.ADMIN_SETUP_KEY?.trim();
      const userKey = data.setupKey?.trim();
      if (userKey !== envKey) {
        return res.status(401).json({ message: "Invalid setup key" });
      }

      // Check if email already taken
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Create admin
      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        role: "ADMIN",
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        churchId: null,
      });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "USER",
        entityId: user.id,
      });

      res.status(201).json({ message: "Admin account created" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  // Login
  app.post("/api/auth/login", rateLimitLogin, async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(data.password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Clear any member session to prevent role confusion
      req.session.memberAccountId = undefined;
      req.session.personId = undefined;
      req.session.currentMinistryId = undefined;
      
      req.session.userId = user.id;

      // Clear login attempts on successful login
      const ip = req.ip || "unknown";
      loginAttempts.delete(ip);

      // Don't return password hash
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out" });
    });
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      const { passwordHash, ...safeUser } = user;

      // Include church info for leaders
      let church = null;
      if (user.churchId) {
        church = await storage.getChurch(user.churchId);
      }

      res.json({ ...safeUser, church: church ? { id: church.id, name: church.name } : null });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // ==================== MEMBER AUTH ROUTES ====================

  // Member login
  app.post("/api/member/login", rateLimitLogin, async (req, res) => {
    try {
      const data = memberLoginSchema.parse(req.body);
      const result = await authenticateMember(data.email, data.password);

      if (!result.success || !result.memberAccount || !result.person) {
        return res.status(401).json({ message: result.error || "Invalid credentials" });
      }

      // Get affiliations to set default ministry
      const affiliations = await storage.getAffiliationsByPerson(result.person.id);
      const defaultMinistryId = affiliations.length > 0 ? affiliations[0].ministryId : null;

      // Clear any staff session to prevent role confusion
      req.session.userId = undefined;
      
      req.session.memberAccountId = result.memberAccount.id;
      req.session.personId = result.person.id;
      req.session.currentMinistryId = defaultMinistryId || undefined;

      res.json({
        message: "Logged in successfully",
        person: {
          id: result.person.id,
          email: result.person.email,
          firstName: result.person.firstName,
          lastName: result.person.lastName,
        },
        currentMinistryId: defaultMinistryId,
      });
    } catch (error: any) {
      if (error?.errors) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Claim member account (set password)
  app.post("/api/member/claim", async (req, res) => {
    try {
      const data = claimAccountSchema.parse(req.body);
      const result = await claimAccountWithToken(data.token, data.password);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ message: "Account claimed successfully. You can now log in." });
    } catch (error: any) {
      if (error?.errors) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to claim account" });
    }
  });

  // Member logout
  app.post("/api/member/logout", (req, res) => {
    req.session.memberAccountId = undefined;
    req.session.personId = undefined;
    req.session.currentMinistryId = undefined;
    res.json({ message: "Logged out" });
  });

  // Get current member profile with affiliations
  app.get("/api/member/me", async (req, res) => {
    try {
      if (!req.session.memberAccountId || !req.session.personId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const person = await storage.getPerson(req.session.personId);
      if (!person) {
        return res.status(404).json({ message: "Person not found" });
      }

      const memberAccount = await storage.getMemberAccount(req.session.memberAccountId);
      if (!memberAccount) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Get all affiliations with ministry details
      const affiliations = await storage.getAffiliationsByPerson(person.id);
      const affiliationsWithDetails = await Promise.all(
        affiliations.map(async (aff) => {
          const ministry = await storage.getChurch(aff.ministryId);
          return {
            id: aff.id,
            ministryId: aff.ministryId,
            ministryName: ministry?.name || "Unknown",
            relationshipType: aff.relationshipType,
          };
        })
      );

      // Get current ministry details
      let currentMinistry = null;
      if (req.session.currentMinistryId) {
        const ministry = await storage.getChurch(req.session.currentMinistryId);
        if (ministry) {
          currentMinistry = { id: ministry.id, name: ministry.name };
        }
      }

      res.json({
        person: {
          id: person.id,
          email: person.email,
          firstName: person.firstName,
          lastName: person.lastName,
          phone: person.phone,
        },
        accountStatus: memberAccount.status,
        affiliations: affiliationsWithDetails,
        currentMinistry,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get member profile" });
    }
  });

  // Switch member's current ministry context
  app.post("/api/member/switch-ministry", async (req, res) => {
    try {
      if (!req.session.memberAccountId || !req.session.personId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { ministryId } = req.body;
      if (!ministryId) {
        return res.status(400).json({ message: "Ministry ID is required" });
      }

      // Verify user has affiliation with this ministry
      const affiliation = await storage.checkAffiliationExists(req.session.personId, ministryId);
      if (!affiliation) {
        return res.status(403).json({ message: "You are not affiliated with this ministry" });
      }

      req.session.currentMinistryId = ministryId;

      const ministry = await storage.getChurch(ministryId);
      res.json({
        message: "Ministry switched successfully",
        currentMinistry: ministry ? { id: ministry.id, name: ministry.name } : null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to switch ministry" });
    }
  });

  // Middleware to check member authentication
  function requireMemberAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session.memberAccountId || !req.session.personId) {
      return res.status(401).json({ message: "Member not authenticated" });
    }
    next();
  }

  // Submit member prayer request
  app.post("/api/member/prayer-requests", requireMemberAuth, async (req, res) => {
    try {
      const data = memberPrayerRequestSubmissionSchema.parse(req.body);
      const prayerRequest = await storage.createMemberPrayerRequest({
        personId: req.session.personId!,
        ministryId: req.session.currentMinistryId || data.ministryId || null,
        requestText: data.requestText,
        category: data.category || null,
        isPrivate: data.isPrivate || false,
      });
      res.status(201).json(prayerRequest);
    } catch (error: any) {
      if (error?.errors) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to submit prayer request" });
    }
  });

  // Get member's prayer requests
  app.get("/api/member/prayer-requests", requireMemberAuth, async (req, res) => {
    try {
      const prayerRequests = await storage.getMemberPrayerRequests(req.session.personId!);
      res.json(prayerRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get prayer requests" });
    }
  });

  // Get member's spiritual journey (converts and members records across ministries)
  app.get("/api/member/journey", requireMemberAuth, async (req, res) => {
    try {
      const affiliations = await storage.getAffiliationsByPerson(req.session.personId!);
      
      // Use the affiliation's linked record IDs for efficient lookup
      const journey = await Promise.all(
        affiliations.map(async (aff) => {
          const ministry = await storage.getChurch(aff.ministryId);
          let record = null;
          
          // Use the direct foreign key references on the affiliation record
          if (aff.convertId) {
            const convert = await storage.getConvert(aff.convertId);
            record = convert ? {
              id: convert.id,
              createdAt: convert.createdAt,
              status: convert.status,
            } : null;
          } else if (aff.newMemberId) {
            const newMember = await storage.getNewMember(aff.newMemberId);
            record = newMember ? {
              id: newMember.id,
              createdAt: newMember.createdAt,
              status: newMember.followUpStage,
            } : null;
          } else if (aff.memberId) {
            const member = await storage.getMember(aff.memberId);
            record = member ? {
              id: member.id,
              createdAt: member.createdAt,
              status: "ACTIVE",
            } : null;
          }
          
          return {
            ministryId: aff.ministryId,
            ministryName: ministry?.name || "Unknown",
            relationshipType: aff.relationshipType,
            joinedAt: aff.createdAt,
            record,
          };
        })
      );

      res.json({ journey });
    } catch (error) {
      res.status(500).json({ message: "Failed to get journey" });
    }
  });

  // Get member's follow-ups for current ministry
  app.get("/api/member/follow-ups", requireMemberAuth, async (req, res) => {
    try {
      if (!req.session.currentMinistryId) {
        return res.json({ followUps: [] });
      }

      const person = await storage.getPerson(req.session.personId!);
      if (!person) {
        return res.status(404).json({ message: "Person not found" });
      }

      // Find the convert record for this person in current ministry to get follow-ups
      const converts = await storage.getConvertsByChurch(req.session.currentMinistryId);
      const convert = converts.find(c => 
        c.email?.toLowerCase() === person.email.toLowerCase()
      );

      if (!convert) {
        return res.json({ followUps: [] });
      }

      const followUps = await storage.getFollowUpsByConvert(convert.id);
      
      // Return follow-ups with info member should see (scheduled times, video links, and completion status)
      const memberVisibleFollowUps = followUps.map(fu => ({
        id: fu.id,
        scheduledDate: fu.scheduledDate,
        status: fu.status,
        completedAt: fu.completedAt,
        videoLink: fu.videoLink,
        nextFollowupDate: fu.nextFollowupDate,
        nextFollowupTime: fu.nextFollowupTime,
      }));

      res.json({ followUps: memberVisibleFollowUps });
    } catch (error) {
      res.status(500).json({ message: "Failed to get follow-ups" });
    }
  });

  // ==================== MEMBER JOURNAL ENTRIES ====================

  // Get member's journal entries
  app.get("/api/member/journal", requireMemberAuth, async (req, res) => {
    try {
      const entries = await storage.getJournalEntriesByPerson(req.session.personId!);
      res.json({ entries });
    } catch (error) {
      res.status(500).json({ message: "Failed to get journal entries" });
    }
  });

  // Create a new journal entry
  app.post("/api/member/journal", requireMemberAuth, async (req, res) => {
    try {
      const { title, content, isPrivate, shareWithMinistry } = req.body;
      
      if (!content || content.trim() === "") {
        return res.status(400).json({ message: "Content is required" });
      }

      const entry = await storage.createJournalEntry({
        personId: req.session.personId!,
        title: title || null,
        content,
        isPrivate: isPrivate === false ? "false" : "true",
        sharedWithMinistryId: shareWithMinistry && !isPrivate ? req.session.currentMinistryId : null,
      });

      res.json({ entry });
    } catch (error) {
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  // Update a journal entry
  app.patch("/api/member/journal/:id", requireMemberAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, isPrivate, shareWithMinistry } = req.body;

      // Verify ownership
      const existing = await storage.getJournalEntry(id);
      if (!existing || existing.personId !== req.session.personId) {
        return res.status(404).json({ message: "Entry not found" });
      }

      const entry = await storage.updateJournalEntry(id, {
        title: title !== undefined ? title : existing.title,
        content: content !== undefined ? content : existing.content,
        isPrivate: isPrivate === false ? "false" : "true",
        sharedWithMinistryId: shareWithMinistry && isPrivate === false ? req.session.currentMinistryId : null,
      });

      res.json({ entry });
    } catch (error) {
      res.status(500).json({ message: "Failed to update journal entry" });
    }
  });

  // Delete a journal entry
  app.delete("/api/member/journal/:id", requireMemberAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getJournalEntry(id);
      if (!existing || existing.personId !== req.session.personId) {
        return res.status(404).json({ message: "Entry not found" });
      }

      await storage.deleteJournalEntry(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete journal entry" });
    }
  });

  // ==================== LEADER MEMBER ACCOUNT MANAGEMENT ====================

  // Get member accounts for ministry (leaders/admins only)
  async function handleGetMemberAccounts(req: Request, res: Response) {
    try {
      // Get ministry ID based on user role
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let ministryId: string | undefined;
      if (user.role === "ADMIN") {
        // Admin can specify a ministry ID
        ministryId = req.query.ministryId as string;
        if (!ministryId) {
          return res.status(400).json({ message: "Ministry ID required for admin" });
        }
      } else if (user.role === "MINISTRY_ADMIN" || user.role === "LEADER") {
        ministryId = user.churchId || undefined;
      }

      if (!ministryId) {
        return res.status(400).json({ message: "No ministry assigned" });
      }

      const accounts = await storage.getMemberAccountsWithDetailsByMinistry(ministryId);
      
      // Map to response format (don't expose password hashes)
      const response = accounts.map(acc => ({
        id: acc.memberAccount.id,
        personId: acc.person.id,
        firstName: acc.person.firstName,
        lastName: acc.person.lastName,
        email: acc.person.email,
        phone: acc.person.phone,
        status: acc.memberAccount.status,
        lastLoginAt: acc.memberAccount.lastLoginAt,
        createdAt: acc.memberAccount.createdAt,
        affiliationType: acc.affiliation.relationshipType,
        affiliationId: acc.affiliation.id,
      }));

      res.json(response);
    } catch (error) {
      console.error("Failed to get member accounts:", error);
      res.status(500).json({ message: "Failed to get member accounts" });
    }
  }

  app.get("/api/leader/member-accounts", requireAuth, handleGetMemberAccounts);
  app.get("/api/ministry-admin/member-accounts", requireAuth, handleGetMemberAccounts);

  // Resend claim token for a pending member account
  async function handleResendClaim(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Get ministry ID based on user role
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let ministryId: string | undefined;
      let ministryName: string = "Zoweh Life Ministry";
      
      if (user.role === "ADMIN") {
        const ministryIdParam = req.query.ministryId as string;
        if (ministryIdParam) {
          ministryId = ministryIdParam;
          const ministry = await storage.getChurch(ministryId);
          if (ministry) ministryName = ministry.name;
        }
      } else if (user.role === "MINISTRY_ADMIN" || user.role === "LEADER") {
        ministryId = user.churchId || undefined;
        if (ministryId) {
          const ministry = await storage.getChurch(ministryId);
          if (ministry) ministryName = ministry.name;
        }
      }

      if (!ministryId) {
        return res.status(400).json({ message: "No ministry assigned" });
      }

      // Verify the member account belongs to the requester's ministry
      const memberAccount = await storage.getMemberAccount(id);
      if (!memberAccount) {
        return res.status(404).json({ message: "Member account not found" });
      }
      const affiliations = await storage.getAffiliationsByPerson(memberAccount.personId);
      const hasAccess = user.role === "ADMIN" || affiliations.some(a => a.ministryId === ministryId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Not authorized to manage this account" });
      }

      const result = await resendClaimToken(id, ministryName);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ message: "Claim token resent successfully" });
    } catch (error) {
      console.error("Failed to resend claim token:", error);
      res.status(500).json({ message: "Failed to resend claim token" });
    }
  }

  app.post("/api/leader/member-accounts/:id/resend-claim", requireAuth, handleResendClaim);
  app.post("/api/ministry-admin/member-accounts/:id/resend-claim", requireAuth, handleResendClaim);

  // Update member account status (suspend/activate)
  async function handleUpdateMemberAccountStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["ACTIVE", "SUSPENDED"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Get user and verify authorization (only ministry admins and platform admins can suspend)
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (user.role === "LEADER") {
        return res.status(403).json({ message: "Only admins can change account status" });
      }

      // Verify the member account belongs to the requester's ministry
      const memberAccount = await storage.getMemberAccount(id);
      if (!memberAccount) {
        return res.status(404).json({ message: "Member account not found" });
      }
      
      // Get ministry ID based on role
      const ministryId = user.role === "ADMIN" ? null : user.churchId;
      
      if (ministryId) {
        const affiliations = await storage.getAffiliationsByPerson(memberAccount.personId);
        const hasAccess = affiliations.some(a => a.ministryId === ministryId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Not authorized to manage this account" });
        }
      }

      await storage.updateMemberAccountStatus(id, status);
      res.json({ message: `Account status updated to ${status}` });
    } catch (error) {
      console.error("Failed to update member account status:", error);
      res.status(500).json({ message: "Failed to update account status" });
    }
  }

  app.patch("/api/leader/member-accounts/:id/status", requireAuth, handleUpdateMemberAccountStatus);
  app.patch("/api/ministry-admin/member-accounts/:id/status", requireAuth, handleUpdateMemberAccountStatus);

  // Remove a person from ministry by record type (convert, new_member, member)
  async function handleRemoveFromMinistry(req: Request, res: Response) {
    try {
      const { type, recordId } = req.params;
      
      // Validate type
      if (!["convert", "new_member", "member"].includes(type)) {
        return res.status(400).json({ message: "Invalid type. Must be 'convert', 'new_member', or 'member'" });
      }

      // Get user and verify authorization
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Determine requester's ministry
      let requesterMinistryId: string | null = null;
      if (user.role === "ADMIN") {
        requesterMinistryId = null; // Admin can access any ministry
      } else if (user.role === "MINISTRY_ADMIN" || user.role === "LEADER") {
        requesterMinistryId = user.churchId || null;
      }

      // Find the affiliation by record type and ID
      const affiliation = await storage.getAffiliationByRecordId(type as "convert" | "new_member" | "member", recordId);
      
      if (affiliation) {
        // Has affiliation - use existing flow
        // Verify the affiliation belongs to the requester's ministry
        if (requesterMinistryId && affiliation.ministryId !== requesterMinistryId) {
          return res.status(403).json({ message: "Not authorized to remove this person" });
        }

        // Get person and ministry details for the email
        const person = await storage.getPerson(affiliation.personId);
        const ministry = await storage.getChurch(affiliation.ministryId);

        if (!person || !ministry) {
          return res.status(404).json({ message: "Person or ministry not found" });
        }

        // Delete the affiliation
        await storage.deleteMinistryAffiliation(affiliation.id);

        // Send notification email only if person has an email
        if (person.email) {
          await sendMinistryRemovalEmail({
            memberEmail: person.email,
            memberName: `${person.firstName} ${person.lastName}`,
            ministryName: ministry.name,
          });
        }

        res.json({ message: "Person removed from ministry successfully" });
      } else {
        // No affiliation - record was manually added, delete it directly
        let record: any = null;
        let recordEmail: string | null = null;
        let recordName: string = "";
        let recordMinistryId: string | null = null;

        if (type === "convert") {
          record = await storage.getConvert(recordId);
          if (record) {
            recordEmail = record.email;
            recordName = `${record.firstName} ${record.lastName}`;
            recordMinistryId = record.churchId;
          }
        } else if (type === "new_member") {
          record = await storage.getNewMember(recordId);
          if (record) {
            recordEmail = record.email;
            recordName = `${record.firstName} ${record.lastName}`;
            recordMinistryId = record.churchId;
          }
        } else if (type === "member") {
          record = await storage.getMember(recordId);
          if (record) {
            recordEmail = record.email;
            recordName = `${record.firstName} ${record.lastName}`;
            recordMinistryId = record.churchId;
          }
        }

        if (!record) {
          return res.status(404).json({ message: "Record not found" });
        }

        // Verify the record belongs to the requester's ministry
        if (requesterMinistryId && recordMinistryId !== requesterMinistryId) {
          return res.status(403).json({ message: "Not authorized to remove this person" });
        }

        // Get ministry for email
        const ministry = recordMinistryId ? await storage.getChurch(recordMinistryId) : null;

        // Delete the record directly
        if (type === "convert") {
          await storage.deleteConvert(recordId);
        } else if (type === "new_member") {
          await storage.deleteNewMember(recordId);
        } else if (type === "member") {
          await storage.deleteMember(recordId);
        }

        // Send notification email only if record has an email
        if (recordEmail && ministry) {
          await sendMinistryRemovalEmail({
            memberEmail: recordEmail,
            memberName: recordName,
            ministryName: ministry.name,
          });
        }

        res.json({ message: "Person removed from ministry successfully" });
      }
    } catch (error) {
      console.error("Failed to remove person from ministry:", error);
      res.status(500).json({ message: "Failed to remove person from ministry" });
    }
  }

  app.delete("/api/leader/remove/:type/:recordId", requireAuth, handleRemoveFromMinistry);
  app.delete("/api/ministry-admin/remove/:type/:recordId", requireAuth, handleRemoveFromMinistry);

  // Remove a person from ministry (delete affiliation)
  async function handleDeleteAffiliation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Get user and verify authorization
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the affiliation to verify it exists and get details
      const affiliation = await storage.getMinistryAffiliation(id);
      if (!affiliation) {
        return res.status(404).json({ message: "Affiliation not found" });
      }

      // Determine requester's ministry
      let requesterMinistryId: string | null = null;
      if (user.role === "ADMIN") {
        requesterMinistryId = null; // Admin can access any ministry
      } else if (user.role === "MINISTRY_ADMIN" || user.role === "LEADER") {
        requesterMinistryId = user.churchId || null;
      }

      // Verify the affiliation belongs to the requester's ministry
      if (requesterMinistryId && affiliation.ministryId !== requesterMinistryId) {
        return res.status(403).json({ message: "Not authorized to remove this person" });
      }

      // Get person and ministry details for the email
      const person = await storage.getPerson(affiliation.personId);
      const ministry = await storage.getChurch(affiliation.ministryId);

      if (!person || !ministry) {
        return res.status(404).json({ message: "Person or ministry not found" });
      }

      // Delete the affiliation
      await storage.deleteMinistryAffiliation(id);

      // Send notification email only if person has an email
      if (person.email) {
        await sendMinistryRemovalEmail({
          memberEmail: person.email,
          memberName: `${person.firstName} ${person.lastName}`,
          ministryName: ministry.name,
        });
      }

      res.json({ message: "Person removed from ministry successfully" });
    } catch (error) {
      console.error("Failed to remove person from ministry:", error);
      res.status(500).json({ message: "Failed to remove person from ministry" });
    }
  }

  app.delete("/api/leader/affiliations/:id", requireAuth, handleDeleteAffiliation);
  app.delete("/api/ministry-admin/affiliations/:id", requireAuth, handleDeleteAffiliation);

  // ==================== PUBLIC ROUTES ====================

  // Submit prayer request
  app.post("/api/prayer-requests", async (req, res) => {
    try {
      const data = insertPrayerRequestSchema.parse(req.body);
      const request = await storage.createPrayerRequest(data);
      res.status(201).json({ message: "Prayer request submitted" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to submit prayer request" });
    }
  });

  // Submit a contact request (public)
  app.post("/api/contact-requests", async (req, res) => {
    try {
      const data = insertContactRequestSchema.parse(req.body);
      const request = await storage.createContactRequest(data);
      res.status(201).json({ message: "Contact request submitted" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to submit contact request" });
    }
  });

  // Get public list of churches (for account request form)
  app.get("/api/public/churches", async (req, res) => {
    try {
      const churchList = await storage.getChurches();
      res.json(churchList.map(c => ({ id: c.id, name: c.name })));
    } catch (error) {
      res.status(500).json({ message: "Failed to get churches" });
    }
  });

  // Get church info by public token (for public convert form)
  app.get("/api/public/church/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const church = await storage.getChurchByToken(token);
      
      if (!church) {
        return res.status(404).json({ message: "Church not found" });
      }
      
      const formConfig = await storage.getFormConfiguration(church.id, "convert");
      res.json({ id: church.id, name: church.name, logoUrl: church.logoUrl, formConfig: formConfig || null });
    } catch (error) {
      res.status(500).json({ message: "Failed to get church info" });
    }
  });

  // Submit convert via public church link
  app.post("/api/public/church/:token/converts", async (req, res) => {
    try {
      const { token } = req.params;
      const church = await storage.getChurchByToken(token);
      
      if (!church) {
        return res.status(404).json({ message: "Church not found" });
      }
      
      const data = publicConvertSubmissionSchema.parse(req.body);
      
      const convert = await storage.createPublicConvert(church.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        dateOfBirth: data.dateOfBirth,
        country: data.country,
        salvationDecision: data.salvationDecision,
        wantsContact: data.wantsContact,
        gender: data.gender,
        ageGroup: data.ageGroup,
        isChurchMember: data.isChurchMember,
        prayerRequest: data.prayerRequest,
        customFieldData: data.customFieldData,
      });
      
      // Auto-provision member account if email provided
      if (data.email) {
        try {
          await provisionMemberAccountForConvert({
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            ministryId: church.id,
            ministryName: church.name,
            convertId: convert.id,
          });
        } catch (provisionError) {
          console.log("[Member Account] Auto-provision failed, continuing:", provisionError);
        }
      }
      
      res.status(201).json({ 
        message: "Thank you! Your information has been submitted successfully.",
        convertId: convert.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to submit convert information" });
    }
  });

  // Submit leader account request
  app.post("/api/account-requests", async (req, res) => {
    try {
      const data = insertAccountRequestSchema.parse(req.body);

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Verify the church exists if churchId is provided
      if (data.churchId) {
        const church = await storage.getChurch(data.churchId);
        if (!church) {
          return res.status(400).json({ message: "Selected ministry does not exist" });
        }
      }

      const request = await storage.createAccountRequest(data);
      res.status(201).json({ message: "Account request submitted successfully. You will be notified once reviewed." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to submit account request" });
    }
  });

  // Get Stripe publishable key
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      res.status(500).json({ message: "Failed to get Stripe key" });
    }
  });

  // Get ministry plan prices from Stripe
  app.get("/api/stripe/ministry-plans", async (_req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.list({ active: true, limit: 10 });

      const planProducts = products.data.filter(p => p.metadata?.plan_id);
      const plans = await Promise.all(
        planProducts.map(async (product) => {
          const prices = await stripe.prices.list({
            product: product.id,
            active: true,
            limit: 1,
          });
          const price = prices.data[0];
          return {
            planId: product.metadata.plan_id,
            productId: product.id,
            name: product.name,
            description: product.description,
            priceId: price?.id,
            amount: price?.unit_amount || 0,
            currency: price?.currency || 'usd',
            interval: price?.recurring?.interval || 'month',
          };
        })
      );

      res.json(plans);
    } catch (error) {
      console.error("Failed to get ministry plans:", error);
      res.status(500).json({ message: "Failed to get ministry plans" });
    }
  });

  // Submit ministry registration - validates data and creates Stripe checkout (no DB record yet)
  app.post("/api/ministry-requests", async (req, res) => {
    try {
      const data = insertMinistryRequestSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(data.adminEmail);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const existingChurch = await storage.getChurchByName(data.ministryName);
      if (existingChurch) {
        return res.status(400).json({ message: "A ministry with this name already exists" });
      }

      if (data.plan === "free") {
        const request = await storage.createMinistryRequest({
          ...data,
          stripeSessionId: null,
          paymentStatus: "free",
        });
        await storage.updateMinistryRequestStatus(request.id, "APPROVED", null);

        try {
          const result = await autoApproveMinistry({
            ministryName: data.ministryName,
            location: data.location || null,
            adminFirstName: data.adminFirstName,
            adminLastName: data.adminLastName,
            adminEmail: data.adminEmail,
            adminPhone: data.adminPhone || null,
            description: data.description || null,
            plan: "free",
          });
          return res.status(200).json({
            free: true,
            requestId: request.id,
            approved: true,
            message: "Your free ministry has been created! Check your email for login credentials.",
          });
        } catch (approvalError: any) {
          console.error("Free tier auto-approval failed:", approvalError);
          return res.status(400).json({ message: approvalError.message || "Failed to create ministry" });
        }
      }

      const stripe = await getUncachableStripeClient();

      const products = await stripe.products.list({ active: true, limit: 10 });
      const planProduct = products.data.find(p => p.metadata?.plan_id === data.plan);

      if (!planProduct) {
        return res.status(400).json({ message: "Selected plan not found. Please try again." });
      }

      const prices = await stripe.prices.list({
        product: planProduct.id,
        active: true,
        limit: 1,
      });
      const price = prices.data[0];

      if (!price) {
        return res.status(400).json({ message: "Plan pricing not available. Please try again." });
      }

      const baseUrl = buildUrl("");
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: price.id, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/register-ministry/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/register-ministry/cancel`,
        customer_email: data.adminEmail,
        metadata: {
          ministry_name: data.ministryName,
          location: data.location || "",
          admin_first_name: data.adminFirstName,
          admin_last_name: data.adminLastName,
          admin_email: data.adminEmail,
          admin_phone: data.adminPhone || "",
          description: data.description || "",
          plan: data.plan,
        },
      });

      res.status(200).json({
        checkoutUrl: session.url,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Ministry request checkout error:", error);
      res.status(500).json({ message: "Failed to start checkout. Please try again." });
    }
  });

  // Confirm ministry registration after successful Stripe payment - auto-approves
  app.post("/api/ministry-requests/confirm", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "Missing session ID" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed", paymentStatus: session.payment_status });
      }

      const meta = session.metadata || {};

      const existingBySession = await storage.getMinistryRequestByStripeSession(sessionId);
      if (existingBySession) {
        return res.json({
          message: "Registration already confirmed",
          requestId: existingBySession.id,
          paymentStatus: "paid",
          approved: true,
          plan: existingBySession.plan,
        });
      }

      const plan = (meta.plan as "free" | "foundations" | "formation" | "stewardship") || "foundations";
      const requestData = {
        ministryName: meta.ministry_name || "Unknown Ministry",
        location: meta.location || null,
        adminFirstName: meta.admin_first_name || "Unknown",
        adminLastName: meta.admin_last_name || "Unknown",
        adminEmail: meta.admin_email || "",
        adminPhone: meta.admin_phone || null,
        description: meta.description || null,
        plan,
      };

      const request = await storage.createMinistryRequest(requestData);
      await storage.updateMinistryRequestPayment(request.id, sessionId);
      await storage.updateMinistryRequestPaymentStatus(request.id, "paid");
      await storage.updateMinistryRequestStatus(request.id, "APPROVED", null);

      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
      const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id || null;

      try {
        const result = await autoApproveMinistry({
          ...requestData,
          stripeCustomerId,
          stripeSubscriptionId,
        });
      } catch (approvalError: any) {
        if (approvalError.message?.includes("already exists")) {
          return res.json({
            message: "Ministry has already been created. Check your email for login credentials.",
            requestId: request.id,
            paymentStatus: "paid",
            approved: true,
            plan: request.plan,
          });
        }
        throw approvalError;
      }

      res.status(201).json({
        message: "Ministry registration confirmed and approved! Check your email for login credentials.",
        requestId: request.id,
        paymentStatus: "paid",
        approved: true,
        plan: request.plan,
      });
    } catch (error: any) {
      console.error("Ministry request confirmation error:", error);
      res.status(500).json({ message: error.message || "Failed to confirm registration" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  // Admin stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Admin reporting routes
  app.get("/api/admin/reports/growth", requireAdmin, async (req, res) => {
    try {
      const data = await storage.getGrowthTrends();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get growth trends" });
    }
  });

  app.get("/api/admin/reports/status-breakdown", requireAdmin, async (req, res) => {
    try {
      const data = await storage.getStatusBreakdown();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get status breakdown" });
    }
  });

  // Get churches with counts
  app.get("/api/admin/churches", requireAdmin, async (req, res) => {
    try {
      const churchList = await storage.getChurches();
      const churchesWithCounts = await Promise.all(
        churchList.map(async (church) => {
          // Ensure church has a public token
          let currentChurch = church;
          if (!church.publicToken) {
            currentChurch = await storage.generateTokenForChurch(church.id);
          }
          
          const leaders = await storage.getLeadersByChurch(church.id);
          const convertsList = await storage.getConvertsByChurch(church.id);
          return {
            ...currentChurch,
            leaderCount: leaders.length,
            convertCount: convertsList.length,
          };
        })
      );
      res.json(churchesWithCounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get churches" });
    }
  });

  // Create church
  app.post("/api/admin/churches", requireAdmin, async (req, res) => {
    try {
      const data = insertChurchSchema.parse(req.body);
      const church = await storage.createChurch(data);

      await storage.createAuditLog({
        actorUserId: (req as any).user.id,
        action: "CREATE",
        entityType: "CHURCH",
        entityId: church.id,
      });

      res.status(201).json(church);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create church" });
    }
  });

  // Update church
  app.patch("/api/admin/churches/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertChurchSchema.partial().parse(req.body);
      const church = await storage.updateChurch(id, data);

      await storage.createAuditLog({
        actorUserId: (req as any).user.id,
        action: "UPDATE",
        entityType: "CHURCH",
        entityId: id,
      });

      res.json(church);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update church" });
    }
  });

  // Get ministry profile with full details
  app.get("/api/admin/ministry/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const church = await storage.getChurch(id);
      
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }

      // Get all users for this ministry (leaders and ministry admin)
      const ministryUsers = await storage.getUsersByChurch(id);
      const leaders = ministryUsers.map(({ passwordHash, createdAt, ...user }) => ({
        ...user,
        createdAt: new Date(createdAt).toISOString(),
      }));
      const ministryAdmin = leaders.find(l => l.role === "MINISTRY_ADMIN") || null;

      // Get converts for this ministry
      const converts = await storage.getConvertsByChurch(id);

      // Get new members for this ministry
      const newMembers = await storage.getNewMembersByChurch(id);

      // Get members for this ministry
      const members = await storage.getMembersByChurch(id);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const convertsThisMonth = converts.filter(c => new Date(c.createdAt) >= startOfMonth).length;
      const newMembersThisMonth = newMembers.filter(nm => new Date(nm.createdAt) >= startOfMonth).length;
      const membersThisMonth = members.filter(m => new Date(m.createdAt) >= startOfMonth).length;

      const stats = {
        totalConverts: converts.length,
        totalNewMembers: newMembers.length,
        totalMembers: members.length,
        totalLeaders: leaders.length,
        convertsThisMonth,
        newMembersThisMonth,
        membersThisMonth,
      };

      // Build recent activity from converts, new members, and members
      const recentActivity: Array<{ type: string; description: string; date: string }> = [];
      
      // Add recent converts
      converts.slice(0, 5).forEach(c => {
        recentActivity.push({
          type: "Convert",
          description: `${c.firstName} ${c.lastName} made a salvation decision`,
          date: new Date(c.createdAt).toISOString(),
        });
      });

      // Add recent new members
      newMembers.slice(0, 5).forEach(nm => {
        recentActivity.push({
          type: "New Member",
          description: `${nm.firstName} ${nm.lastName} joined as a new member`,
          date: new Date(nm.createdAt).toISOString(),
        });
      });

      // Add recent members
      members.slice(0, 5).forEach(m => {
        recentActivity.push({
          type: "Member",
          description: `${m.firstName} ${m.lastName} registered as a member`,
          date: new Date(m.createdAt).toISOString(),
        });
      });

      // Sort by date descending
      recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        church,
        leaders,
        ministryAdmin,
        converts,
        newMembers,
        members,
        stats,
        recentActivity: recentActivity.slice(0, 10),
      });
    } catch (error) {
      console.error("Failed to get ministry profile:", error);
      res.status(500).json({ message: "Failed to get ministry profile" });
    }
  });

  // Archive (cancel) a ministry - Platform Admin
  app.delete("/api/admin/churches/:id/archive", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const church = await storage.getChurch(id);
      
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }

      const archived = await storage.archiveMinistry(id, (req as any).user.id, "ADMIN");

      await storage.createAuditLog({
        actorUserId: (req as any).user.id,
        action: "ARCHIVE",
        entityType: "CHURCH",
        entityId: id,
      });

      res.json({ message: "Ministry account cancelled and backed up successfully", archived });
    } catch (error) {
      console.error("Failed to archive ministry:", error);
      res.status(500).json({ message: "Failed to cancel ministry account" });
    }
  });

  // Get all archived ministries - Platform Admin
  app.get("/api/admin/archived-ministries", requireAdmin, async (req, res) => {
    try {
      const archivedMinistries = await storage.getArchivedMinistries();
      res.json(archivedMinistries);
    } catch (error) {
      console.error("Failed to get archived ministries:", error);
      res.status(500).json({ message: "Failed to get archived ministries" });
    }
  });

  // Get a specific archived ministry - Platform Admin
  app.get("/api/admin/archived-ministries/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const archived = await storage.getArchivedMinistry(id);
      
      if (!archived) {
        return res.status(404).json({ message: "Archived ministry not found" });
      }

      res.json(archived);
    } catch (error) {
      console.error("Failed to get archived ministry:", error);
      res.status(500).json({ message: "Failed to get archived ministry" });
    }
  });

  // Reinstate an archived ministry - Platform Admin
  app.post("/api/admin/archived-ministries/:id/reinstate", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const archived = await storage.getArchivedMinistry(id);
      
      if (!archived) {
        return res.status(404).json({ message: "Archived ministry not found" });
      }

      const restoredChurch = await storage.reinstateMinistry(id);

      await storage.createAuditLog({
        actorUserId: (req as any).user.id,
        action: "REINSTATE",
        entityType: "CHURCH",
        entityId: restoredChurch.id,
      });

      res.json({ message: "Ministry account reinstated successfully", church: restoredChurch });
    } catch (error) {
      console.error("Failed to reinstate ministry:", error);
      res.status(500).json({ message: "Failed to reinstate ministry account" });
    }
  });

  // Permanently delete an archived ministry - Platform Admin
  app.delete("/api/admin/archived-ministries/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const archived = await storage.getArchivedMinistry(id);
      
      if (!archived) {
        return res.status(404).json({ message: "Archived ministry not found" });
      }

      await storage.deleteArchivedMinistry(id);

      await storage.createAuditLog({
        actorUserId: (req as any).user.id,
        action: "PERMANENT_DELETE",
        entityType: "ARCHIVED_CHURCH",
        entityId: id,
      });

      res.json({ message: "Archived ministry permanently deleted" });
    } catch (error) {
      console.error("Failed to delete archived ministry:", error);
      res.status(500).json({ message: "Failed to delete archived ministry" });
    }
  });

  // Get leaders with church info
  app.get("/api/admin/leaders", requireAdmin, async (req, res) => {
    try {
      const leaders = await storage.getLeaders();
      const leadersWithChurch = await Promise.all(
        leaders.map(async (leader) => {
          const { passwordHash, ...safeLeader } = leader;
          let church = null;
          if (leader.churchId) {
            const churchData = await storage.getChurch(leader.churchId);
            church = churchData ? { id: churchData.id, name: churchData.name } : null;
          }
          return { ...safeLeader, church };
        })
      );
      res.json(leadersWithChurch);
    } catch (error) {
      res.status(500).json({ message: "Failed to get leaders" });
    }
  });

  // Create leader
  app.post("/api/admin/leaders", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        churchId: z.string().min(1),
      });

      const data = schema.parse(req.body);

      // Check if email already taken
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Check if church exists
      const church = await storage.getChurch(data.churchId);
      if (!church) {
        return res.status(400).json({ message: "Church not found" });
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        role: "LEADER",
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        churchId: data.churchId,
      });

      await storage.createAuditLog({
        actorUserId: (req as any).user.id,
        action: "CREATE",
        entityType: "USER",
        entityId: user.id,
      });

      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create leader" });
    }
  });

  // Reset leader password
  app.post("/api/admin/leaders/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        newPassword: z.string().min(8),
      });

      const data = schema.parse(req.body);

      const user = await storage.getUser(id);
      if (!user || user.role !== "LEADER") {
        return res.status(404).json({ message: "Leader not found" });
      }

      const passwordHash = await bcrypt.hash(data.newPassword, 10);
      await storage.updateUserPassword(id, passwordHash);

      await storage.createAuditLog({
        actorUserId: (req as any).user.id,
        action: "RESET_PASSWORD",
        entityType: "USER",
        entityId: id,
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Delete leader
  app.delete("/api/admin/leaders/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;

      const user = await storage.getUser(id);
      if (!user || user.role !== "LEADER") {
        return res.status(404).json({ message: "Leader not found" });
      }

      // Prevent deleting yourself
      if (user.id === adminUser.id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      await storage.deleteUser(id);

      await storage.createAuditLog({
        actorUserId: adminUser.id,
        action: "DELETE_LEADER",
        entityType: "USER",
        entityId: id,
      });

      res.json({ message: "Leader deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete leader" });
    }
  });

  // Get all converts (admin view)
  app.get("/api/admin/converts", requireAdmin, async (req, res) => {
    try {
      const convertsList = await storage.getConverts();
      const convertsWithChurch = await Promise.all(
        convertsList.map(async (convert) => {
          const church = await storage.getChurch(convert.churchId);
          return {
            ...convert,
            church: church ? { id: church.id, name: church.name } : null,
          };
        })
      );
      res.json(convertsWithChurch);
    } catch (error) {
      res.status(500).json({ message: "Failed to get converts" });
    }
  });

  // Get single convert by ID (admin)
  app.get("/api/admin/converts/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const convert = await storage.getConvert(id);
      
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }
      
      const church = await storage.getChurch(convert.churchId);
      res.json({
        ...convert,
        church: church || null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get convert" });
    }
  });

  // Admin create check-in for any convert
  app.post("/api/admin/converts/:convertId/checkins", requireAdmin, async (req, res) => {
    try {
      const { convertId } = req.params;
      const user = (req as any).user;

      const convert = await storage.getConvert(convertId);
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }

      const schema = z.object({
        checkinDate: z.string(),
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
        notes: z.string().optional(),
        nextFollowupDate: z.string().optional(),
        customLeaderMessage: z.string().optional(),
        customConvertMessage: z.string().optional(),
        customLeaderSubject: z.string().optional(),
        customConvertSubject: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const checkin = await storage.createCheckin({
        convertId: convert.id,
        churchId: convert.churchId,
        createdByUserId: user.id,
        checkinDate: data.checkinDate,
        outcome: data.outcome,
        notes: data.notes || null,
        nextFollowupDate: data.nextFollowupDate || null,
      });

      // Send follow-up notification email if a next follow-up date is set
      if (data.nextFollowupDate) {
        const church = await storage.getChurch(convert.churchId);
        const contactUrl = buildUrl("/contact", req);
        
        sendFollowUpNotification({
          convertName: `${convert.firstName} ${convert.lastName}`,
          convertEmail: convert.email || undefined,
          leaderName: `${user.firstName} ${user.lastName}`,
          leaderEmail: user.email,
          churchName: church?.name || "Ministry",
          followUpDate: data.nextFollowupDate,
          notes: data.notes || undefined,
          contactUrl,
          customLeaderMessage: data.customLeaderMessage || undefined,
          customConvertMessage: data.customConvertMessage || undefined,
          customLeaderSubject: data.customLeaderSubject || undefined,
          customConvertSubject: data.customConvertSubject || undefined,
        }).catch(err => console.error("Email notification failed:", err));
      }

      res.status(201).json(checkin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create check-in" });
    }
  });

  // Admin update convert
  app.patch("/api/admin/converts/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const convert = await storage.getConvert(id);
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }

      const schema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        dateOfBirth: z.string().optional(),
        country: z.string().optional(),
        salvationDecision: z.enum(["I just made Jesus Christ my Lord and Savior", "I have rededicated my life to Jesus", ""]).optional(),
        wantsContact: z.enum(["Yes", "No", ""]).optional(),
        gender: z.enum(["Male", "Female", ""]).optional(),
        ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above", ""]).optional(),
        isChurchMember: z.enum(["Yes", "No", ""]).optional(),
        prayerRequest: z.string().optional(),
        summaryNotes: z.string().optional(),
        status: z.enum(["NEW", "SCHEDULED", "CONNECTED", "NOT_COMPLETED"]).optional(),
      });

      const data = schema.parse(req.body);
      const updatedConvert = await storage.updateConvert(id, data);
      res.json(updatedConvert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update convert" });
    }
  });

  // Export converts as CSV
  app.get("/api/admin/converts/export", requireAdmin, async (req, res) => {
    try {
      const { churchId, status, search } = req.query;

      let convertsList = await storage.getConverts();

      // Apply filters
      if (churchId && typeof churchId === "string") {
        convertsList = convertsList.filter((c) => c.churchId === churchId);
      }
      if (status && typeof status === "string") {
        convertsList = convertsList.filter((c) => c.status === status);
      }
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        convertsList = convertsList.filter(
          (c) =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchLower) ||
            c.phone?.includes(search) ||
            c.email?.toLowerCase().includes(searchLower)
        );
      }

      // Get church names for each convert
      const convertsWithChurch = await Promise.all(
        convertsList.map(async (c) => {
          const church = await storage.getChurch(c.churchId);
          return { ...c, churchName: church?.name || "" };
        })
      );

      // Build CSV with all fields
      const headers = [
        "First Name", "Last Name", "Phone", "Email", "Date of Birth", "Country",
        "Gender", "Age Group", "Salvation Decision", "Wants Contact", "Church Member",
        "Prayer Request", "Notes", "Status", "Church", "Self Submitted", "Created At"
      ];
      const rows = convertsWithChurch.map((c) => [
        c.firstName,
        c.lastName,
        c.phone || "",
        c.email || "",
        c.dateOfBirth || "",
        c.country || "",
        c.gender || "",
        c.ageGroup || "",
        c.salvationDecision || "",
        c.wantsContact || "",
        c.isChurchMember || "",
        c.prayerRequest || "",
        c.summaryNotes || "",
        c.status,
        c.churchName,
        c.selfSubmitted === "true" ? "Yes" : "No",
        new Date(c.createdAt).toISOString(),
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=converts.csv");
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to export converts" });
    }
  });

  // Export converts as Excel
  app.get("/api/admin/converts/export-excel", requireAdmin, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const { churchId, status, search } = req.query;

      let convertsList = await storage.getConverts();

      // Apply filters
      if (churchId && typeof churchId === "string") {
        convertsList = convertsList.filter((c) => c.churchId === churchId);
      }
      if (status && typeof status === "string") {
        convertsList = convertsList.filter((c) => c.status === status);
      }
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        convertsList = convertsList.filter(
          (c) =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchLower) ||
            c.phone?.includes(search) ||
            c.email?.toLowerCase().includes(searchLower)
        );
      }

      // Get church names for each convert
      const convertsWithChurch = await Promise.all(
        convertsList.map(async (c) => {
          const church = await storage.getChurch(c.churchId);
          return { ...c, churchName: church?.name || "" };
        })
      );

      const statusLabels = EXPORT_STATUS_LABELS;

      // Build data for Excel
      const data = convertsWithChurch.map((c) => ({
        "Category": "Convert",
        "First Name": c.firstName,
        "Last Name": c.lastName,
        "Phone": c.phone || "",
        "Email": c.email || "",
        "Date of Birth": c.dateOfBirth || "",
        "Country": c.country || "",
        "Gender": c.gender || "",
        "Age Group": c.ageGroup || "",
        "Salvation Decision": c.salvationDecision || "",
        "Wants Contact": c.wantsContact || "",
        "Church Member": c.isChurchMember || "",
        "Prayer Request": c.prayerRequest || "",
        "Notes": c.summaryNotes || "",
        "Status": statusLabels[c.status] || c.status,
        "Church": c.churchName,
        "Self Submitted": c.selfSubmitted === "true" ? "Yes" : "No",
        "Created At": new Date(c.createdAt).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Converts");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=converts.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export converts" });
    }
  });

  // Get prayer requests
  app.get("/api/admin/prayer-requests", requireAdmin, async (req, res) => {
    try {
      const requests = await storage.getPrayerRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get prayer requests" });
    }
  });

  // Get account requests
  app.get("/api/admin/account-requests", requireAdmin, async (req, res) => {
    try {
      const requests = await storage.getAccountRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get account requests" });
    }
  });

  // Approve account request
  app.post("/api/admin/account-requests/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;

      // Validate the edited data
      const editedData = insertAccountRequestSchema.parse(req.body);

      const request = await storage.getAccountRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Account request not found" });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({ message: "This request has already been processed" });
      }

      // Use edited data
      const finalFirstName = editedData.firstName;
      const finalLastName = editedData.lastName;
      const finalEmail = editedData.email;
      const finalChurchName = editedData.churchName;
      const finalPhone = editedData.phone;
      const finalReason = editedData.reason;

      // Check if email already taken (could have been created since request)
      const existingUser = await storage.getUserByEmail(finalEmail);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Persist edited fields to the account request record
      await storage.updateAccountRequest(id, {
        firstName: finalFirstName,
        lastName: finalLastName,
        email: finalEmail,
        phone: finalPhone,
        churchName: finalChurchName,
        reason: finalReason,
      });

      // Find or create the church
      const { church, created: churchCreated } = await storage.findOrCreateChurch(finalChurchName);

      // Check leader limit based on ministry plan
      const adminMaxLeaders = getMaxLeadersForPlan(church.plan);
      const adminCurrentLeaders = await storage.getLeadersByChurch(church.id);
      if (adminCurrentLeaders.length >= adminMaxLeaders) {
        return res.status(400).json({ 
          message: getLeaderLimitMessage(adminMaxLeaders, church.plan || 'foundations') 
        });
      }

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Create the leader account
      const newLeader = await storage.createUser({
        role: "LEADER",
        firstName: finalFirstName,
        lastName: finalLastName,
        email: finalEmail,
        passwordHash,
        churchId: church.id,
      });

      // Update request status
      await storage.updateAccountRequestStatus(id, "APPROVED", adminUser.id);

      // Log the action
      await storage.createAuditLog({
        actorUserId: adminUser.id,
        action: "APPROVE_ACCOUNT_REQUEST",
        entityType: "ACCOUNT_REQUEST",
        entityId: id,
      });

      await storage.createAuditLog({
        actorUserId: adminUser.id,
        action: "CREATE",
        entityType: "USER",
        entityId: newLeader.id,
      });

      // Log church creation only if it was new
      if (churchCreated) {
        await storage.createAuditLog({
          actorUserId: adminUser.id,
          action: "CREATE",
          entityType: "CHURCH",
          entityId: church.id,
        });
      }

      // Send approval email
      const emailResult = await sendAccountApprovalEmail({
        leaderName: `${finalFirstName} ${finalLastName}`,
        leaderEmail: finalEmail,
        churchName: church.name,
        temporaryPassword: tempPassword,
      });

      if (!emailResult.success) {
        console.error("Failed to send approval email:", emailResult.error);
        return res.json({ 
          message: "Account created but email notification failed. Please manually share the login credentials.",
          credentials: {
            email: finalEmail,
            temporaryPassword: tempPassword
          }
        });
      }

      res.json({ message: "Account request approved and leader account created" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      console.error("Failed to approve account request:", error);
      res.status(500).json({ message: "Failed to approve account request" });
    }
  });

  // Deny account request
  app.post("/api/admin/account-requests/:id/deny", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;

      const request = await storage.getAccountRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Account request not found" });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({ message: "This request has already been processed" });
      }

      // Update request status
      await storage.updateAccountRequestStatus(id, "DENIED", adminUser.id);

      // Log the action
      await storage.createAuditLog({
        actorUserId: adminUser.id,
        action: "DENY_ACCOUNT_REQUEST",
        entityType: "ACCOUNT_REQUEST",
        entityId: id,
      });

      // Send denial email
      await sendAccountDenialEmail({
        applicantName: `${request.firstName} ${request.lastName}`,
        applicantEmail: request.email,
      });

      res.json({ message: "Account request denied" });
    } catch (error) {
      console.error("Failed to deny account request:", error);
      res.status(500).json({ message: "Failed to deny account request" });
    }
  });

  // Get ministry requests
  app.get("/api/admin/ministry-requests", requireAdmin, async (req, res) => {
    try {
      const requests = await storage.getMinistryRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get ministry requests" });
    }
  });

  // Approve ministry request
  app.post("/api/admin/ministry-requests/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;

      // Validate the edited data
      const editedData = insertMinistryRequestSchema.parse(req.body);

      const request = await storage.getMinistryRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Ministry request not found" });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({ message: "This request has already been processed" });
      }

      // Use edited data
      const finalMinistryName = editedData.ministryName;
      const finalLocation = editedData.location;
      const finalAdminFirstName = editedData.adminFirstName;
      const finalAdminLastName = editedData.adminLastName;
      const finalAdminEmail = editedData.adminEmail;
      const finalAdminPhone = editedData.adminPhone;
      const finalDescription = editedData.description;
      const finalPlan = editedData.plan || request.plan || "foundations";

      // Check if admin email already taken (could have been created since request)
      const existingUser = await storage.getUserByEmail(finalAdminEmail);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Check if ministry name already taken
      const existingChurch = await storage.getChurchByName(finalMinistryName);
      if (existingChurch) {
        return res.status(400).json({ message: "A ministry with this name already exists" });
      }

      // Persist edited fields to the ministry request record
      await storage.updateMinistryRequest(id, {
        ministryName: finalMinistryName,
        location: finalLocation,
        adminFirstName: finalAdminFirstName,
        adminLastName: finalAdminLastName,
        adminEmail: finalAdminEmail,
        adminPhone: finalAdminPhone,
        description: finalDescription,
      });

      // Create the church/ministry
      const church = await storage.createChurch({
        name: finalMinistryName,
        location: finalLocation,
        plan: finalPlan as "foundations" | "formation" | "stewardship",
      });

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Create the ministry admin account
      const newMinistryAdmin = await storage.createUser({
        role: "MINISTRY_ADMIN",
        firstName: finalAdminFirstName,
        lastName: finalAdminLastName,
        email: finalAdminEmail,
        passwordHash,
        churchId: church.id,
      });

      // Update request status
      await storage.updateMinistryRequestStatus(id, "APPROVED", adminUser.id);

      // Log the actions
      await storage.createAuditLog({
        actorUserId: adminUser.id,
        action: "APPROVE_MINISTRY_REQUEST",
        entityType: "MINISTRY_REQUEST",
        entityId: id,
      });

      await storage.createAuditLog({
        actorUserId: adminUser.id,
        action: "CREATE",
        entityType: "CHURCH",
        entityId: church.id,
      });

      await storage.createAuditLog({
        actorUserId: adminUser.id,
        action: "CREATE",
        entityType: "USER",
        entityId: newMinistryAdmin.id,
      });

      // Send ministry admin approval email
      const emailResult = await sendMinistryAdminApprovalEmail({
        adminName: `${finalAdminFirstName} ${finalAdminLastName}`,
        adminEmail: finalAdminEmail,
        ministryName: church.name,
        temporaryPassword: tempPassword,
      });

      if (!emailResult.success) {
        console.error("Failed to send approval email:", emailResult.error);
        return res.json({ 
          message: "Ministry and admin account created but email notification failed. Please manually share the login credentials.",
          credentials: {
            email: finalAdminEmail,
            temporaryPassword: tempPassword
          }
        });
      }

      res.json({ message: "Ministry registration approved, ministry created, and admin account created" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      console.error("Failed to approve ministry request:", error);
      res.status(500).json({ message: "Failed to approve ministry request" });
    }
  });

  // Deny ministry request
  app.post("/api/admin/ministry-requests/:id/deny", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;

      const request = await storage.getMinistryRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Ministry request not found" });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({ message: "This request has already been processed" });
      }

      // Update request status
      await storage.updateMinistryRequestStatus(id, "DENIED", adminUser.id);

      // Log the action
      await storage.createAuditLog({
        actorUserId: adminUser.id,
        action: "DENY_MINISTRY_REQUEST",
        entityType: "MINISTRY_REQUEST",
        entityId: id,
      });

      // Send denial email
      await sendAccountDenialEmail({
        applicantName: `${request.adminFirstName} ${request.adminLastName}`,
        applicantEmail: request.adminEmail,
      });

      res.json({ message: "Ministry request denied" });
    } catch (error) {
      console.error("Failed to deny ministry request:", error);
      res.status(500).json({ message: "Failed to deny ministry request" });
    }
  });

  // ==================== MINISTRY ADMIN ROUTES ====================

  // Ministry Admin stats
  app.get("/api/ministry-admin/stats", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const stats = await storage.getMinistryAdminStats(user.churchId);
      // Add pending account requests count for this ministry
      const pendingRequests = await storage.getPendingAccountRequestsByChurch(user.churchId);
      res.json({
        ...stats,
        pendingAccountRequests: pendingRequests.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Shared reporting handlers for ministry-admin and leader
  async function handleReportsGrowth(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const data = await storage.getGrowthTrends(user.churchId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get growth trends" });
    }
  }

  async function handleReportsStatusBreakdown(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const data = await storage.getStatusBreakdown(user.churchId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get status breakdown" });
    }
  }

  async function handleReportsFollowUpStages(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const data = await storage.getFollowUpStageBreakdown(user.churchId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get follow-up stage breakdown" });
    }
  }

  async function handleReportsCheckinOutcomes(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const data = await storage.getCheckinOutcomes(user.churchId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get checkin outcomes" });
    }
  }

  app.get("/api/ministry-admin/reports/leader-performance", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const data = await storage.getLeaderPerformanceMetrics(user.churchId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get leader performance metrics" });
    }
  });

  app.get("/api/ministry-admin/reports/growth", requireMinistryAdmin, handleReportsGrowth);
  app.get("/api/ministry-admin/reports/status-breakdown", requireMinistryAdmin, handleReportsStatusBreakdown);
  app.get("/api/ministry-admin/reports/followup-stages", requireMinistryAdmin, handleReportsFollowUpStages);
  app.get("/api/ministry-admin/reports/checkin-outcomes", requireMinistryAdmin, handleReportsCheckinOutcomes);

  // Get account requests for ministry admin's ministry
  app.get("/api/ministry-admin/account-requests", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const requests = await storage.getAccountRequestsByChurch(user.churchId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get account requests" });
    }
  });

  // Approve account request (by ministry admin)
  app.post("/api/ministry-admin/account-requests/:id/approve", requireMinistryAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const ministryAdmin = (req as any).user;

      // Check leader limit based on ministry plan
      const maChurch = await storage.getChurch(ministryAdmin.churchId);
      const maxLeaders = getMaxLeadersForPlan(maChurch?.plan);
      const currentLeaders = await storage.getLeadersByChurch(ministryAdmin.churchId);
      if (currentLeaders.length >= maxLeaders) {
        return res.status(400).json({ 
          message: getLeaderLimitMessage(maxLeaders, maChurch?.plan || 'foundations') 
        });
      }

      // Validate the edited data
      const editedData = insertAccountRequestSchema.parse(req.body);

      const request = await storage.getAccountRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Account request not found" });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({ message: "This request has already been processed" });
      }

      // Verify this request is for the ministry admin's ministry
      if (request.churchId !== ministryAdmin.churchId) {
        return res.status(403).json({ message: "You can only approve requests for your ministry" });
      }

      // Use edited data
      const finalFirstName = editedData.firstName;
      const finalLastName = editedData.lastName;
      const finalEmail = editedData.email;
      const finalPhone = editedData.phone;
      const finalReason = editedData.reason;

      // Check if email already taken
      const existingUser = await storage.getUserByEmail(finalEmail);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Persist edited fields to the account request record
      await storage.updateAccountRequest(id, {
        firstName: finalFirstName,
        lastName: finalLastName,
        email: finalEmail,
        phone: finalPhone,
        reason: finalReason,
      });

      // Get the church (ministry admin's church)
      const church = await storage.getChurch(ministryAdmin.churchId);
      if (!church) {
        return res.status(500).json({ message: "Ministry not found" });
      }

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Create the leader account
      const newLeader = await storage.createUser({
        role: "LEADER",
        firstName: finalFirstName,
        lastName: finalLastName,
        email: finalEmail,
        passwordHash,
        churchId: ministryAdmin.churchId,
      });

      // Update request status
      await storage.updateAccountRequestStatus(id, "APPROVED", ministryAdmin.id);

      // Log the actions
      await storage.createAuditLog({
        actorUserId: ministryAdmin.id,
        action: "APPROVE_ACCOUNT_REQUEST",
        entityType: "ACCOUNT_REQUEST",
        entityId: id,
      });

      await storage.createAuditLog({
        actorUserId: ministryAdmin.id,
        action: "CREATE",
        entityType: "USER",
        entityId: newLeader.id,
      });

      // Send approval email
      const emailResult = await sendAccountApprovalEmail({
        leaderName: `${finalFirstName} ${finalLastName}`,
        leaderEmail: finalEmail,
        churchName: church.name,
        temporaryPassword: tempPassword,
      });

      if (!emailResult.success) {
        console.error("Failed to send approval email:", emailResult.error);
        return res.json({ 
          message: "Account created but email notification failed. Please manually share the login credentials.",
          credentials: {
            email: finalEmail,
            temporaryPassword: tempPassword
          }
        });
      }

      res.json({ message: "Account request approved and leader account created" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      console.error("Failed to approve account request:", error);
      res.status(500).json({ message: "Failed to approve account request" });
    }
  });

  // Deny account request (by ministry admin)
  app.post("/api/ministry-admin/account-requests/:id/deny", requireMinistryAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const ministryAdmin = (req as any).user;

      const request = await storage.getAccountRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Account request not found" });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({ message: "This request has already been processed" });
      }

      // Verify this request is for the ministry admin's ministry
      if (request.churchId !== ministryAdmin.churchId) {
        return res.status(403).json({ message: "You can only deny requests for your ministry" });
      }

      // Update request status
      await storage.updateAccountRequestStatus(id, "DENIED", ministryAdmin.id);

      // Log the action
      await storage.createAuditLog({
        actorUserId: ministryAdmin.id,
        action: "DENY_ACCOUNT_REQUEST",
        entityType: "ACCOUNT_REQUEST",
        entityId: id,
      });

      // Send denial email
      await sendAccountDenialEmail({
        applicantName: `${request.firstName} ${request.lastName}`,
        applicantEmail: request.email,
      });

      res.json({ message: "Account request denied" });
    } catch (error) {
      console.error("Failed to deny account request:", error);
      res.status(500).json({ message: "Failed to deny account request" });
    }
  });

  // Get subscription status for current ministry
  app.get("/api/ministry-admin/subscription", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      res.json({
        plan: church.plan,
        subscriptionStatus: church.subscriptionStatus,
        hasStripeSubscription: !!church.stripeSubscriptionId,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  // Create Stripe Customer Portal session for billing management
  app.post("/api/ministry-admin/billing/portal", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }

      if (!church.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found for this ministry. Free plan ministries do not have billing." });
      }

      const stripe = await getUncachableStripeClient();
      const returnUrl = buildUrl("/ministry-admin/billing");

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: church.stripeCustomerId,
        return_url: returnUrl,
      });

      res.json({ url: portalSession.url });
    } catch (error) {
      console.error("Failed to create billing portal session:", error);
      res.status(500).json({ message: "Failed to open billing portal" });
    }
  });

  // Get subscription status for leader view
  app.get("/api/leader/subscription", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      res.json({
        plan: church.plan,
        subscriptionStatus: church.subscriptionStatus,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  // Get SMS usage and limits for the current ministry
  app.get("/api/leader/sms-usage", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      const billingPeriod = getCurrentBillingPeriod();
      const usage = await storage.getSmsUsage(church.id, billingPeriod);
      const plan = (church.plan || "free") as string;
      const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
      res.json({
        billingPeriod,
        plan,
        smsUsed: usage.smsCount,
        mmsUsed: usage.mmsCount,
        smsLimit: limits.sms,
        mmsLimit: limits.mms,
        smsRemaining: Math.max(0, limits.sms - usage.smsCount),
        mmsRemaining: Math.max(0, limits.mms - usage.mmsCount),
      });
    } catch (error) {
      console.error("Failed to get SMS usage:", error);
      res.status(500).json({ message: "Failed to get SMS usage" });
    }
  });

  app.get("/api/ministry-admin/sms-usage", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      const billingPeriod = getCurrentBillingPeriod();
      const usage = await storage.getSmsUsage(church.id, billingPeriod);
      const plan = (church.plan || "free") as string;
      const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
      res.json({
        billingPeriod,
        plan,
        smsUsed: usage.smsCount,
        mmsUsed: usage.mmsCount,
        smsLimit: limits.sms,
        mmsLimit: limits.mms,
        smsRemaining: Math.max(0, limits.sms - usage.smsCount),
        mmsRemaining: Math.max(0, limits.mms - usage.mmsCount),
      });
    } catch (error) {
      console.error("Failed to get SMS usage:", error);
      res.status(500).json({ message: "Failed to get SMS usage" });
    }
  });

  // Get ministry info for ministry admin
  app.get("/api/ministry-admin/church", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      res.json(church);
    } catch (error) {
      res.status(500).json({ message: "Failed to get ministry info" });
    }
  });

  // Get leaders for ministry admin's ministry
  app.get("/api/ministry-admin/leaders", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const leaders = await storage.getLeadersByChurch(user.churchId);
      res.json(leaders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get leaders" });
    }
  });

  // Get leader quota info for ministry admin
  app.get("/api/ministry-admin/leader-quota", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      const maxLeaders = getMaxLeadersForPlan(church?.plan);
      const leaders = await storage.getLeadersByChurch(user.churchId);
      res.json({
        currentCount: leaders.length,
        maxAllowed: maxLeaders,
        remaining: Math.max(0, maxLeaders - leaders.length),
        canAddMore: leaders.length < maxLeaders,
        plan: church?.plan || "foundations",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get leader quota" });
    }
  });

  // Create a new leader (direct creation, no approval needed)
  app.post("/api/ministry-admin/leaders", requireMinistryAdmin, async (req, res) => {
    try {
      const ministryAdmin = (req as any).user;
      const maChurch = await storage.getChurch(ministryAdmin.churchId);
      const maxLeaders = getMaxLeadersForPlan(maChurch?.plan);

      // Check leader quota
      const existingLeaders = await storage.getLeadersByChurch(ministryAdmin.churchId);
      if (existingLeaders.length >= maxLeaders) {
        return res.status(400).json({ 
          message: getLeaderLimitMessage(maxLeaders, maChurch?.plan || 'foundations') 
        });
      }

      const schema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Please enter a valid email"),
        phone: z.string().optional(),
      });

      const data = schema.parse(req.body);

      // Check if email already taken
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Get the ministry info
      const church = await storage.getChurch(ministryAdmin.churchId);
      if (!church) {
        return res.status(500).json({ message: "Ministry not found" });
      }

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Create the leader account
      const newLeader = await storage.createUser({
        role: "LEADER",
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        churchId: ministryAdmin.churchId,
      });

      // Log the action
      await storage.createAuditLog({
        actorUserId: ministryAdmin.id,
        action: "CREATE",
        entityType: "USER",
        entityId: newLeader.id,
      });

      // Send welcome email with credentials
      const emailResult = await sendAccountApprovalEmail({
        leaderName: `${data.firstName} ${data.lastName}`,
        leaderEmail: data.email,
        churchName: church.name,
        temporaryPassword: tempPassword,
      });

      if (!emailResult.success) {
        console.error("Failed to send welcome email:", emailResult.error);
        return res.status(201).json({ 
          message: "Leader account created but email notification failed. Please manually share the login credentials.",
          credentials: {
            email: data.email,
            temporaryPassword: tempPassword
          }
        });
      }

      res.status(201).json({ message: "Leader account created and login credentials sent via email" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Failed to create leader:", error);
      res.status(500).json({ message: "Failed to create leader" });
    }
  });

  // Delete/remove a leader from the ministry
  app.delete("/api/ministry-admin/leaders/:id", requireMinistryAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const ministryAdmin = (req as any).user;

      // Get the leader
      const leader = await storage.getUser(id);
      if (!leader) {
        return res.status(404).json({ message: "Leader not found" });
      }

      // Verify the leader belongs to this ministry
      if (leader.churchId !== ministryAdmin.churchId) {
        return res.status(403).json({ message: "You can only remove leaders from your ministry" });
      }

      // Verify they are actually a leader
      if (leader.role !== "LEADER") {
        return res.status(400).json({ message: "This user is not a leader" });
      }

      // Delete the leader account
      await storage.deleteUser(id);

      // Log the action
      await storage.createAuditLog({
        actorUserId: ministryAdmin.id,
        action: "DELETE",
        entityType: "USER",
        entityId: id,
      });

      res.json({ message: "Leader removed successfully" });
    } catch (error) {
      console.error("Failed to remove leader:", error);
      res.status(500).json({ message: "Failed to remove leader" });
    }
  });

  // Export ministry admin's converts as Excel
  app.get("/api/ministry-admin/converts/export-excel", requireMinistryAdmin, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const user = (req as any).user;
      const { search } = req.query;

      let convertsList = await storage.getConvertsByChurch(user.churchId);

      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        convertsList = convertsList.filter(
          (c) =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchLower) ||
            c.phone?.includes(search) ||
            c.email?.toLowerCase().includes(searchLower)
        );
      }

      const statusLabels = EXPORT_STATUS_LABELS;

      const data = convertsList.map((c) => ({
        "Category": "Convert",
        "First Name": c.firstName,
        "Last Name": c.lastName,
        "Phone": c.phone || "",
        "Email": c.email || "",
        "Date of Birth": c.dateOfBirth || "",
        "Country": c.country || "",
        "Gender": c.gender || "",
        "Status": statusLabels[c.status] || c.status,
        "Self Submitted": c.selfSubmitted === "true" ? "Yes" : "No",
        "Created At": new Date(c.createdAt).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Converts");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=converts.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export converts" });
    }
  });

  // Export ministry admin's new members as Excel
  app.get("/api/ministry-admin/new-members/export-excel", requireMinistryAdmin, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const user = (req as any).user;
      const { search } = req.query;

      let newMembersList = await storage.getNewMembersByChurch(user.churchId);

      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        newMembersList = newMembersList.filter(
          (nm) =>
            `${nm.firstName} ${nm.lastName}`.toLowerCase().includes(searchLower) ||
            nm.phone?.includes(search) ||
            nm.email?.toLowerCase().includes(searchLower)
        );
      }

      const statusLabels = EXPORT_STATUS_LABELS;

      const data = newMembersList.map((nm) => ({
        "Category": "New Member",
        "First Name": nm.firstName,
        "Last Name": nm.lastName,
        "Phone": nm.phone || "",
        "Email": nm.email || "",
        "Date of Birth": nm.dateOfBirth || "",
        "Country": nm.country || "",
        "Gender": nm.gender || "",
        "Notes": nm.notes || "",
        "Status": statusLabels[nm.status] || nm.status,
        "Self Submitted": nm.selfSubmitted === "true" ? "Yes" : "No",
        "Created At": new Date(nm.createdAt).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "New Members");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=new-members.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export new members" });
    }
  });

  // Export ministry admin's members as Excel
  app.get("/api/ministry-admin/members/export-excel", requireMinistryAdmin, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const user = (req as any).user;
      const { search } = req.query;

      let membersList = await storage.getMembersByChurch(user.churchId);

      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        membersList = membersList.filter(
          (m) =>
            `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchLower) ||
            m.phone?.includes(search) ||
            m.email?.toLowerCase().includes(searchLower)
        );
      }

      const data = membersList.map((m) => ({
        "Category": "Member",
        "First Name": m.firstName,
        "Last Name": m.lastName,
        "Phone": m.phone || "",
        "Email": m.email || "",
        "Date of Birth": m.dateOfBirth || "",
        "Country": m.country || "",
        "Gender": m.gender || "",
        "Member Since": m.memberSince || "",
        "Notes": m.notes || "",
        "Self Submitted": m.selfSubmitted === "true" ? "Yes" : "No",
        "Created At": new Date(m.createdAt).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=members.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export members" });
    }
  });

  // Get converts for ministry admin's ministry
  app.get("/api/ministry-admin/converts", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const convertsList = await storage.getConvertsByChurch(user.churchId);
      const outcomeMap = await storage.getLastFollowupOutcomesForConverts(user.churchId);
      const convertsWithOutcome = convertsList.map(c => ({
        ...c,
        lastFollowupOutcome: outcomeMap.get(c.id) || null,
      }));
      res.json(convertsWithOutcome);
    } catch (error) {
      res.status(500).json({ message: "Failed to get converts" });
    }
  });

  // Get single convert with checkins for ministry admin
  app.get("/api/ministry-admin/converts/:id", requireMinistryAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const convert = await storage.getConvert(id);
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }

      if (convert.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const checkinsList = await storage.getCheckinsByConvert(id);
      const enrichedCheckins = await enrichCheckinsWithSchedulerName(checkinsList);

      res.json({ ...convert, checkins: enrichedCheckins });
    } catch (error) {
      res.status(500).json({ message: "Failed to get convert" });
    }
  });

  // Update convert for ministry admin
  app.patch("/api/ministry-admin/converts/:id", requireMinistryAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const convert = await storage.getConvert(id);
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }

      if (convert.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const schema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        summaryNotes: z.string().optional(),
        status: z.enum(["NEW", "SCHEDULED", "CONNECTED", "NOT_COMPLETED"]).optional(),
      });

      const data = schema.parse(req.body);

      const updated = await storage.updateConvert(id, data);

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "UPDATE",
        entityType: "CONVERT",
        entityId: id,
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update convert" });
    }
  });

  app.post("/api/ministry-admin/converts/:convertId/schedule-followup", requireMinistryAdmin, async (req, res) => {
    try {
      const { convertId } = req.params;
      const user = (req as any).user;

      const convert = await storage.getConvert(convertId);
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }

      if (convert.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const schema = z.object({
        nextFollowupDate: z.string().min(1),
        nextFollowupTime: z.string().optional(),
        customLeaderSubject: z.string().optional(),
        customLeaderMessage: z.string().optional(),
        customConvertSubject: z.string().optional(),
        customConvertMessage: z.string().optional(),
        smsMessage: z.string().optional(),
        mmsMediaUrl: z.string().optional(),
        includeVideoLink: z.boolean().optional(),
        notificationMethod: z.enum(["email", "sms", "mms"]).optional().default("email"),
      });

      const data = schema.parse(req.body);

      const church = await storage.getChurch(user.churchId);

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const plan = (church?.plan || "free") as string;
        const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
        const billingPeriod = getCurrentBillingPeriod();
        const usage = await storage.getSmsUsage(user.churchId, billingPeriod);
        const type = data.notificationMethod;
        const used = type === "sms" ? usage.smsCount : usage.mmsCount;
        const limit = type === "sms" ? limits.sms : limits.mms;
        if (used >= limit) {
          return res.status(403).json({ message: `${type.toUpperCase()} limit reached for this billing period (${used}/${limit}). Please upgrade your plan or use email.` });
        }
      }

      let videoCallLink: string | undefined;
      if (data.includeVideoLink) {
        videoCallLink = generatePersonalJitsiLink(church?.name || "zoweh", `${convert.firstName} ${convert.lastName}`);
      }

      const checkin = await storage.createCheckin({
        convertId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: new Date().toISOString().split('T')[0],
        notes: null,
        outcome: "SCHEDULED_VISIT",
        nextFollowupDate: data.nextFollowupDate,
        nextFollowupTime: data.nextFollowupTime || null,
        videoLink: videoCallLink || null,
        notificationMethod: data.notificationMethod,
      });

      await storage.updateConvert(convertId, { status: "SCHEDULED" });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "CHECKIN",
        entityId: checkin.id,
      });

      const contactUrl = buildUrl("/contact", req);

      console.log(`Sending follow-up emails to leader: ${user.email}, convert: ${convert.email || 'N/A'}`);
      sendFollowUpNotification({
        convertName: `${convert.firstName} ${convert.lastName}`,
        convertEmail: convert.email || undefined,
        leaderName: `${user.firstName} ${user.lastName}`,
        leaderEmail: user.email,
        churchName: church?.name || "Ministry",
        followUpDate: data.nextFollowupDate,
        followUpTime: data.nextFollowupTime || undefined,
        notes: data.notes || undefined,
        videoCallLink,
        contactUrl,
        customLeaderMessage: data.customLeaderMessage || undefined,
        customConvertMessage: data.customConvertMessage || undefined,
        customLeaderSubject: data.customLeaderSubject || undefined,
        customConvertSubject: data.customConvertSubject || undefined,
      }).then(result => {
        console.log(`Follow-up email result:`, result);
      }).catch(err => console.error("Email notification failed:", err));

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const smsType = data.notificationMethod as "sms" | "mms";
        const billingPeriod = getCurrentBillingPeriod();
        const recipientPhone = convert.phone ? formatPhoneForSms(convert.phone) : null;
        const churchName = church?.name || "Ministry";

        if (recipientPhone) {
          const msg = buildFollowUpSmsMessage({
            recipientName: convert.firstName,
            churchName,
            followUpDate: data.nextFollowupDate,
            followUpTime: data.nextFollowupTime,
            videoCallLink,
            customMessage: data.smsMessage,
          });

          if (smsType === "sms") {
            sendSms({ to: recipientPhone, body: msg }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "sms");
                console.log(`SMS sent to convert ${convert.firstName}: ${result.messageId}`);
              } else {
                console.error(`SMS failed for convert:`, result.error);
              }
            }).catch(err => console.error(`SMS send error:`, err));
          } else {
            sendMms({ to: recipientPhone, body: msg, mediaUrl: data.mmsMediaUrl }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "mms");
                console.log(`MMS sent to convert ${convert.firstName}: ${result.messageId}`);
              } else {
                console.error(`MMS failed for convert:`, result.error);
              }
            }).catch(err => console.error(`MMS send error:`, err));
          }
        }
      }

      res.status(201).json({ ...checkin, videoCallLink });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error scheduling follow-up:", error);
      res.status(500).json({ message: "Failed to schedule follow-up" });
    }
  });

  app.post("/api/ministry-admin/converts/:convertId/checkins", requireMinistryAdmin, async (req, res) => {
    try {
      const { convertId } = req.params;
      const user = (req as any).user;

      const convert = await storage.getConvert(convertId);
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }

      if (convert.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const schema = z.object({
        checkinDate: z.string().min(1),
        notes: z.string().optional(),
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
        nextFollowupDate: z.string().optional(),
        customLeaderMessage: z.string().optional(),
        customConvertMessage: z.string().optional(),
        customLeaderSubject: z.string().optional(),
        customConvertSubject: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const checkin = await storage.createCheckin({
        convertId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: data.checkinDate,
        notes: data.notes || null,
        outcome: data.outcome,
        nextFollowupDate: data.nextFollowupDate || null,
      });

      const outcomeToStatus = OUTCOME_TO_STATUS;
      if (outcomeToStatus[data.outcome]) {
        await storage.updateConvert(convertId, { status: outcomeToStatus[data.outcome] as any });
      }

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "CHECKIN",
        entityId: checkin.id,
      });

      if (data.nextFollowupDate) {
        const church = await storage.getChurch(user.churchId);
        const contactUrl = buildUrl("/contact", req);
        
        sendFollowUpNotification({
          convertName: `${convert.firstName} ${convert.lastName}`,
          convertEmail: convert.email || undefined,
          leaderName: `${user.firstName} ${user.lastName}`,
          leaderEmail: user.email,
          churchName: church?.name || "Ministry",
          followUpDate: data.nextFollowupDate,
          notes: data.notes || undefined,
          contactUrl,
          customLeaderMessage: data.customLeaderMessage || undefined,
          customConvertMessage: data.customConvertMessage || undefined,
          customLeaderSubject: data.customLeaderSubject || undefined,
          customConvertSubject: data.customConvertSubject || undefined,
        }).catch(err => console.error("Email notification failed:", err));
      }

      res.status(201).json(checkin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create checkin" });
    }
  });

  // Update church logo - Ministry Admin
  app.patch("/api/ministry-admin/church/logo", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const { logoUrl } = req.body;

      if (typeof logoUrl !== "string") {
        return res.status(400).json({ message: "Invalid logo URL" });
      }

      await storage.updateChurchLogo(user.churchId, logoUrl);
      res.json({ message: "Logo updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update logo" });
    }
  });

  // Cancel (archive) ministry account - Ministry Admin
  app.delete("/api/ministry-admin/church/cancel", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }

      const archived = await storage.archiveMinistry(user.churchId, user.id, "MINISTRY_ADMIN");

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "SELF_ARCHIVE",
        entityType: "CHURCH",
        entityId: user.churchId,
      });

      res.json({ message: "Ministry account cancelled and backed up successfully", archived });
    } catch (error) {
      console.error("Failed to cancel ministry:", error);
      res.status(500).json({ message: "Failed to cancel ministry account" });
    }
  });

  // Get new members for ministry admin's ministry
  app.get("/api/ministry-admin/new-members", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const newMembersList = await storage.getNewMembersByChurch(user.churchId);
      const outcomeMap = await storage.getLastFollowupOutcomesForNewMembers(user.churchId);
      const newMembersWithOutcome = newMembersList.map(nm => ({
        ...nm,
        lastFollowupOutcome: outcomeMap.get(nm.id) || null,
      }));
      res.json(newMembersWithOutcome);
    } catch (error) {
      res.status(500).json({ message: "Failed to get new members" });
    }
  });

  // Get members for ministry admin's ministry
  app.get("/api/ministry-admin/members", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const membersList = await storage.getMembersByChurch(user.churchId);
      const outcomeMap = await storage.getLastFollowupOutcomesForMembers(user.churchId);
      const membersWithOutcome = membersList.map(m => ({
        ...m,
        lastFollowupOutcome: outcomeMap.get(m.id) || null,
      }));
      res.json(membersWithOutcome);
    } catch (error) {
      res.status(500).json({ message: "Failed to get members" });
    }
  });

  app.get("/api/ministry-admin/new-members/:id/checkins", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const newMember = await storage.getNewMember(req.params.id);
      if (!newMember || newMember.churchId !== user.churchId) {
        return res.status(404).json({ message: "New member not found" });
      }
      const checkins = await storage.getNewMemberCheckinsByNewMember(req.params.id);
      const enrichedCheckins = await enrichCheckinsWithSchedulerName(checkins);
      res.json(enrichedCheckins);
    } catch (error) {
      res.status(500).json({ message: "Failed to get check-ins" });
    }
  });

  app.post("/api/ministry-admin/new-members/:newMemberId/checkins", requireMinistryAdmin, async (req, res) => {
    try {
      const { newMemberId } = req.params;
      const user = (req as any).user;
      
      const newMember = await storage.getNewMember(newMemberId);
      if (!newMember) {
        return res.status(404).json({ message: "New member not found" });
      }
      
      if (newMember.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const schema = z.object({
        checkinDate: z.string().min(1),
        notes: z.string().optional(),
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
        nextFollowupDate: z.string().optional(),
        customLeaderMessage: z.string().optional(),
        customConvertMessage: z.string().optional(),
        customLeaderSubject: z.string().optional(),
        customConvertSubject: z.string().optional(),
      });
      
      const data = schema.parse(req.body);
      
      const checkin = await storage.createNewMemberCheckin({
        newMemberId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: data.checkinDate,
        notes: data.notes || null,
        outcome: data.outcome,
        nextFollowupDate: data.nextFollowupDate || null,
      });
      
      const outcomeToStatus = OUTCOME_TO_STATUS;
      if (outcomeToStatus[data.outcome]) {
        await storage.updateNewMember(newMemberId, { status: outcomeToStatus[data.outcome] as any });
      }
      
      let promptMoveToList = false;
      if (data.outcome === "CONNECTED") {
        const currentStage = newMember.followUpStage || "NEW";
        let newFollowUpStage = currentStage;
        
        if (currentStage === "SCHEDULED" || currentStage === "NEW" || currentStage === "CONTACT_NEW_MEMBER") {
          newFollowUpStage = "FIRST_COMPLETED";
        } else if (currentStage === "SECOND_SCHEDULED" || currentStage === "INITIATE_SECOND") {
          newFollowUpStage = "SECOND_COMPLETED";
        } else if (currentStage === "FINAL_SCHEDULED" || currentStage === "INITIATE_FINAL") {
          newFollowUpStage = "FINAL_COMPLETED";
          promptMoveToList = true;
        }
        
        if (newFollowUpStage !== currentStage) {
          await storage.updateNewMemberFollowUpStage(newMemberId, newFollowUpStage, new Date());
        }
      }
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "NEW_MEMBER_CHECKIN",
        entityId: checkin.id,
      });
      
      if (data.nextFollowupDate) {
        const church = await storage.getChurch(user.churchId);
        const contactUrl = buildUrl("/contact", req);
        
        sendFollowUpNotification({
          convertName: `${newMember.firstName} ${newMember.lastName}`,
          convertEmail: newMember.email || undefined,
          leaderName: `${user.firstName} ${user.lastName}`,
          leaderEmail: user.email,
          churchName: church?.name || "Ministry",
          followUpDate: data.nextFollowupDate,
          notes: data.notes || undefined,
          contactUrl,
          customLeaderMessage: data.customLeaderMessage || undefined,
          customConvertMessage: data.customConvertMessage || undefined,
          customLeaderSubject: data.customLeaderSubject || undefined,
          customConvertSubject: data.customConvertSubject || undefined,
        }).catch(err => console.error("Email notification failed:", err));
      }
      
      res.status(201).json({ ...checkin, promptMoveToList });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating new member checkin:", error);
      res.status(500).json({ message: "Failed to create checkin" });
    }
  });

  app.post("/api/ministry-admin/new-members/:newMemberId/schedule-followup", requireMinistryAdmin, async (req, res) => {
    try {
      const { newMemberId } = req.params;
      const user = (req as any).user;
      
      const newMember = await storage.getNewMember(newMemberId);
      if (!newMember) {
        return res.status(404).json({ message: "New member not found" });
      }
      
      if (newMember.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const schema = z.object({
        nextFollowupDate: z.string().min(1, "Follow-up date is required"),
        nextFollowupTime: z.string().optional(),
        includeVideoLink: z.boolean().optional(),
        customConvertMessage: z.string().optional(),
        customConvertSubject: z.string().optional(),
        customReminderSubject: z.string().optional(),
        customReminderMessage: z.string().optional(),
        smsMessage: z.string().optional(),
        mmsMediaUrl: z.string().optional(),
        notificationMethod: z.enum(["email", "sms", "mms"]).optional().default("email"),
      });
      
      const data = schema.parse(req.body);
      const church = await storage.getChurch(user.churchId);

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const plan = (church?.plan || "free") as string;
        const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
        const billingPeriod = getCurrentBillingPeriod();
        const usage = await storage.getSmsUsage(user.churchId, billingPeriod);
        const type = data.notificationMethod;
        const used = type === "sms" ? usage.smsCount : usage.mmsCount;
        const limit = type === "sms" ? limits.sms : limits.mms;
        if (used >= limit) {
          return res.status(403).json({ message: `${type.toUpperCase()} limit reached for this billing period (${used}/${limit}). Please upgrade your plan or use email.` });
        }
      }
      
      let videoLink: string | undefined;
      if (data.includeVideoLink) {
        videoLink = generatePersonalJitsiLink(church?.name || "ministry", `${newMember.firstName} ${newMember.lastName}`);
      }
      
      const checkin = await storage.createNewMemberCheckin({
        newMemberId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: new Date().toISOString().split("T")[0],
        notes: null,
        outcome: "SCHEDULED_VISIT",
        nextFollowupDate: data.nextFollowupDate,
        nextFollowupTime: data.nextFollowupTime || null,
        videoLink: videoLink || null,
        customReminderSubject: data.customReminderSubject || null,
        customReminderMessage: data.customReminderMessage || null,
        notificationMethod: data.notificationMethod,
      });
      
      await storage.updateNewMember(newMemberId, { status: "SCHEDULED" });
      
      const currentStage = newMember.followUpStage || "NEW";
      let newFollowUpStage = currentStage;
      
      if (currentStage === "NEW" || currentStage === "CONTACT_NEW_MEMBER") {
        newFollowUpStage = "SCHEDULED";
      } else if (currentStage === "INITIATE_SECOND") {
        newFollowUpStage = "SECOND_SCHEDULED";
      } else if (currentStage === "INITIATE_FINAL") {
        newFollowUpStage = "FINAL_SCHEDULED";
      }
      
      if (newFollowUpStage !== currentStage) {
        await storage.updateNewMemberFollowUpStage(newMemberId, newFollowUpStage);
      }
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "SCHEDULE_FOLLOWUP",
        entityType: "NEW_MEMBER",
        entityId: newMemberId,
      });
      
      const contactUrl = buildUrl("/contact", req);
      
      sendFollowUpNotification({
        convertName: `${newMember.firstName} ${newMember.lastName}`,
        convertEmail: newMember.email || undefined,
        leaderName: `${user.firstName} ${user.lastName}`,
        leaderEmail: user.email,
        churchName: church?.name || "Ministry",
        followUpDate: data.nextFollowupDate,
        followUpTime: data.nextFollowupTime || undefined,
        notes: undefined,
        videoCallLink: videoLink,
        contactUrl,
        customConvertMessage: data.customConvertMessage || undefined,
        customConvertSubject: data.customConvertSubject || undefined,
      }).catch(err => console.error("Email notification failed:", err));

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const smsType = data.notificationMethod as "sms" | "mms";
        const billingPeriod = getCurrentBillingPeriod();
        const recipientPhone = newMember.phone ? formatPhoneForSms(newMember.phone) : null;
        const churchName = church?.name || "Ministry";

        if (recipientPhone) {
          const msg = buildFollowUpSmsMessage({
            recipientName: newMember.firstName,
            churchName,
            followUpDate: data.nextFollowupDate,
            followUpTime: data.nextFollowupTime,
            videoCallLink: videoLink,
            customMessage: data.smsMessage,
          });
          if (smsType === "sms") {
            sendSms({ to: recipientPhone, body: msg }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "sms");
              } else {
                console.error(`SMS failed for new member:`, result.error);
              }
            }).catch(err => console.error(`SMS send error:`, err));
          } else {
            sendMms({ to: recipientPhone, body: msg, mediaUrl: data.mmsMediaUrl }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "mms");
              } else {
                console.error(`MMS failed for new member:`, result.error);
              }
            }).catch(err => console.error(`MMS send error:`, err));
          }
        }
      }
      
      res.status(201).json(checkin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error scheduling follow-up:", error);
      res.status(500).json({ message: "Failed to schedule follow-up" });
    }
  });

  app.get("/api/ministry-admin/new-members/:id", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const newMember = await storage.getNewMember(req.params.id);
      if (!newMember || newMember.churchId !== user.churchId) {
        return res.status(404).json({ message: "New member not found" });
      }
      const checkinsList = await storage.getNewMemberCheckinsByNewMember(req.params.id);
      const enrichedCheckins = await enrichCheckinsWithSchedulerName(checkinsList);
      res.json({ ...newMember, checkins: enrichedCheckins });
    } catch (error) {
      res.status(500).json({ message: "Failed to get new member" });
    }
  });

  app.get("/api/ministry-admin/members/:id/checkins", requireMinistryAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      if (member.churchId !== user.churchId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const checkins = await storage.getMemberCheckins(id);
      const enrichedCheckins = await enrichCheckinsWithSchedulerName(checkins);
      res.json(enrichedCheckins);
    } catch (error) {
      console.error("Error fetching member checkins:", error);
      res.status(500).json({ message: "Failed to fetch checkins" });
    }
  });

  app.get("/api/ministry-admin/members/:id", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const member = await storage.getMember(req.params.id);
      if (!member || member.churchId !== user.churchId) {
        return res.status(404).json({ message: "Member not found" });
      }
      const checkinsList = await storage.getMemberCheckins(req.params.id);
      const enrichedCheckins = await enrichCheckinsWithSchedulerName(checkinsList);
      res.json({ ...member, checkins: enrichedCheckins });
    } catch (error) {
      res.status(500).json({ message: "Failed to get member" });
    }
  });

  app.post("/api/ministry-admin/members/:memberId/checkins", requireMinistryAdmin, async (req, res) => {
    try {
      const { memberId } = req.params;
      const user = (req as any).user;
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      if (member.churchId !== user.churchId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const schema = z.object({
        notes: z.string().optional(),
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "NOT_COMPLETED", "OTHER"]),
        nextFollowupDate: z.string().optional().nullable(),
        videoLink: z.string().optional().nullable(),
      });
      const data = schema.parse(req.body);
      const checkin = await storage.createMemberCheckin({
        memberId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: new Date().toISOString().split("T")[0],
        notes: data.notes || null,
        outcome: data.outcome,
        nextFollowupDate: data.nextFollowupDate || null,
        videoLink: data.videoLink || null,
      });
      const statusMap = OUTCOME_TO_STATUS;
      if (statusMap[data.outcome]) {
        await storage.updateMember(memberId, { status: statusMap[data.outcome] });
      }
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "MEMBER_CHECKIN",
        entityId: checkin.id,
      });
      res.status(201).json(checkin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating member checkin:", error);
      res.status(500).json({ message: "Failed to create checkin" });
    }
  });

  app.post("/api/ministry-admin/members/:memberId/schedule-followup", requireMinistryAdmin, async (req, res) => {
    try {
      const { memberId } = req.params;
      const user = (req as any).user;
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      if (member.churchId !== user.churchId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const schema = z.object({
        nextFollowupDate: z.string().min(1, "Follow-up date is required"),
        nextFollowupTime: z.string().optional(),
        notes: z.string().optional(),
        includeVideoLink: z.boolean().optional(),
        customLeaderMessage: z.string().optional(),
        customConvertMessage: z.string().optional(),
        customLeaderSubject: z.string().optional(),
        customConvertSubject: z.string().optional(),
        smsMessage: z.string().optional(),
        mmsMediaUrl: z.string().optional(),
        notificationMethod: z.enum(["email", "sms", "mms"]).optional().default("email"),
      });
      const data = schema.parse(req.body);
      const church = await storage.getChurch(user.churchId);

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const plan = (church?.plan || "free") as string;
        const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
        const billingPeriod = getCurrentBillingPeriod();
        const usage = await storage.getSmsUsage(user.churchId, billingPeriod);
        const type = data.notificationMethod;
        const used = type === "sms" ? usage.smsCount : usage.mmsCount;
        const limit = type === "sms" ? limits.sms : limits.mms;
        if (used >= limit) {
          return res.status(403).json({ message: `${type.toUpperCase()} limit reached for this billing period (${used}/${limit}). Please upgrade your plan or use email.` });
        }
      }

      let videoLink: string | undefined;
      if (data.includeVideoLink) {
        videoLink = generatePersonalJitsiLink(church?.name || "ministry", `${member.firstName} ${member.lastName}`);
      }
      const checkin = await storage.createMemberCheckin({
        memberId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: new Date().toISOString().split("T")[0],
        notes: data.notes || null,
        outcome: "SCHEDULED_VISIT",
        nextFollowupDate: data.nextFollowupDate,
        nextFollowupTime: data.nextFollowupTime || null,
        videoLink: videoLink || null,
        notificationMethod: data.notificationMethod,
      });
      await storage.updateMember(memberId, { status: "SCHEDULED" });
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "SCHEDULE_FOLLOWUP",
        entityType: "MEMBER",
        entityId: memberId,
      });
      const contactUrl = buildUrl("/contact", req);
      sendFollowUpNotification({
        convertName: `${member.firstName} ${member.lastName}`,
        convertEmail: member.email || undefined,
        leaderName: `${user.firstName} ${user.lastName}`,
        leaderEmail: user.email,
        churchName: church?.name || "Ministry",
        followUpDate: data.nextFollowupDate,
        followUpTime: data.nextFollowupTime || undefined,
        notes: data.notes || undefined,
        videoCallLink: videoLink,
        contactUrl,
        customLeaderMessage: data.customLeaderMessage || undefined,
        customConvertMessage: data.customConvertMessage || undefined,
        customLeaderSubject: data.customLeaderSubject || undefined,
        customConvertSubject: data.customConvertSubject || undefined,
      }).catch(err => console.error("Email notification failed:", err));

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const smsType = data.notificationMethod as "sms" | "mms";
        const billingPeriod = getCurrentBillingPeriod();
        const recipientPhone = member.phone ? formatPhoneForSms(member.phone) : null;
        const churchName = church?.name || "Ministry";
        if (recipientPhone) {
          const msg = buildFollowUpSmsMessage({
            recipientName: member.firstName,
            churchName,
            followUpDate: data.nextFollowupDate,
            followUpTime: data.nextFollowupTime,
            videoCallLink: videoLink,
            customMessage: data.smsMessage,
          });
          if (smsType === "sms") {
            sendSms({ to: recipientPhone, body: msg }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "sms");
              }
            }).catch(err => console.error("SMS failed:", err));
          } else {
            sendMms({ to: recipientPhone, body: msg, mediaUrl: data.mmsMediaUrl }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "mms");
              }
            }).catch(err => console.error("MMS failed:", err));
          }
        }
      }

      res.json(checkin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error scheduling member follow-up:", error);
      res.status(500).json({ message: "Failed to schedule follow-up" });
    }
  });

  // Get followups for ministry admin's ministry
  app.get("/api/ministry-admin/followups", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const followups = await storage.getUpcomingFollowups(user.churchId);
      res.json(followups);
    } catch (error) {
      res.status(500).json({ message: "Failed to get followups" });
    }
  });

  app.get("/api/ministry-admin/new-member-followups", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const followups = await storage.getNewMemberFollowupsDue(user.churchId);
      res.json(followups);
    } catch (error) {
      console.error("Error fetching new member followups:", error);
      res.status(500).json({ message: "Failed to fetch followups" });
    }
  });

  app.get("/api/ministry-admin/member-followups", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const followups = await storage.getMemberFollowupsDue(user.churchId);
      res.json(followups);
    } catch (error) {
      console.error("Error fetching member followups:", error);
      res.status(500).json({ message: "Failed to fetch followups" });
    }
  });

  app.get("/api/ministry-admin/followups/export-excel", requireMinistryAdmin, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const user = (req as any).user;

      const convertFollowups = await storage.getUpcomingFollowups(user.churchId);
      const newMemberFollowups = await storage.getNewMemberFollowupsDue(user.churchId);
      const memberFollowups = await storage.getMemberFollowupsDue(user.churchId);

      const data = [
        ...convertFollowups.map((f) => ({
          "Category": "Convert",
          "Name": `${f.convertFirstName} ${f.convertLastName}`,
          "Phone": f.convertPhone || "",
          "Email": f.convertEmail || "",
          "Follow-up Date": f.nextFollowupDate || "",
          "Follow-up Time": f.nextFollowupTime || "",
          "Video Link": f.videoLink || "",
          "Notes": f.notes && !f.notes.startsWith("Follow-up scheduled for") && !f.notes.startsWith("Mass follow-up scheduled for") ? f.notes : "",
        })),
        ...newMemberFollowups.map((f) => ({
          "Category": "New Member",
          "Name": `${f.newMemberFirstName} ${f.newMemberLastName}`,
          "Phone": f.newMemberPhone || "",
          "Email": f.newMemberEmail || "",
          "Follow-up Date": f.nextFollowupDate || "",
          "Follow-up Time": f.nextFollowupTime || "",
          "Video Link": f.videoLink || "",
          "Notes": f.notes && !f.notes.startsWith("Follow-up scheduled for") && !f.notes.startsWith("Mass follow-up scheduled for") ? f.notes : "",
        })),
        ...memberFollowups.map((f) => ({
          "Category": "Member",
          "Name": `${f.memberFirstName} ${f.memberLastName}`,
          "Phone": f.memberPhone || "",
          "Email": f.memberEmail || "",
          "Follow-up Date": f.nextFollowupDate || "",
          "Follow-up Time": f.nextFollowupTime || "",
          "Video Link": f.videoLink || "",
          "Notes": f.notes && !f.notes.startsWith("Follow-up scheduled for") && !f.notes.startsWith("Mass follow-up scheduled for") ? f.notes : "",
        })),
      ];

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Follow-ups");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=followups.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export follow-ups" });
    }
  });

  // Form Configurations - Ministry Admin
  app.get("/api/ministry-admin/form-configurations", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const configs = await storage.getFormConfigurations(user.churchId);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching form configurations:", error);
      res.status(500).json({ message: "Failed to fetch form configurations" });
    }
  });

  app.get("/api/ministry-admin/form-configurations/:formType", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const { formType } = req.params;
      if (!["convert", "new_member", "member"].includes(formType)) {
        return res.status(400).json({ message: "Invalid form type" });
      }
      const config = await storage.getFormConfiguration(user.churchId, formType as any);
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching form configuration:", error);
      res.status(500).json({ message: "Failed to fetch form configuration" });
    }
  });

  app.put("/api/ministry-admin/form-configurations/:formType", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const { formType } = req.params;
      if (!["convert", "new_member", "member"].includes(formType)) {
        return res.status(400).json({ message: "Invalid form type" });
      }
      const data = formConfigUpdateSchema.parse(req.body);
      const config = await storage.upsertFormConfiguration(user.churchId, formType as any, data);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating form configuration:", error);
      res.status(500).json({ message: "Failed to update form configuration" });
    }
  });

  // Ministry Admin Group Follow-Up (delegates to the same logic as leader)
  app.post("/api/ministry-admin/mass-followup/candidates", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const schema = z.object({
        category: z.enum(["converts", "new_members", "members"]),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      });
      const data = schema.parse(req.body);

      let people: any[] = [];
      if (data.category === "converts") {
        people = await storage.getConvertsByChurch(user.churchId);
      } else if (data.category === "new_members") {
        people = await storage.getNewMembersByChurch(user.churchId);
      } else if (data.category === "members") {
        people = await storage.getMembersByChurch(user.churchId);
      }

      if (data.dateFrom || data.dateTo) {
        people = people.filter((p: any) => {
          let dateField: string | null = null;
          if (data.category === "members" && p.memberSince) {
            dateField = p.memberSince;
          } else if (p.createdAt) {
            dateField = typeof p.createdAt === "string" ? p.createdAt : new Date(p.createdAt).toISOString().split("T")[0];
          }
          if (!dateField) return true;
          const d = dateField.split("T")[0];
          if (data.dateFrom && d < data.dateFrom) return false;
          if (data.dateTo && d > data.dateTo) return false;
          return true;
        });
      }

      const candidates = people.map((p: any) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email || null,
        phone: p.phone || null,
        date: data.category === "members" ? (p.memberSince || p.createdAt) : p.createdAt,
      }));

      res.json(candidates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.post("/api/ministry-admin/mass-followup", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const schema = z.object({
        category: z.enum(["converts", "new_members", "members"]),
        personIds: z.array(z.string()).min(1, "Select at least one person"),
        nextFollowupDate: z.string().min(1, "Follow-up date is required"),
        nextFollowupTime: z.string().optional(),
        includeVideoLink: z.boolean().optional(),
        customSubject: z.string().optional(),
        customMessage: z.string().optional(),
      });
      const data = schema.parse(req.body);

      const church = await storage.getChurch(user.churchId);
      const churchName = church?.name || "Ministry";
      const leaderName = `${user.firstName} ${user.lastName}`;
      const contactUrl = buildUrl("/contact", req);
      const massFollowup = await storage.createMassFollowup({
        churchId: user.churchId,
        createdByUserId: user.id,
        category: data.category,
        scheduledDate: data.nextFollowupDate,
        scheduledTime: data.nextFollowupTime || null,
        notes: null,
        status: "SCHEDULED",
        customSubject: data.customSubject || null,
        customMessage: data.customMessage || null,
        videoLink: data.includeVideoLink ? generateMassJitsiLink(churchName) : null,
      });

      const results: { personId: string; name: string; success: boolean; error?: string }[] = [];

      for (const personId of data.personIds) {
        try {
          let person: any = null;
          if (data.category === "converts") {
            person = await storage.getConvert(personId);
          } else if (data.category === "new_members") {
            person = await storage.getNewMember(personId);
          } else if (data.category === "members") {
            person = await storage.getMember(personId);
          }

          if (!person || person.churchId !== user.churchId) {
            results.push({ personId, name: "Unknown", success: false, error: "Not found or access denied" });
            continue;
          }

          const personName = `${person.firstName} ${person.lastName}`;
          let videoLink: string | undefined;
          if (data.includeVideoLink) {
            videoLink = generatePersonalJitsiLink(churchName, personName);
          }

          await storage.createMassFollowupParticipant({
            massFollowupId: massFollowup.id,
            personCategory: data.category,
            convertId: data.category === "converts" ? personId : null,
            newMemberId: data.category === "new_members" ? personId : null,
            memberId: data.category === "members" ? personId : null,
            guestId: null,
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email || null,
            attended: "false",
            videoLink: videoLink || null,
          });

          if (data.category === "converts") {
            await storage.updateConvert(personId, { status: "SCHEDULED" });
          } else if (data.category === "new_members") {
            await storage.updateNewMember(personId, { status: "SCHEDULED" });
          }

          if (person.email) {
            sendFollowUpNotification({
              convertName: personName,
              convertEmail: person.email,
              leaderName,
              leaderEmail: user.email,
              churchName,
              followUpDate: data.nextFollowupDate,
              followUpTime: data.nextFollowupTime || undefined,
              videoCallLink: videoLink,
              contactUrl,
              customConvertSubject: data.customSubject || undefined,
              customConvertMessage: data.customMessage || undefined,
              category: data.category,
            }).catch(err => console.error(`Email failed for ${personName}:`, err));
          }

          results.push({ personId, name: personName, success: true });
        } catch (err: any) {
          results.push({ personId, name: "Unknown", success: false, error: err.message });
        }
      }

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "MASS_SCHEDULE_FOLLOWUP",
        entityType: data.category.toUpperCase(),
        entityId: data.personIds.join(","),
      });

      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        message: `Follow-ups scheduled for ${succeeded} ${succeeded === 1 ? "person" : "people"}${failed > 0 ? `, ${failed} failed` : ""}`,
        results,
        succeeded,
        failed,
        massFollowupId: massFollowup.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to schedule group follow-ups" });
    }
  });

  app.get("/api/ministry-admin/mass-followups", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const massFollowups = await storage.getMassFollowupsByChurch(user.churchId);
      const userIds = [...new Set(massFollowups.map(mf => mf.createdByUserId).filter(Boolean))];
      const userMap = new Map<string, string>();
      for (const uid of userIds) {
        const u = await storage.getUser(uid);
        if (u) userMap.set(uid, `${u.firstName} ${u.lastName}`);
      }
      const enriched = massFollowups.map(mf => ({
        ...mf,
        scheduledByName: userMap.get(mf.createdByUserId) || null,
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group follow-ups" });
    }
  });

  app.get("/api/ministry-admin/mass-followups/:id", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const massFollowup = await storage.getMassFollowup(req.params.id);
      if (!massFollowup || massFollowup.churchId !== user.churchId) {
        return res.status(404).json({ message: "Group follow-up not found" });
      }
      const participants = await storage.getMassFollowupParticipants(massFollowup.id);
      res.json({ ...massFollowup, participants });
    } catch (error) {
      res.status(500).json({ message: "Failed to get group follow-up" });
    }
  });

  app.post("/api/ministry-admin/mass-followups/:id/complete", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const completeSchema = z.object({
        notes: z.string().optional().default(""),
        attendees: z.array(z.string()),
      });
      const data = completeSchema.parse(req.body);

      const massFollowup = await storage.getMassFollowup(req.params.id);
      if (!massFollowup || massFollowup.churchId !== user.churchId) {
        return res.status(404).json({ message: "Group follow-up not found" });
      }

      const participants = await storage.getMassFollowupParticipants(massFollowup.id);

      for (const participant of participants) {
        const attended = data.attendees.includes(participant.id);
        await storage.updateMassFollowupParticipant(participant.id, { attended: attended ? "true" : "false" });

        if (attended) {
          const checkinData = {
            churchId: massFollowup.churchId,
            createdByUserId: user.id,
            checkinDate: new Date().toISOString().split("T")[0],
            notes: data.notes || `Attended group follow-up on ${massFollowup.scheduledDate}`,
            outcome: "CONNECTED" as const,
            nextFollowupDate: null,
            nextFollowupTime: null,
            videoLink: participant.videoLink || null,
          };

          if (massFollowup.category === "converts" && participant.convertId) {
            await storage.createCheckin({ ...checkinData, convertId: participant.convertId });
            await storage.updateConvert(participant.convertId, { status: "CONNECTED" });
          } else if (massFollowup.category === "new_members" && participant.newMemberId) {
            await storage.createNewMemberCheckin({ ...checkinData, newMemberId: participant.newMemberId });
            await storage.updateNewMember(participant.newMemberId, { status: "CONNECTED" });
          } else if (massFollowup.category === "members" && participant.memberId) {
            await storage.createMemberCheckin({ ...checkinData, memberId: participant.memberId });
          }
        }
      }

      const updated = await storage.updateMassFollowup(massFollowup.id, {
        status: "COMPLETED",
        completedAt: new Date(),
        completionNotes: data.notes || null,
      });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "COMPLETE_MASS_FOLLOWUP",
        entityType: "MASS_FOLLOWUP",
        entityId: massFollowup.id,
      });

      const updatedParticipants = await storage.getMassFollowupParticipants(massFollowup.id);
      res.json({ ...updated, participants: updatedParticipants });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to complete group follow-up" });
    }
  });

  // ==================== LEADER ROUTES ====================

  // Leader stats
  app.get("/api/leader/stats", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const stats = await storage.getLeaderStats(user.churchId, user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Get prayer requests for leader's church
  async function handleGetPrayerRequests(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      if (!church) {
        return res.status(404).json({ message: "Church not found" });
      }
      const requests = await storage.getPrayerRequestsByChurch(church.name);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get prayer requests" });
    }
  }

  app.get("/api/leader/prayer-requests", requireLeader, handleGetPrayerRequests);
  app.get("/api/ministry-admin/prayer-requests", requireMinistryAdmin, handleGetPrayerRequests);

  // Get contact requests for leader's church
  async function handleGetContactRequests(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      if (!church) {
        return res.status(404).json({ message: "Church not found" });
      }
      const requests = await storage.getContactRequestsByChurch(church.name);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get contact requests" });
    }
  }

  app.get("/api/leader/contact-requests", requireLeader, handleGetContactRequests);
  app.get("/api/ministry-admin/contact-requests", requireMinistryAdmin, handleGetContactRequests);

  // Get leader's church info
  app.get("/api/leader/church", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      let church = await storage.getChurch(user.churchId);
      if (!church) {
        return res.status(404).json({ message: "Church not found" });
      }
      
      // Generate a public token if one doesn't exist
      if (!church.publicToken) {
        church = await storage.generateTokenForChurch(church.id);
      }
      
      res.json(church);
    } catch (error) {
      res.status(500).json({ message: "Failed to get church info" });
    }
  });

  // Update church logo
  app.patch("/api/leader/church/logo", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const { logoUrl } = req.body;

      if (typeof logoUrl !== "string") {
        return res.status(400).json({ message: "Invalid logo URL" });
      }

      await storage.updateChurchLogo(user.churchId, logoUrl);
      res.json({ message: "Logo updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update logo" });
    }
  });

  // Get converts for leader's church
  app.get("/api/leader/converts", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const convertsList = await storage.getConvertsByChurch(user.churchId);
      const outcomeMap = await storage.getLastFollowupOutcomesForConverts(user.churchId);
      const convertsWithOutcome = convertsList.map(c => ({
        ...c,
        lastFollowupOutcome: outcomeMap.get(c.id) || null,
      }));
      res.json(convertsWithOutcome);
    } catch (error) {
      res.status(500).json({ message: "Failed to get converts" });
    }
  });

  // Export leader's converts as Excel
  app.get("/api/leader/converts/export-excel", requireLeader, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const user = (req as any).user;
      const { status, search } = req.query;

      let convertsList = await storage.getConvertsByChurch(user.churchId);

      // Apply filters
      if (status && typeof status === "string") {
        convertsList = convertsList.filter((c) => c.status === status);
      }
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        convertsList = convertsList.filter(
          (c) =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchLower) ||
            c.phone?.includes(search) ||
            c.email?.toLowerCase().includes(searchLower)
        );
      }

      const statusLabels = EXPORT_STATUS_LABELS;

      // Build data for Excel
      const data = convertsList.map((c) => ({
        "Category": "Convert",
        "First Name": c.firstName,
        "Last Name": c.lastName,
        "Phone": c.phone || "",
        "Email": c.email || "",
        "Date of Birth": c.dateOfBirth || "",
        "Country": c.country || "",
        "Gender": c.gender || "",
        "Age Group": c.ageGroup || "",
        "Salvation Decision": c.salvationDecision || "",
        "Wants Contact": c.wantsContact || "",
        "Church Member": c.isChurchMember || "",
        "Prayer Request": c.prayerRequest || "",
        "Notes": c.summaryNotes || "",
        "Status": statusLabels[c.status] || c.status,
        "Self Submitted": c.selfSubmitted === "true" ? "Yes" : "No",
        "Created At": new Date(c.createdAt).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Converts");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=converts.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export converts" });
    }
  });

  // Export leader's follow-ups as Excel (all categories)
  app.get("/api/leader/followups/export-excel", requireLeader, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const user = (req as any).user;

      const convertFollowups = await storage.getUpcomingFollowups(user.churchId, user.id);
      const newMemberFollowups = await storage.getNewMemberFollowupsDue(user.churchId, user.id);
      const memberFollowups = await storage.getMemberFollowupsDue(user.churchId, user.id);

      const data = [
        ...convertFollowups.map((f) => ({
          "Category": "Convert",
          "Name": `${f.convertFirstName} ${f.convertLastName}`,
          "Phone": f.convertPhone || "",
          "Email": f.convertEmail || "",
          "Follow-up Date": f.nextFollowupDate || "",
          "Follow-up Time": f.nextFollowupTime || "",
          "Video Link": f.videoLink || "",
          "Notes": f.notes && !f.notes.startsWith("Follow-up scheduled for") && !f.notes.startsWith("Mass follow-up scheduled for") ? f.notes : "",
        })),
        ...newMemberFollowups.map((f) => ({
          "Category": "New Member",
          "Name": `${f.newMemberFirstName} ${f.newMemberLastName}`,
          "Phone": f.newMemberPhone || "",
          "Email": f.newMemberEmail || "",
          "Follow-up Date": f.nextFollowupDate || "",
          "Follow-up Time": f.nextFollowupTime || "",
          "Video Link": f.videoLink || "",
          "Notes": f.notes && !f.notes.startsWith("Follow-up scheduled for") && !f.notes.startsWith("Mass follow-up scheduled for") ? f.notes : "",
        })),
        ...memberFollowups.map((f) => ({
          "Category": "Member",
          "Name": `${f.memberFirstName} ${f.memberLastName}`,
          "Phone": f.memberPhone || "",
          "Email": f.memberEmail || "",
          "Follow-up Date": f.nextFollowupDate || "",
          "Follow-up Time": f.nextFollowupTime || "",
          "Video Link": f.videoLink || "",
          "Notes": f.notes && !f.notes.startsWith("Follow-up scheduled for") && !f.notes.startsWith("Mass follow-up scheduled for") ? f.notes : "",
        })),
      ];

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Follow-ups");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=followups.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export follow-ups" });
    }
  });

  // Export leader's new members as Excel
  app.get("/api/leader/new-members/export-excel", requireLeader, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const user = (req as any).user;
      const { search } = req.query;

      let newMembersList = await storage.getNewMembersByChurch(user.churchId);

      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        newMembersList = newMembersList.filter(
          (nm) =>
            `${nm.firstName} ${nm.lastName}`.toLowerCase().includes(searchLower) ||
            nm.phone?.includes(search) ||
            nm.email?.toLowerCase().includes(searchLower)
        );
      }

      const statusLabels = EXPORT_STATUS_LABELS;

      const data = newMembersList.map((nm) => ({
        "Category": "New Member",
        "First Name": nm.firstName,
        "Last Name": nm.lastName,
        "Phone": nm.phone || "",
        "Email": nm.email || "",
        "Date of Birth": nm.dateOfBirth || "",
        "Country": nm.country || "",
        "Gender": nm.gender || "",
        "Age Group": nm.ageGroup || "",
        "Notes": nm.notes || "",
        "Status": statusLabels[nm.status] || nm.status,
        "Self Submitted": nm.selfSubmitted === "true" ? "Yes" : "No",
        "Created At": new Date(nm.createdAt).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "New Members");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=new-members.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export new members" });
    }
  });

  // Export leader's members as Excel
  app.get("/api/leader/members/export-excel", requireLeader, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const user = (req as any).user;
      const { search } = req.query;

      let membersList = await storage.getMembersByChurch(user.churchId);

      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        membersList = membersList.filter(
          (m) =>
            `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchLower) ||
            m.phone?.includes(search) ||
            m.email?.toLowerCase().includes(searchLower)
        );
      }

      const data = membersList.map((m) => ({
        "Category": "Member",
        "First Name": m.firstName,
        "Last Name": m.lastName,
        "Phone": m.phone || "",
        "Email": m.email || "",
        "Date of Birth": m.dateOfBirth || "",
        "Country": m.country || "",
        "Gender": m.gender || "",
        "Member Since": m.memberSince || "",
        "Notes": m.notes || "",
        "Self Submitted": m.selfSubmitted === "true" ? "Yes" : "No",
        "Created At": new Date(m.createdAt).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Members");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=members.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ message: "Failed to export members" });
    }
  });

  // Get single convert with checkins
  app.get("/api/leader/converts/:id", requireLeader, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const convert = await storage.getConvert(id);
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }

      // Check ownership
      if (convert.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const checkinsList = await storage.getCheckinsByConvert(id);
      const enrichedCheckins = await enrichCheckinsWithSchedulerName(checkinsList);

      res.json({ ...convert, checkins: enrichedCheckins });
    } catch (error) {
      res.status(500).json({ message: "Failed to get convert" });
    }
  });

  // Get upcoming follow-ups
  app.get("/api/leader/followups", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const followups = await storage.getUpcomingFollowups(user.churchId, user.id);
      res.json(followups);
    } catch (error) {
      res.status(500).json({ message: "Failed to get follow-ups" });
    }
  });

  // Create convert
  async function handleCreateConvert(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      const schema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        summaryNotes: z.string().optional(),
        status: z.enum(["NEW", "SCHEDULED", "CONNECTED", "NOT_COMPLETED"]),
      });

      const data = schema.parse(req.body);

      const convert = await storage.createConvert({
        ...data,
        churchId: user.churchId,
        createdByUserId: user.id,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        summaryNotes: data.summaryNotes || null,
      });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "CONVERT",
        entityId: convert.id,
      });

      // Provision member account if email is provided
      if (data.email) {
        const church = await storage.getChurch(user.churchId);
        await provisionMemberAccountForConvert({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          ministryId: user.churchId,
          ministryName: church?.name || "Ministry",
          convertId: convert.id,
          sendClaimEmail: true,
        });
      }

      res.status(201).json(convert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create convert" });
    }
  }

  app.post("/api/leader/converts", requireLeader, handleCreateConvert);
  app.post("/api/ministry-admin/converts", requireMinistryAdmin, handleCreateConvert);

  const convertColumnMap: Record<string, string> = {
    firstname: "firstName", first: "firstName", "firstnam": "firstName",
    lastname: "lastName", last: "lastName", "lastnam": "lastName",
    name: "fullName",
    phone: "phone", phonenumber: "phone", telephone: "phone",
    email: "email", emailaddress: "email",
    address: "address",
    notes: "summaryNotes", summarynotes: "summaryNotes", summary: "summaryNotes",
    status: "status",
  };

  async function handleBulkUploadConverts(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const rows = parseExcelBuffer(file.buffer);
      if (rows.length === 0) return res.status(400).json({ message: "File is empty or has no data rows" });

      const results = { totalRows: rows.length, successCount: 0, errorCount: 0, errors: [] as Array<{ row: number; message: string }> };
      const church = await storage.getChurch(user.churchId);

      for (let i = 0; i < rows.length; i++) {
        try {
          const mapped = mapRowToFields(rows[i], convertColumnMap);
          if (mapped.fullName && !mapped.firstName) {
            const parts = mapped.fullName.split(/\s+/);
            mapped.firstName = parts[0] || "";
            mapped.lastName = parts.slice(1).join(" ") || "";
          }
          if (!mapped.firstName || !mapped.lastName) {
            results.errors.push({ row: i + 2, message: "First name and last name are required" });
            results.errorCount++;
            continue;
          }
          const validStatuses = ["NEW", "ACTIVE", "IN_PROGRESS", "CONNECTED", "INACTIVE"];
          const status = mapped.status && validStatuses.includes(mapped.status.toUpperCase()) ? mapped.status.toUpperCase() as any : "NEW";

          const convert = await storage.createConvert({
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            phone: mapped.phone || null,
            email: mapped.email || null,
            address: mapped.address || null,
            summaryNotes: mapped.summaryNotes || null,
            status,
            churchId: user.churchId,
            createdByUserId: user.id,
          });

          await storage.createAuditLog({
            actorUserId: user.id,
            action: "CREATE",
            entityType: "CONVERT",
            entityId: convert.id,
          });

          if (mapped.email) {
            await provisionMemberAccountForConvert({
              email: mapped.email,
              firstName: mapped.firstName,
              lastName: mapped.lastName,
              phone: mapped.phone || null,
              ministryId: user.churchId,
              ministryName: church?.name || "Ministry",
              convertId: convert.id,
              sendClaimEmail: true,
            });
          }

          results.successCount++;
        } catch (err: any) {
          results.errors.push({ row: i + 2, message: err.message || "Unknown error" });
          results.errorCount++;
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process upload" });
    }
  }

  app.post("/api/leader/converts/bulk-upload", requireLeader, upload.single("file"), handleBulkUploadConverts);
  app.post("/api/ministry-admin/converts/bulk-upload", requireMinistryAdmin, upload.single("file"), handleBulkUploadConverts);

  // Update convert
  app.patch("/api/leader/converts/:id", requireLeader, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const convert = await storage.getConvert(id);
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }

      // Check ownership
      if (convert.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const schema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        summaryNotes: z.string().optional(),
        status: z.enum(["NEW", "SCHEDULED", "CONNECTED", "NOT_COMPLETED"]).optional(),
      });

      const data = schema.parse(req.body);

      const updated = await storage.updateConvert(id, data);

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "UPDATE",
        entityType: "CONVERT",
        entityId: id,
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update convert" });
    }
  });

  // Schedule follow-up (dedicated endpoint for scheduling with email notifications)
  app.post("/api/leader/converts/:convertId/schedule-followup", requireLeader, async (req, res) => {
    try {
      const { convertId } = req.params;
      const user = (req as any).user;

      const convert = await storage.getConvert(convertId);
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }

      if (convert.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const schema = z.object({
        nextFollowupDate: z.string().min(1),
        nextFollowupTime: z.string().optional(),
        customLeaderSubject: z.string().optional(),
        customLeaderMessage: z.string().optional(),
        customConvertSubject: z.string().optional(),
        customConvertMessage: z.string().optional(),
        smsMessage: z.string().optional(),
        mmsMediaUrl: z.string().optional(),
        includeVideoLink: z.boolean().optional(),
        notificationMethod: z.enum(["email", "sms", "mms"]).optional().default("email"),
      });

      const data = schema.parse(req.body);

      const church = await storage.getChurch(user.churchId);

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const plan = (church?.plan || "free") as string;
        const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
        const billingPeriod = getCurrentBillingPeriod();
        const usage = await storage.getSmsUsage(user.churchId, billingPeriod);
        const type = data.notificationMethod;
        const used = type === "sms" ? usage.smsCount : usage.mmsCount;
        const limit = type === "sms" ? limits.sms : limits.mms;
        if (used >= limit) {
          return res.status(403).json({ message: `${type.toUpperCase()} limit reached for this billing period (${used}/${limit}). Please upgrade your plan or use email.` });
        }
      }

      let videoCallLink: string | undefined;
      if (data.includeVideoLink) {
        videoCallLink = generatePersonalJitsiLink(church?.name || "zoweh", `${convert.firstName} ${convert.lastName}`);
      }

      const checkin = await storage.createCheckin({
        convertId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: new Date().toISOString().split('T')[0],
        notes: null,
        outcome: "SCHEDULED_VISIT",
        nextFollowupDate: data.nextFollowupDate,
        nextFollowupTime: data.nextFollowupTime || null,
        videoLink: videoCallLink || null,
        notificationMethod: data.notificationMethod,
      });

      await storage.updateConvert(convertId, { status: "SCHEDULED" });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "CHECKIN",
        entityId: checkin.id,
      });

      const contactUrl = buildUrl("/contact", req);

      console.log(`Sending follow-up emails to leader: ${user.email}, convert: ${convert.email || 'N/A'}`);
      sendFollowUpNotification({
        convertName: `${convert.firstName} ${convert.lastName}`,
        convertEmail: convert.email || undefined,
        leaderName: `${user.firstName} ${user.lastName}`,
        leaderEmail: user.email,
        churchName: church?.name || "Ministry",
        followUpDate: data.nextFollowupDate,
        followUpTime: data.nextFollowupTime || undefined,
        notes: data.notes || undefined,
        videoCallLink,
        contactUrl,
        customLeaderMessage: data.customLeaderMessage || undefined,
        customConvertMessage: data.customConvertMessage || undefined,
        customLeaderSubject: data.customLeaderSubject || undefined,
        customConvertSubject: data.customConvertSubject || undefined,
      }).then(result => {
        console.log(`Follow-up email result:`, result);
      }).catch(err => console.error("Email notification failed:", err));

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const smsType = data.notificationMethod as "sms" | "mms";
        const billingPeriod = getCurrentBillingPeriod();
        const recipientPhone = convert.phone ? formatPhoneForSms(convert.phone) : null;
        const churchName = church?.name || "Ministry";

        if (recipientPhone) {
          const msg = buildFollowUpSmsMessage({
            recipientName: convert.firstName,
            churchName,
            followUpDate: data.nextFollowupDate,
            followUpTime: data.nextFollowupTime,
            videoCallLink,
            customMessage: data.smsMessage,
          });

          if (smsType === "sms") {
            sendSms({ to: recipientPhone, body: msg }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "sms");
                console.log(`SMS sent to convert ${convert.firstName}: ${result.messageId}`);
              } else {
                console.error(`SMS failed for convert:`, result.error);
              }
            }).catch(err => console.error(`SMS send error:`, err));
          } else {
            sendMms({ to: recipientPhone, body: msg, mediaUrl: data.mmsMediaUrl }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "mms");
                console.log(`MMS sent to convert ${convert.firstName}: ${result.messageId}`);
              } else {
                console.error(`MMS failed for convert:`, result.error);
              }
            }).catch(err => console.error(`MMS send error:`, err));
          }
        }
      }

      res.status(201).json({ ...checkin, videoCallLink });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error scheduling follow-up:", error);
      res.status(500).json({ message: "Failed to schedule follow-up" });
    }
  });

  // Create checkin
  app.post("/api/leader/converts/:convertId/checkins", requireLeader, async (req, res) => {
    try {
      const { convertId } = req.params;
      const user = (req as any).user;

      const convert = await storage.getConvert(convertId);
      if (!convert) {
        return res.status(404).json({ message: "Convert not found" });
      }

      // Check ownership
      if (convert.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const schema = z.object({
        checkinDate: z.string().min(1),
        notes: z.string().optional(),
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
        nextFollowupDate: z.string().optional(),
        customLeaderMessage: z.string().optional(),
        customConvertMessage: z.string().optional(),
        customLeaderSubject: z.string().optional(),
        customConvertSubject: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const checkin = await storage.createCheckin({
        convertId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: data.checkinDate,
        notes: data.notes || null,
        outcome: data.outcome,
        nextFollowupDate: data.nextFollowupDate || null,
      });

      // Update convert status based on outcome
      const outcomeToStatus = OUTCOME_TO_STATUS;
      if (outcomeToStatus[data.outcome]) {
        await storage.updateConvert(convertId, { status: outcomeToStatus[data.outcome] as any });
      }

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "CHECKIN",
        entityId: checkin.id,
      });

      if (data.nextFollowupDate) {
        const church = await storage.getChurch(user.churchId);
        const contactUrl = buildUrl("/contact", req);
        
        sendFollowUpNotification({
          convertName: `${convert.firstName} ${convert.lastName}`,
          convertEmail: convert.email || undefined,
          leaderName: `${user.firstName} ${user.lastName}`,
          leaderEmail: user.email,
          churchName: church?.name || "Ministry",
          followUpDate: data.nextFollowupDate,
          notes: data.notes || undefined,
          contactUrl,
          customLeaderMessage: data.customLeaderMessage || undefined,
          customConvertMessage: data.customConvertMessage || undefined,
          customLeaderSubject: data.customLeaderSubject || undefined,
          customConvertSubject: data.customConvertSubject || undefined,
        }).catch(err => console.error("Email notification failed:", err));
      }

      res.status(201).json(checkin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create checkin" });
    }
  });

  app.patch("/api/leader/checkins/:checkinId/complete", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const { checkinId } = req.params;

      const schema = z.object({
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
        notes: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const checkin = await storage.getCheckin(checkinId);
      if (!checkin || checkin.churchId !== user.churchId) {
        return res.status(404).json({ message: "Checkin not found" });
      }

      const today = new Date().toISOString().split("T")[0];
      await storage.completeCheckin(checkinId, {
        outcome: data.outcome,
        notes: data.notes || "",
        checkinDate: today,
      });

      const outcomeToStatus = OUTCOME_TO_STATUS;
      if (outcomeToStatus[data.outcome]) {
        await storage.updateConvert(checkin.convertId, { status: outcomeToStatus[data.outcome] as any });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to complete checkin" });
    }
  });

  app.patch("/api/leader/new-member-checkins/:checkinId/complete", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const { checkinId } = req.params;

      const schema = z.object({
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
        notes: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const checkinRecord = await storage.getNewMemberCheckin(checkinId);
      if (!checkinRecord || checkinRecord.churchId !== user.churchId) {
        return res.status(404).json({ message: "Checkin not found" });
      }

      const today = new Date().toISOString().split("T")[0];
      await storage.completeNewMemberCheckin(checkinId, {
        outcome: data.outcome,
        notes: data.notes || "",
        checkinDate: today,
      });

      const outcomeToStatus = OUTCOME_TO_STATUS;
      if (outcomeToStatus[data.outcome]) {
        await storage.updateNewMember(checkinRecord.newMemberId, { status: outcomeToStatus[data.outcome] as any });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to complete checkin" });
    }
  });

  app.patch("/api/ministry-admin/checkins/:checkinId/complete", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const { checkinId } = req.params;

      const schema = z.object({
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
        notes: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const checkin = await storage.getCheckin(checkinId);
      if (!checkin || checkin.churchId !== user.churchId) {
        return res.status(404).json({ message: "Checkin not found" });
      }

      const today = new Date().toISOString().split("T")[0];
      await storage.completeCheckin(checkinId, {
        outcome: data.outcome,
        notes: data.notes || "",
        checkinDate: today,
      });

      const outcomeToStatus = OUTCOME_TO_STATUS;
      if (outcomeToStatus[data.outcome]) {
        await storage.updateConvert(checkin.convertId, { status: outcomeToStatus[data.outcome] as any });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to complete checkin" });
    }
  });

  app.patch("/api/ministry-admin/new-member-checkins/:checkinId/complete", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const { checkinId } = req.params;

      const schema = z.object({
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
        notes: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const checkinRecord = await storage.getNewMemberCheckin(checkinId);
      if (!checkinRecord || checkinRecord.churchId !== user.churchId) {
        return res.status(404).json({ message: "Checkin not found" });
      }

      const today = new Date().toISOString().split("T")[0];
      await storage.completeNewMemberCheckin(checkinId, {
        outcome: data.outcome,
        notes: data.notes || "",
        checkinDate: today,
      });

      const outcomeToStatus = OUTCOME_TO_STATUS;
      if (outcomeToStatus[data.outcome]) {
        await storage.updateNewMember(checkinRecord.newMemberId, { status: outcomeToStatus[data.outcome] as any });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to complete checkin" });
    }
  });

  app.patch("/api/leader/member-checkins/:checkinId/complete", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const { checkinId } = req.params;

      const schema = z.object({
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "NOT_COMPLETED", "OTHER"]),
        notes: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const checkinRecord = await storage.getMemberCheckin(checkinId);
      if (!checkinRecord || checkinRecord.churchId !== user.churchId) {
        return res.status(404).json({ message: "Checkin not found" });
      }

      const today = new Date().toISOString().split("T")[0];
      await storage.completeMemberCheckin(checkinId, {
        outcome: data.outcome,
        notes: data.notes || "",
        checkinDate: today,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to complete checkin" });
    }
  });

  app.patch("/api/ministry-admin/member-checkins/:checkinId/complete", requireMinistryAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const { checkinId } = req.params;

      const schema = z.object({
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "NOT_COMPLETED", "OTHER"]),
        notes: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const checkinRecord = await storage.getMemberCheckin(checkinId);
      if (!checkinRecord || checkinRecord.churchId !== user.churchId) {
        return res.status(404).json({ message: "Checkin not found" });
      }

      const today = new Date().toISOString().split("T")[0];
      await storage.completeMemberCheckin(checkinId, {
        outcome: data.outcome,
        notes: data.notes || "",
        checkinDate: today,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to complete checkin" });
    }
  });

  // ===== NEW MEMBERS ROUTES =====
  
  // Get church info by new member token
  app.get("/api/public/church/new-member/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const church = await storage.getChurchByNewMemberToken(token);
      
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      
      const formConfig = await storage.getFormConfiguration(church.id, "new_member");
      res.json({
        id: church.id,
        name: church.name,
        location: church.location,
        logoUrl: church.logoUrl,
        formConfig: formConfig || null,
      });
    } catch (error) {
      console.error("Error fetching church by new member token:", error);
      res.status(500).json({ message: "Failed to fetch ministry information" });
    }
  });
  
  // Public new member submission
  app.post("/api/public/church/new-member/:token/submit", async (req, res) => {
    try {
      const { token } = req.params;
      const church = await storage.getChurchByNewMemberToken(token);
      
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      
      const data = publicNewMemberSubmissionSchema.parse(req.body);
      const newMember = await storage.createPublicNewMember(church.id, data);
      
      // Auto-provision member account if email provided
      if (data.email) {
        try {
          await provisionMemberAccountForMember({
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            ministryId: church.id,
            ministryName: church.name,
            memberType: 'new_member',
            newMemberId: newMember.id,
          });
        } catch (provisionError) {
          console.log("[Member Account] Auto-provision failed, continuing:", provisionError);
        }
      }
      
      res.status(201).json({ message: "Registration successful", id: newMember.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating public new member:", error);
      res.status(500).json({ message: "Failed to submit registration" });
    }
  });
  
  // Get church info by member token
  app.get("/api/public/church/member/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const church = await storage.getChurchByMemberToken(token);
      
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      
      const formConfig = await storage.getFormConfiguration(church.id, "member");
      res.json({
        id: church.id,
        name: church.name,
        location: church.location,
        logoUrl: church.logoUrl,
        formConfig: formConfig || null,
      });
    } catch (error) {
      console.error("Error fetching church by member token:", error);
      res.status(500).json({ message: "Failed to fetch ministry information" });
    }
  });
  
  // Public member submission
  app.post("/api/public/church/member/:token/submit", async (req, res) => {
    try {
      const { token } = req.params;
      const church = await storage.getChurchByMemberToken(token);
      
      if (!church) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      
      const data = publicMemberSubmissionSchema.parse(req.body);
      const member = await storage.createPublicMember(church.id, data);
      
      // Auto-provision member account if email provided
      if (data.email) {
        try {
          await provisionMemberAccountForMember({
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            ministryId: church.id,
            ministryName: church.name,
            memberType: 'member',
            memberId: member.id,
          });
        } catch (provisionError) {
          console.log("[Member Account] Auto-provision failed, continuing:", provisionError);
        }
      }
      
      res.status(201).json({ message: "Registration successful", id: member.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating public member:", error);
      res.status(500).json({ message: "Failed to submit registration" });
    }
  });

  // ===== LEADER NEW MEMBERS ROUTES =====
  
  // Get new members for leader's church
  app.get("/api/leader/new-members", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const newMembersList = await storage.getNewMembersByChurch(user.churchId);
      const outcomeMap = await storage.getLastFollowupOutcomesForNewMembers(user.churchId);
      const newMembersWithOutcome = newMembersList.map(nm => ({
        ...nm,
        lastFollowupOutcome: outcomeMap.get(nm.id) || null,
      }));
      res.json(newMembersWithOutcome);
    } catch (error) {
      console.error("Error fetching new members:", error);
      res.status(500).json({ message: "Failed to fetch new members" });
    }
  });
  
  // Get single new member
  app.get("/api/leader/new-members/:id", requireLeader, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      const newMember = await storage.getNewMember(id);
      if (!newMember) {
        return res.status(404).json({ message: "New member not found" });
      }
      
      if (newMember.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const checkinsList = await storage.getNewMemberCheckinsByNewMember(id);
      const enrichedCheckins = await enrichCheckinsWithSchedulerName(checkinsList);
      res.json({ ...newMember, checkins: enrichedCheckins });
    } catch (error) {
      console.error("Error fetching new member:", error);
      res.status(500).json({ message: "Failed to fetch new member" });
    }
  });
  
  // Create new member
  async function handleCreateNewMember(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      
      const schema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        dateOfBirth: z.string().optional(),
        address: z.string().optional(),
        country: z.string().optional(),
        gender: z.string().optional(),
        ageGroup: z.string().optional(),
        notes: z.string().optional(),
      });
      
      const data = schema.parse(req.body);
      
      const newMember = await storage.createNewMember({
        churchId: user.churchId,
        createdByUserId: user.id,
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
        selfSubmitted: "false",
      });
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "NEW_MEMBER",
        entityId: newMember.id,
      });

      // Provision member account if email is provided
      if (data.email) {
        const church = await storage.getChurch(user.churchId);
        await provisionMemberAccountForMember({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          ministryId: user.churchId,
          ministryName: church?.name || "Ministry",
          newMemberId: newMember.id,
          memberType: "new_member",
          sendClaimEmail: true,
        });
      }
      
      res.status(201).json(newMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating new member:", error);
      res.status(500).json({ message: "Failed to create new member" });
    }
  }

  app.post("/api/leader/new-members", requireLeader, handleCreateNewMember);
  app.post("/api/ministry-admin/new-members", requireMinistryAdmin, handleCreateNewMember);

  const newMemberColumnMap: Record<string, string> = {
    firstname: "firstName", first: "firstName",
    lastname: "lastName", last: "lastName",
    name: "fullName",
    phone: "phone", phonenumber: "phone", telephone: "phone",
    email: "email", emailaddress: "email",
    dateofbirth: "dateOfBirth", dob: "dateOfBirth", birthday: "dateOfBirth", birthdate: "dateOfBirth",
    address: "address",
    country: "country",
    gender: "gender",
    agegroup: "ageGroup", age: "ageGroup",
    notes: "notes",
  };

  async function handleBulkUploadNewMembers(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const rows = parseExcelBuffer(file.buffer);
      if (rows.length === 0) return res.status(400).json({ message: "File is empty or has no data rows" });

      const results = { totalRows: rows.length, successCount: 0, errorCount: 0, errors: [] as Array<{ row: number; message: string }> };
      const church = await storage.getChurch(user.churchId);

      for (let i = 0; i < rows.length; i++) {
        try {
          const mapped = mapRowToFields(rows[i], newMemberColumnMap);
          if (mapped.fullName && !mapped.firstName) {
            const parts = mapped.fullName.split(/\s+/);
            mapped.firstName = parts[0] || "";
            mapped.lastName = parts.slice(1).join(" ") || "";
          }
          if (!mapped.firstName || !mapped.lastName) {
            results.errors.push({ row: i + 2, message: "First name and last name are required" });
            results.errorCount++;
            continue;
          }

          const newMember = await storage.createNewMember({
            churchId: user.churchId,
            createdByUserId: user.id,
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            phone: mapped.phone || null,
            email: mapped.email || null,
            dateOfBirth: mapped.dateOfBirth || null,
            address: mapped.address || null,
            country: mapped.country || null,
            gender: mapped.gender || null,
            ageGroup: mapped.ageGroup || null,
            notes: mapped.notes || null,
            selfSubmitted: "false",
          });

          await storage.createAuditLog({
            actorUserId: user.id,
            action: "CREATE",
            entityType: "NEW_MEMBER",
            entityId: newMember.id,
          });

          if (mapped.email) {
            await provisionMemberAccountForMember({
              email: mapped.email,
              firstName: mapped.firstName,
              lastName: mapped.lastName,
              phone: mapped.phone || null,
              ministryId: user.churchId,
              ministryName: church?.name || "Ministry",
              newMemberId: newMember.id,
              memberType: "new_member",
              sendClaimEmail: true,
            });
          }

          results.successCount++;
        } catch (err: any) {
          results.errors.push({ row: i + 2, message: err.message || "Unknown error" });
          results.errorCount++;
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process upload" });
    }
  }

  app.post("/api/leader/new-members/bulk-upload", requireLeader, upload.single("file"), handleBulkUploadNewMembers);
  app.post("/api/ministry-admin/new-members/bulk-upload", requireMinistryAdmin, upload.single("file"), handleBulkUploadNewMembers);

  // Update new member
  async function handleUpdateNewMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      const newMember = await storage.getNewMember(id);
      if (!newMember) {
        return res.status(404).json({ message: "New member not found" });
      }
      
      if (newMember.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const schema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal("")),
        dateOfBirth: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        gender: z.string().optional().nullable(),
        ageGroup: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        status: z.enum(["NEW", "SCHEDULED", "CONNECTED", "NOT_COMPLETED"]).optional(),
      });
      
      const data = schema.parse(req.body);
      const updated = await storage.updateNewMember(id, data);
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "UPDATE",
        entityType: "NEW_MEMBER",
        entityId: id,
      });
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating new member:", error);
      res.status(500).json({ message: "Failed to update new member" });
    }
  }

  app.patch("/api/leader/new-members/:id", requireLeader, handleUpdateNewMember);
  app.patch("/api/ministry-admin/new-members/:id", requireMinistryAdmin, handleUpdateNewMember);
  
  // Get new member checkins
  app.get("/api/leader/new-members/:id/checkins", requireLeader, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      const newMember = await storage.getNewMember(id);
      if (!newMember) {
        return res.status(404).json({ message: "New member not found" });
      }
      
      if (newMember.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const checkins = await storage.getNewMemberCheckinsByNewMember(id);
      const enrichedCheckins = await enrichCheckinsWithSchedulerName(checkins);
      res.json(enrichedCheckins);
    } catch (error) {
      console.error("Error fetching new member checkins:", error);
      res.status(500).json({ message: "Failed to fetch checkins" });
    }
  });
  
  // Create new member checkin
  app.post("/api/leader/new-members/:newMemberId/checkins", requireLeader, async (req, res) => {
    try {
      const { newMemberId } = req.params;
      const user = (req as any).user;
      
      const newMember = await storage.getNewMember(newMemberId);
      if (!newMember) {
        return res.status(404).json({ message: "New member not found" });
      }
      
      if (newMember.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const schema = z.object({
        checkinDate: z.string().min(1),
        notes: z.string().optional(),
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
        nextFollowupDate: z.string().optional(),
        customLeaderMessage: z.string().optional(),
        customConvertMessage: z.string().optional(),
        customLeaderSubject: z.string().optional(),
        customConvertSubject: z.string().optional(),
      });
      
      const data = schema.parse(req.body);
      
      const checkin = await storage.createNewMemberCheckin({
        newMemberId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: data.checkinDate,
        notes: data.notes || null,
        outcome: data.outcome,
        nextFollowupDate: data.nextFollowupDate || null,
      });
      
      // Update new member status based on outcome
      const outcomeToStatus = OUTCOME_TO_STATUS;
      if (outcomeToStatus[data.outcome]) {
        await storage.updateNewMember(newMemberId, { status: outcomeToStatus[data.outcome] as any });
      }
      
      // Progress follow-up stage when a follow-up is completed (CONNECTED outcome)
      // This tracks the workflow progression through first, second, and final follow-ups
      let promptMoveToList = false;
      if (data.outcome === "CONNECTED") {
        const currentStage = newMember.followUpStage || "NEW";
        let newFollowUpStage = currentStage;
        
        if (currentStage === "SCHEDULED" || currentStage === "NEW" || currentStage === "CONTACT_NEW_MEMBER") {
          newFollowUpStage = "FIRST_COMPLETED";
        } else if (currentStage === "SECOND_SCHEDULED" || currentStage === "INITIATE_SECOND") {
          newFollowUpStage = "SECOND_COMPLETED";
        } else if (currentStage === "FINAL_SCHEDULED" || currentStage === "INITIATE_FINAL") {
          newFollowUpStage = "FINAL_COMPLETED";
          promptMoveToList = true;
        }
        
        if (newFollowUpStage !== currentStage) {
          await storage.updateNewMemberFollowUpStage(newMemberId, newFollowUpStage, new Date());
        }
      }
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "NEW_MEMBER_CHECKIN",
        entityId: checkin.id,
      });
      
      // Send follow-up notification if scheduled
      if (data.nextFollowupDate) {
        const church = await storage.getChurch(user.churchId);
        const contactUrl = buildUrl("/contact", req);
        
        sendFollowUpNotification({
          convertName: `${newMember.firstName} ${newMember.lastName}`,
          convertEmail: newMember.email || undefined,
          leaderName: `${user.firstName} ${user.lastName}`,
          leaderEmail: user.email,
          churchName: church?.name || "Ministry",
          followUpDate: data.nextFollowupDate,
          notes: data.notes || undefined,
          contactUrl,
          customLeaderMessage: data.customLeaderMessage || undefined,
          customConvertMessage: data.customConvertMessage || undefined,
          customLeaderSubject: data.customLeaderSubject || undefined,
          customConvertSubject: data.customConvertSubject || undefined,
        }).catch(err => console.error("Email notification failed:", err));
      }
      
      // Include promptMoveToList flag when final follow-up is completed
      res.status(201).json({ ...checkin, promptMoveToList });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating new member checkin:", error);
      res.status(500).json({ message: "Failed to create checkin" });
    }
  });
  
  // Schedule follow-up for new member
  app.post("/api/leader/new-members/:newMemberId/schedule-followup", requireLeader, async (req, res) => {
    try {
      const { newMemberId } = req.params;
      const user = (req as any).user;
      
      const newMember = await storage.getNewMember(newMemberId);
      if (!newMember) {
        return res.status(404).json({ message: "New member not found" });
      }
      
      if (newMember.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const schema = z.object({
        nextFollowupDate: z.string().min(1, "Follow-up date is required"),
        nextFollowupTime: z.string().optional(),
        includeVideoLink: z.boolean().optional(),
        customConvertMessage: z.string().optional(),
        customConvertSubject: z.string().optional(),
        customReminderSubject: z.string().optional(),
        customReminderMessage: z.string().optional(),
        smsMessage: z.string().optional(),
        mmsMediaUrl: z.string().optional(),
        notificationMethod: z.enum(["email", "sms", "mms"]).optional().default("email"),
      });
      
      const data = schema.parse(req.body);
      const church = await storage.getChurch(user.churchId);

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const plan = (church?.plan || "free") as string;
        const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
        const billingPeriod = getCurrentBillingPeriod();
        const usage = await storage.getSmsUsage(user.churchId, billingPeriod);
        const type = data.notificationMethod;
        const used = type === "sms" ? usage.smsCount : usage.mmsCount;
        const limit = type === "sms" ? limits.sms : limits.mms;
        if (used >= limit) {
          return res.status(403).json({ message: `${type.toUpperCase()} limit reached for this billing period (${used}/${limit}). Please upgrade your plan or use email.` });
        }
      }
      
      let videoLink: string | undefined;
      if (data.includeVideoLink) {
        videoLink = generatePersonalJitsiLink(church?.name || "ministry", `${newMember.firstName} ${newMember.lastName}`);
      }
      
      const checkin = await storage.createNewMemberCheckin({
        newMemberId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: new Date().toISOString().split("T")[0],
        notes: null,
        outcome: "SCHEDULED_VISIT",
        nextFollowupDate: data.nextFollowupDate,
        nextFollowupTime: data.nextFollowupTime || null,
        videoLink: videoLink || null,
        customReminderSubject: data.customReminderSubject || null,
        customReminderMessage: data.customReminderMessage || null,
        notificationMethod: data.notificationMethod,
      });
      
      await storage.updateNewMember(newMemberId, { status: "SCHEDULED" });
      
      const currentStage = newMember.followUpStage || "NEW";
      let newFollowUpStage = currentStage;
      
      if (currentStage === "NEW" || currentStage === "CONTACT_NEW_MEMBER") {
        newFollowUpStage = "SCHEDULED";
      } else if (currentStage === "INITIATE_SECOND") {
        newFollowUpStage = "SECOND_SCHEDULED";
      } else if (currentStage === "INITIATE_FINAL") {
        newFollowUpStage = "FINAL_SCHEDULED";
      }
      
      if (newFollowUpStage !== currentStage) {
        await storage.updateNewMemberFollowUpStage(newMemberId, newFollowUpStage);
      }
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "SCHEDULE_FOLLOWUP",
        entityType: "NEW_MEMBER",
        entityId: newMemberId,
      });
      
      const contactUrl = buildUrl("/contact", req);
      
      sendFollowUpNotification({
        convertName: `${newMember.firstName} ${newMember.lastName}`,
        convertEmail: newMember.email || undefined,
        leaderName: `${user.firstName} ${user.lastName}`,
        leaderEmail: user.email,
        churchName: church?.name || "Ministry",
        followUpDate: data.nextFollowupDate,
        followUpTime: data.nextFollowupTime || undefined,
        notes: undefined,
        videoCallLink: videoLink,
        contactUrl,
        customConvertMessage: data.customConvertMessage || undefined,
        customConvertSubject: data.customConvertSubject || undefined,
      }).catch(err => console.error("Email notification failed:", err));

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const smsType = data.notificationMethod as "sms" | "mms";
        const billingPeriod = getCurrentBillingPeriod();
        const recipientPhone = newMember.phone ? formatPhoneForSms(newMember.phone) : null;
        const churchName = church?.name || "Ministry";

        if (recipientPhone) {
          const msg = buildFollowUpSmsMessage({
            recipientName: newMember.firstName,
            churchName,
            followUpDate: data.nextFollowupDate,
            followUpTime: data.nextFollowupTime,
            videoCallLink: videoLink,
            customMessage: data.smsMessage,
          });
          if (smsType === "sms") {
            sendSms({ to: recipientPhone, body: msg }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "sms");
              } else {
                console.error(`SMS failed for new member:`, result.error);
              }
            }).catch(err => console.error(`SMS send error:`, err));
          } else {
            sendMms({ to: recipientPhone, body: msg, mediaUrl: data.mmsMediaUrl }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "mms");
              } else {
                console.error(`MMS failed for new member:`, result.error);
              }
            }).catch(err => console.error(`MMS send error:`, err));
          }
        }
      }
      
      res.status(201).json(checkin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error scheduling follow-up:", error);
      res.status(500).json({ message: "Failed to schedule follow-up" });
    }
  });
  
  // Get new member followups due
  app.get("/api/leader/new-member-followups", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const followups = await storage.getNewMemberFollowupsDue(user.churchId, user.id);
      res.json(followups);
    } catch (error) {
      console.error("Error fetching new member followups:", error);
      res.status(500).json({ message: "Failed to fetch followups" });
    }
  });

  // Get member followups due
  app.get("/api/leader/member-followups", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const followups = await storage.getMemberFollowupsDue(user.churchId, user.id);
      res.json(followups);
    } catch (error) {
      console.error("Error fetching member followups:", error);
      res.status(500).json({ message: "Failed to fetch followups" });
    }
  });

  // ===== LEADER MEMBERS ROUTES =====
  
  // Get members for leader's church
  app.get("/api/leader/members", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const membersList = await storage.getMembersByChurch(user.churchId);
      const outcomeMap = await storage.getLastFollowupOutcomesForMembers(user.churchId);
      const membersWithOutcome = membersList.map(m => ({
        ...m,
        lastFollowupOutcome: outcomeMap.get(m.id) || null,
      }));
      res.json(membersWithOutcome);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });
  
  // Get single member
  app.get("/api/leader/members/:id", requireLeader, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      if (member.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const checkinsList = await storage.getMemberCheckins(id);
      const enrichedCheckins = await enrichCheckinsWithSchedulerName(checkinsList);
      res.json({ ...member, checkins: enrichedCheckins });
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });
  
  // Create member
  async function handleCreateMember(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      
      const schema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        dateOfBirth: z.string().optional(),
        address: z.string().optional(),
        country: z.string().optional(),
        gender: z.string().optional(),
        memberSince: z.string().optional(),
        notes: z.string().optional(),
      });
      
      const data = schema.parse(req.body);
      
      const member = await storage.createMember({
        churchId: user.churchId,
        createdByUserId: user.id,
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
        selfSubmitted: "false",
      });
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "MEMBER",
        entityId: member.id,
      });

      // Provision member account if email is provided
      if (data.email) {
        const church = await storage.getChurch(user.churchId);
        await provisionMemberAccountForMember({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          ministryId: user.churchId,
          ministryName: church?.name || "Ministry",
          memberId: member.id,
          memberType: "member",
          sendClaimEmail: true,
        });
      }
      
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating member:", error);
      res.status(500).json({ message: "Failed to create member" });
    }
  }

  app.post("/api/leader/members", requireLeader, handleCreateMember);
  app.post("/api/ministry-admin/members", requireMinistryAdmin, handleCreateMember);

  const memberColumnMap: Record<string, string> = {
    firstname: "firstName", first: "firstName",
    lastname: "lastName", last: "lastName",
    name: "fullName",
    phone: "phone", phonenumber: "phone", telephone: "phone",
    email: "email", emailaddress: "email",
    dateofbirth: "dateOfBirth", dob: "dateOfBirth", birthday: "dateOfBirth", birthdate: "dateOfBirth",
    address: "address",
    country: "country",
    gender: "gender",
    membersince: "memberSince", joindate: "memberSince", joined: "memberSince",
    notes: "notes",
  };

  async function handleBulkUploadMembers(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const rows = parseExcelBuffer(file.buffer);
      if (rows.length === 0) return res.status(400).json({ message: "File is empty or has no data rows" });

      const results = { totalRows: rows.length, successCount: 0, errorCount: 0, errors: [] as Array<{ row: number; message: string }> };
      const church = await storage.getChurch(user.churchId);

      for (let i = 0; i < rows.length; i++) {
        try {
          const mapped = mapRowToFields(rows[i], memberColumnMap);
          if (mapped.fullName && !mapped.firstName) {
            const parts = mapped.fullName.split(/\s+/);
            mapped.firstName = parts[0] || "";
            mapped.lastName = parts.slice(1).join(" ") || "";
          }
          if (!mapped.firstName || !mapped.lastName) {
            results.errors.push({ row: i + 2, message: "First name and last name are required" });
            results.errorCount++;
            continue;
          }

          const member = await storage.createMember({
            churchId: user.churchId,
            createdByUserId: user.id,
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            phone: mapped.phone || null,
            email: mapped.email || null,
            dateOfBirth: mapped.dateOfBirth || null,
            address: mapped.address || null,
            country: mapped.country || null,
            gender: mapped.gender || null,
            memberSince: mapped.memberSince || null,
            notes: mapped.notes || null,
            selfSubmitted: "false",
          });

          await storage.createAuditLog({
            actorUserId: user.id,
            action: "CREATE",
            entityType: "MEMBER",
            entityId: member.id,
          });

          if (mapped.email) {
            await provisionMemberAccountForMember({
              email: mapped.email,
              firstName: mapped.firstName,
              lastName: mapped.lastName,
              phone: mapped.phone || null,
              ministryId: user.churchId,
              ministryName: church?.name || "Ministry",
              memberId: member.id,
              memberType: "member",
              sendClaimEmail: true,
            });
          }

          results.successCount++;
        } catch (err: any) {
          results.errors.push({ row: i + 2, message: err.message || "Unknown error" });
          results.errorCount++;
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process upload" });
    }
  }

  app.post("/api/leader/members/bulk-upload", requireLeader, upload.single("file"), handleBulkUploadMembers);
  app.post("/api/ministry-admin/members/bulk-upload", requireMinistryAdmin, upload.single("file"), handleBulkUploadMembers);

  // Update member
  async function handleUpdateMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      if (member.churchId !== user.churchId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const schema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal("")),
        dateOfBirth: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        gender: z.string().optional().nullable(),
        memberSince: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      });
      
      const data = schema.parse(req.body);
      const updated = await storage.updateMember(id, data);
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "UPDATE",
        entityType: "MEMBER",
        entityId: id,
      });
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating member:", error);
      res.status(500).json({ message: "Failed to update member" });
    }
  }

  app.patch("/api/leader/members/:id", requireLeader, handleUpdateMember);
  app.patch("/api/ministry-admin/members/:id", requireMinistryAdmin, handleUpdateMember);
  
  // Generate public token (for converts) for church
  async function handleGeneratePublicToken(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const church = await storage.generateTokenForChurch(user.churchId);
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "GENERATE_PUBLIC_TOKEN",
        entityType: "CHURCH",
        entityId: user.churchId,
      });
      
      res.json({ token: church.publicToken });
    } catch (error) {
      console.error("Error generating public token:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  }

  app.post("/api/leader/church/generate-public-token", requireLeader, handleGeneratePublicToken);
  app.post("/api/ministry-admin/church/generate-public-token", requireMinistryAdmin, handleGeneratePublicToken);

  // Generate new member token for church
  async function handleGenerateNewMemberToken(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const church = await storage.generateNewMemberTokenForChurch(user.churchId);
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "GENERATE_NEW_MEMBER_TOKEN",
        entityType: "CHURCH",
        entityId: user.churchId,
      });
      
      res.json({ token: church.newMemberToken });
    } catch (error) {
      console.error("Error generating new member token:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  }

  app.post("/api/leader/church/generate-new-member-token", requireLeader, handleGenerateNewMemberToken);
  app.post("/api/ministry-admin/church/generate-new-member-token", requireMinistryAdmin, handleGenerateNewMemberToken);
  
  // Generate member token for church
  async function handleGenerateMemberToken(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const church = await storage.generateMemberTokenForChurch(user.churchId);
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "GENERATE_MEMBER_TOKEN",
        entityType: "CHURCH",
        entityId: user.churchId,
      });
      
      res.json({ token: church.memberToken });
    } catch (error) {
      console.error("Error generating member token:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  }

  app.post("/api/leader/church/generate-member-token", requireLeader, handleGenerateMemberToken);
  app.post("/api/ministry-admin/church/generate-member-token", requireMinistryAdmin, handleGenerateMemberToken);
  
  // Get church tokens for leader
  async function handleGetChurchTokens(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const church = await storage.getChurch(user.churchId);
      
      if (!church) {
        return res.status(404).json({ message: "Church not found" });
      }
      
      res.json({
        publicToken: church.publicToken,
        newMemberToken: church.newMemberToken,
        memberToken: church.memberToken,
      });
    } catch (error) {
      console.error("Error fetching church tokens:", error);
      res.status(500).json({ message: "Failed to fetch tokens" });
    }
  }

  app.get("/api/leader/church/tokens", requireLeader, handleGetChurchTokens);
  app.get("/api/ministry-admin/church/tokens", requireMinistryAdmin, handleGetChurchTokens);

  // ===== MEMBER CHECKINS ROUTES =====

  // Get member checkins
  app.get("/api/leader/members/:id/checkins", requireLeader, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      if (member.churchId !== user.churchId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const checkins = await storage.getMemberCheckins(id);
      const enrichedCheckins = await enrichCheckinsWithSchedulerName(checkins);
      res.json(enrichedCheckins);
    } catch (error) {
      console.error("Error fetching member checkins:", error);
      res.status(500).json({ message: "Failed to fetch checkins" });
    }
  });

  // Create member checkin
  app.post("/api/leader/members/:memberId/checkins", requireLeader, async (req, res) => {
    try {
      const { memberId } = req.params;
      const user = (req as any).user;
      
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      if (member.churchId !== user.churchId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const schema = z.object({
        notes: z.string().optional(),
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_FOLLOWUP", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "NOT_COMPLETED", "OTHER"]),
        nextFollowupDate: z.string().optional().nullable(),
        videoLink: z.string().optional().nullable(),
      });
      
      const data = schema.parse(req.body);
      
      const checkin = await storage.createMemberCheckin({
        memberId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: new Date().toISOString().split("T")[0],
        notes: data.notes || null,
        outcome: data.outcome,
        nextFollowupDate: data.nextFollowupDate || null,
        videoLink: data.videoLink || null,
      });
      
      // Update member status based on outcome
      const statusMap = OUTCOME_TO_STATUS;
      
      if (statusMap[data.outcome]) {
        await storage.updateMember(memberId, { status: statusMap[data.outcome] });
      }
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "MEMBER_CHECKIN",
        entityId: checkin.id,
      });
      
      res.status(201).json(checkin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating member checkin:", error);
      res.status(500).json({ message: "Failed to create checkin" });
    }
  });

  // Schedule follow-up for member
  app.post("/api/leader/members/:memberId/schedule-followup", requireLeader, async (req, res) => {
    try {
      const { memberId } = req.params;
      const user = (req as any).user;
      
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      if (member.churchId !== user.churchId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const schema = z.object({
        nextFollowupDate: z.string().min(1, "Follow-up date is required"),
        nextFollowupTime: z.string().optional(),
        notes: z.string().optional(),
        includeVideoLink: z.boolean().optional(),
        customLeaderMessage: z.string().optional(),
        customConvertMessage: z.string().optional(),
        customLeaderSubject: z.string().optional(),
        customConvertSubject: z.string().optional(),
        smsMessage: z.string().optional(),
        mmsMediaUrl: z.string().optional(),
        notificationMethod: z.enum(["email", "sms", "mms"]).optional().default("email"),
      });
      
      const data = schema.parse(req.body);
      const church = await storage.getChurch(user.churchId);

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const plan = (church?.plan || "free") as string;
        const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
        const billingPeriod = getCurrentBillingPeriod();
        const usage = await storage.getSmsUsage(user.churchId, billingPeriod);
        const type = data.notificationMethod;
        const used = type === "sms" ? usage.smsCount : usage.mmsCount;
        const limit = type === "sms" ? limits.sms : limits.mms;
        if (used >= limit) {
          return res.status(403).json({ message: `${type.toUpperCase()} limit reached for this billing period (${used}/${limit}). Please upgrade your plan or use email.` });
        }
      }
      
      let videoLink: string | undefined;
      if (data.includeVideoLink) {
        videoLink = generatePersonalJitsiLink(church?.name || "ministry", `${member.firstName} ${member.lastName}`);
      }
      
      const checkin = await storage.createMemberCheckin({
        memberId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: new Date().toISOString().split("T")[0],
        notes: data.notes || null,
        outcome: "SCHEDULED_VISIT",
        nextFollowupDate: data.nextFollowupDate,
        nextFollowupTime: data.nextFollowupTime || null,
        videoLink: videoLink || null,
        notificationMethod: data.notificationMethod,
      });
      
      await storage.updateMember(memberId, { status: "SCHEDULED" });
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "SCHEDULE_FOLLOWUP",
        entityType: "MEMBER",
        entityId: memberId,
      });
      
      const contactUrl = buildUrl("/contact", req);
      
      sendFollowUpNotification({
        convertName: `${member.firstName} ${member.lastName}`,
        convertEmail: member.email || undefined,
        leaderName: `${user.firstName} ${user.lastName}`,
        leaderEmail: user.email,
        churchName: church?.name || "Ministry",
        followUpDate: data.nextFollowupDate,
        followUpTime: data.nextFollowupTime || undefined,
        notes: data.notes || undefined,
        videoCallLink: videoLink,
        contactUrl,
        customLeaderMessage: data.customLeaderMessage || undefined,
        customConvertMessage: data.customConvertMessage || undefined,
        customLeaderSubject: data.customLeaderSubject || undefined,
        customConvertSubject: data.customConvertSubject || undefined,
      }).catch(err => console.error("Email notification failed:", err));

      if (data.notificationMethod === "sms" || data.notificationMethod === "mms") {
        const smsType = data.notificationMethod as "sms" | "mms";
        const billingPeriod = getCurrentBillingPeriod();
        const recipientPhone = member.phone ? formatPhoneForSms(member.phone) : null;
        const churchName = church?.name || "Ministry";

        if (recipientPhone) {
          const msg = buildFollowUpSmsMessage({
            recipientName: member.firstName,
            churchName,
            followUpDate: data.nextFollowupDate,
            followUpTime: data.nextFollowupTime,
            videoCallLink: videoLink,
            customMessage: data.smsMessage,
          });
          if (smsType === "sms") {
            sendSms({ to: recipientPhone, body: msg }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "sms");
              } else {
                console.error(`SMS failed for member:`, result.error);
              }
            }).catch(err => console.error(`SMS send error:`, err));
          } else {
            sendMms({ to: recipientPhone, body: msg, mediaUrl: data.mmsMediaUrl }).then(async (result) => {
              if (result.success) {
                await storage.incrementSmsUsage(user.churchId, billingPeriod, "mms");
              } else {
                console.error(`MMS failed for member:`, result.error);
              }
            }).catch(err => console.error(`MMS send error:`, err));
          }
        }
      }
      
      res.status(201).json(checkin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error scheduling follow-up:", error);
      res.status(500).json({ message: "Failed to schedule follow-up" });
    }
  });

  // ===== GROUP FOLLOW-UP ROUTES =====

  app.post("/api/leader/mass-followup/candidates", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const schema = z.object({
        category: z.enum(["converts", "new_members", "members"]),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      });
      const data = schema.parse(req.body);

      let people: any[] = [];
      if (data.category === "converts") {
        people = await storage.getConvertsByChurch(user.churchId);
      } else if (data.category === "new_members") {
        people = await storage.getNewMembersByChurch(user.churchId);
      } else if (data.category === "members") {
        people = await storage.getMembersByChurch(user.churchId);
      }

      if (data.dateFrom || data.dateTo) {
        people = people.filter((p: any) => {
          let dateField: string | null = null;
          if (data.category === "members" && p.memberSince) {
            dateField = p.memberSince;
          } else if (p.createdAt) {
            dateField = typeof p.createdAt === "string" ? p.createdAt : new Date(p.createdAt).toISOString().split("T")[0];
          }
          if (!dateField) return true;
          const d = dateField.split("T")[0];
          if (data.dateFrom && d < data.dateFrom) return false;
          if (data.dateTo && d > data.dateTo) return false;
          return true;
        });
      }

      const candidates = people.map((p: any) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email || null,
        phone: p.phone || null,
        date: data.category === "members" ? (p.memberSince || p.createdAt) : p.createdAt,
      }));

      res.json(candidates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error fetching mass followup candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.post("/api/leader/mass-followup", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const schema = z.object({
        category: z.enum(["converts", "new_members", "members"]),
        personIds: z.array(z.string()).min(1, "Select at least one person"),
        nextFollowupDate: z.string().min(1, "Follow-up date is required"),
        nextFollowupTime: z.string().optional(),
        includeVideoLink: z.boolean().optional(),
        customSubject: z.string().optional(),
        customMessage: z.string().optional(),
      });
      const data = schema.parse(req.body);

      const church = await storage.getChurch(user.churchId);
      const churchName = church?.name || "Ministry";
      const leaderName = `${user.firstName} ${user.lastName}`;
      const contactUrl = buildUrl("/contact", req);
      const massFollowup = await storage.createMassFollowup({
        churchId: user.churchId,
        createdByUserId: user.id,
        category: data.category,
        scheduledDate: data.nextFollowupDate,
        scheduledTime: data.nextFollowupTime || null,
        notes: null,
        status: "SCHEDULED",
        customSubject: data.customSubject || null,
        customMessage: data.customMessage || null,
        videoLink: data.includeVideoLink ? generateMassJitsiLink(churchName) : null,
      });

      const results: { personId: string; name: string; success: boolean; error?: string }[] = [];

      for (const personId of data.personIds) {
        try {
          let person: any = null;
          if (data.category === "converts") {
            person = await storage.getConvert(personId);
          } else if (data.category === "new_members") {
            person = await storage.getNewMember(personId);
          } else if (data.category === "members") {
            person = await storage.getMember(personId);
          }

          if (!person || person.churchId !== user.churchId) {
            results.push({ personId, name: "Unknown", success: false, error: "Not found or access denied" });
            continue;
          }

          const personName = `${person.firstName} ${person.lastName}`;
          let videoLink: string | undefined;
          if (data.includeVideoLink) {
            videoLink = generatePersonalJitsiLink(churchName, personName);
          }

          await storage.createMassFollowupParticipant({
            massFollowupId: massFollowup.id,
            personCategory: data.category,
            convertId: data.category === "converts" ? personId : null,
            newMemberId: data.category === "new_members" ? personId : null,
            memberId: data.category === "members" ? personId : null,
            guestId: null,
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email || null,
            attended: "false",
            videoLink: videoLink || null,
          });

          if (data.category === "converts") {
            await storage.updateConvert(personId, { status: "SCHEDULED" });
          } else if (data.category === "new_members") {
            await storage.updateNewMember(personId, { status: "SCHEDULED" });
          }

          if (person.email) {
            sendFollowUpNotification({
              convertName: personName,
              convertEmail: person.email,
              leaderName,
              leaderEmail: user.email,
              churchName,
              followUpDate: data.nextFollowupDate,
              followUpTime: data.nextFollowupTime || undefined,
              videoCallLink: videoLink,
              contactUrl,
              customConvertSubject: data.customSubject || undefined,
              customConvertMessage: data.customMessage || undefined,
              category: data.category,
            }).catch(err => console.error(`Email failed for ${personName}:`, err));
          }

          results.push({ personId, name: personName, success: true });
        } catch (err: any) {
          results.push({ personId, name: "Unknown", success: false, error: err.message });
        }
      }

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "MASS_SCHEDULE_FOLLOWUP",
        entityType: data.category.toUpperCase(),
        entityId: data.personIds.join(","),
      });

      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        message: `Follow-ups scheduled for ${succeeded} ${succeeded === 1 ? "person" : "people"}${failed > 0 ? `, ${failed} failed` : ""}`,
        results,
        succeeded,
        failed,
        massFollowupId: massFollowup.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error in mass followup:", error);
      res.status(500).json({ message: "Failed to schedule group follow-ups" });
    }
  });

  app.get("/api/leader/mass-followups", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const massFollowups = await storage.getMassFollowupsByChurch(user.churchId);
      const userIds = [...new Set(massFollowups.map(mf => mf.createdByUserId).filter(Boolean))];
      const userMap = new Map<string, string>();
      for (const uid of userIds) {
        const u = await storage.getUser(uid);
        if (u) userMap.set(uid, `${u.firstName} ${u.lastName}`);
      }
      const enriched = massFollowups.map(mf => ({
        ...mf,
        scheduledByName: userMap.get(mf.createdByUserId) || null,
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group follow-ups" });
    }
  });

  app.get("/api/leader/mass-followups/:id", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const massFollowup = await storage.getMassFollowup(req.params.id);
      if (!massFollowup || massFollowup.churchId !== user.churchId) {
        return res.status(404).json({ message: "Group follow-up not found" });
      }
      const participants = await storage.getMassFollowupParticipants(massFollowup.id);
      res.json({ ...massFollowup, participants });
    } catch (error) {
      res.status(500).json({ message: "Failed to get group follow-up" });
    }
  });

  app.post("/api/leader/mass-followups/:id/complete", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const completeSchema = z.object({
        notes: z.string().optional().default(""),
        attendees: z.array(z.string()),
      });
      const data = completeSchema.parse(req.body);

      const massFollowup = await storage.getMassFollowup(req.params.id);
      if (!massFollowup || massFollowup.churchId !== user.churchId) {
        return res.status(404).json({ message: "Group follow-up not found" });
      }

      const participants = await storage.getMassFollowupParticipants(massFollowup.id);

      for (const participant of participants) {
        const attended = data.attendees.includes(participant.id);
        await storage.updateMassFollowupParticipant(participant.id, { attended: attended ? "true" : "false" });

        if (attended) {
          const checkinData = {
            churchId: massFollowup.churchId,
            createdByUserId: user.id,
            checkinDate: new Date().toISOString().split("T")[0],
            notes: data.notes || `Attended group follow-up on ${massFollowup.scheduledDate}`,
            outcome: "CONNECTED" as const,
            nextFollowupDate: null,
            nextFollowupTime: null,
            videoLink: participant.videoLink || null,
          };

          if (massFollowup.category === "converts" && participant.convertId) {
            await storage.createCheckin({ ...checkinData, convertId: participant.convertId });
            await storage.updateConvert(participant.convertId, { status: "CONNECTED" });
          } else if (massFollowup.category === "new_members" && participant.newMemberId) {
            await storage.createNewMemberCheckin({ ...checkinData, newMemberId: participant.newMemberId });
            await storage.updateNewMember(participant.newMemberId, { status: "CONNECTED" });
          } else if (massFollowup.category === "members" && participant.memberId) {
            await storage.createMemberCheckin({ ...checkinData, memberId: participant.memberId });
          }
        }
      }

      const updated = await storage.updateMassFollowup(massFollowup.id, {
        status: "COMPLETED",
        completedAt: new Date(),
        completionNotes: data.notes || null,
      });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "COMPLETE_MASS_FOLLOWUP",
        entityType: "MASS_FOLLOWUP",
        entityId: massFollowup.id,
      });

      const updatedParticipants = await storage.getMassFollowupParticipants(massFollowup.id);
      res.json({ ...updated, participants: updatedParticipants });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to complete group follow-up" });
    }
  });

  // ===== NEW MEMBER CONVERSION ROUTES =====

  // Convert new member to member
  async function handleConvertToMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      const newMember = await storage.getNewMember(id);
      if (!newMember) {
        return res.status(404).json({ message: "New member not found" });
      }
      
      if (newMember.churchId !== user.churchId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const member = await storage.convertNewMemberToMember(id, user.id);
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CONVERT_TO_MEMBER",
        entityType: "NEW_MEMBER",
        entityId: id,
      });
      
      res.status(201).json(member);
    } catch (error) {
      console.error("Error converting to member:", error);
      res.status(500).json({ message: "Failed to convert to member" });
    }
  }

  app.post("/api/leader/new-members/:id/convert-to-member", requireLeader, handleConvertToMember);
  app.post("/api/ministry-admin/new-members/:id/convert-to-member", requireMinistryAdmin, handleConvertToMember);

  // Update new member follow-up stage
  async function handleFollowUpStage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      const newMember = await storage.getNewMember(id);
      if (!newMember) {
        return res.status(404).json({ message: "New member not found" });
      }
      
      if (newMember.churchId !== user.churchId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const schema = z.object({
        stage: z.enum(["NEW", "SCHEDULED", "FIRST_COMPLETED", "INITIATE_SECOND", "SECOND_SCHEDULED", "SECOND_COMPLETED", "INITIATE_FINAL", "FINAL_SCHEDULED", "FINAL_COMPLETED"]),
      });
      
      const data = schema.parse(req.body);
      
      // If completing a stage, set the completedAt timestamp
      const completedAt = data.stage.includes("COMPLETED") ? new Date() : undefined;
      const updated = await storage.updateNewMemberFollowUpStage(id, data.stage, completedAt);
      
      await storage.createAuditLog({
        actorUserId: user.id,
        action: "UPDATE_FOLLOWUP_STAGE",
        entityType: "NEW_MEMBER",
        entityId: id,
      });
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating follow-up stage:", error);
      res.status(500).json({ message: "Failed to update follow-up stage" });
    }
  }

  app.patch("/api/leader/new-members/:id/follow-up-stage", requireLeader, handleFollowUpStage);
  app.patch("/api/ministry-admin/new-members/:id/follow-up-stage", requireMinistryAdmin, handleFollowUpStage);

  // AI Text Generation endpoint
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const aiTextGenerationSchema = z.object({
    prompt: z.string().max(500).optional(),
    existingText: z.string().max(2000).optional(),
    context: z.string().max(500).optional(),
  }).refine(data => data.prompt || data.existingText, {
    message: "Either prompt or existingText is required"
  });

  app.post("/api/ai/generate-text", requireAuth, async (req: Request, res: Response) => {
    try {
      const validationResult = aiTextGenerationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: validationResult.error.errors[0].message });
      }
      
      const { prompt, existingText, context } = validationResult.data;

      let systemPrompt = `You are a helpful assistant for a ministry management application. 
You help leaders write warm, professional, and compassionate messages for follow-up communications with new converts and members.
Keep messages concise but heartfelt. Use a friendly, encouraging tone appropriate for a church ministry context.
Do not use emojis unless specifically requested.`;

      let userPrompt = "";
      
      if (existingText && prompt) {
        // Modify existing text based on prompt
        userPrompt = `Please modify the following text based on this instruction: "${prompt}"

Original text:
"${existingText}"

${context ? `Context: ${context}` : ""}

Provide only the modified text, without any explanations or quotes.`;
      } else if (existingText) {
        // Improve existing text
        userPrompt = `Please improve the following text to make it more warm, professional, and engaging while keeping the same meaning:

"${existingText}"

${context ? `Context: ${context}` : ""}

Provide only the improved text, without any explanations or quotes.`;
      } else {
        // Generate new text from prompt
        userPrompt = `Please write a message based on this instruction: "${prompt}"

${context ? `Context: ${context}` : ""}

Provide only the message text, without any explanations or quotes.`;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_completion_tokens: 500,
        temperature: 0.7,
      });

      const generatedText = completion.choices[0]?.message?.content?.trim() || "";
      
      res.json({ text: generatedText });
    } catch (error) {
      console.error("Error generating AI text:", error);
      res.status(500).json({ message: "Failed to generate text" });
    }
  });

  // ---- Announcements API (for Leader and Ministry Admin) ----
  async function handleAnnouncementSend(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user?.churchId) {
      return res.status(403).json({ message: "Not assigned to a church" });
    }

    try {
      const { subject, message, notificationMethod, smsMessage, mmsMediaUrl, recipientGroups, imageUrl } = req.body;

      if (!subject || !message || !recipientGroups || !Array.isArray(recipientGroups) || recipientGroups.length === 0) {
        return res.status(400).json({ message: "Subject, message, and at least one recipient group are required" });
      }

      const smsType = notificationMethod === "sms" || notificationMethod === "mms" ? notificationMethod : null;
      if (smsType && !smsMessage) {
        return res.status(400).json({ message: `${smsType === "mms" ? "MMS" : "SMS"} message text is required when using ${smsType === "mms" ? "Email + MMS" : "Email + SMS"}` });
      }

      const church = await storage.getChurch(user.churchId);
      const churchName = church?.name || "Ministry";

      const recipients: { firstName: string; email?: string | null; phone?: string | null }[] = [];

      if (recipientGroups.includes("converts")) {
        const converts = await storage.getConvertsByChurch(user.churchId);
        converts.forEach(c => recipients.push({ firstName: c.firstName, email: c.email, phone: c.phone }));
      }
      if (recipientGroups.includes("new_members")) {
        const newMembers = await storage.getNewMembersByChurch(user.churchId);
        newMembers.forEach(nm => recipients.push({ firstName: nm.firstName, email: nm.email, phone: nm.phone }));
      }
      if (recipientGroups.includes("members")) {
        const members = await storage.getMembersByChurch(user.churchId);
        members.forEach(m => recipients.push({ firstName: m.firstName, email: m.email, phone: m.phone }));
      }

      if (recipients.length === 0) {
        return res.status(400).json({ message: "No recipients found in the selected groups" });
      }

      const uniqueEmails = new Set<string>();
      const uniqueRecipients = recipients.filter(r => {
        if (!r.email) return false;
        const key = r.email.toLowerCase();
        if (uniqueEmails.has(key)) return false;
        uniqueEmails.add(key);
        return true;
      });

      const { client, fromEmail } = await getUncachableResendClient();
      const emailMatch = (fromEmail || "noreply@resend.dev").match(/<([^>]+)>/) || (fromEmail || "noreply@resend.dev").match(/([^\s<>]+@[^\s<>]+)/);
      const emailAddress = emailMatch ? emailMatch[1] : fromEmail || "noreply@resend.dev";
      const safeName = churchName.replace(/[<>"]/g, "").trim();
      const fromWithMinistry = `${safeName} <${emailAddress}>`;

      const imageSection = imageUrl
        ? `<div style="margin: 20px 0; text-align: center;">
            <img src="${imageUrl}" alt="Announcement" style="max-width: 100%; border-radius: 8px;" />
          </div>`
        : "";

      let emailsSent = 0;
      let emailsFailed = 0;
      const emailPromises = uniqueRecipients.map(recipient =>
        client.emails.send({
          from: fromWithMinistry,
          to: recipient.email!,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">${subject}</h2>
              <p>Hello ${recipient.firstName},</p>
              ${imageSection}
              <div style="white-space: pre-wrap; margin: 20px 0;">${message}</div>
              <p>Blessings,<br>${churchName}</p>
            </div>
          `,
        }).then(() => { emailsSent++; }).catch((err: any) => {
          console.error(`[Announcement] Email failed for ${recipient.email}:`, err?.message);
          emailsFailed++;
        })
      );

      await Promise.all(emailPromises);

      let smsSent = 0;
      let smsFailed = 0;
      let smsSkipped = 0;

      if (smsType && smsMessage) {
        const billingPeriod = getCurrentBillingPeriod();
        const usage = await storage.getSmsUsage(user.churchId, billingPeriod);
        const plan = church?.plan || "free";
        const limits = SMS_PLAN_LIMITS[plan] || SMS_PLAN_LIMITS.free;
        const currentCount = smsType === "sms" ? usage.smsCount : usage.mmsCount;
        const limit = smsType === "sms" ? limits.sms : limits.mms;

        const phoneRecipients = recipients.filter(r => r.phone).map(r => ({
          ...r,
          formattedPhone: formatPhoneForSms(r.phone!),
        })).filter(r => r.formattedPhone);

        const uniquePhones = new Set<string>();
        const uniquePhoneRecipients = phoneRecipients.filter(r => {
          if (uniquePhones.has(r.formattedPhone!)) return false;
          uniquePhones.add(r.formattedPhone!);
          return true;
        });

        let remaining = limit - currentCount;

        for (const recipient of uniquePhoneRecipients) {
          if (remaining <= 0) {
            smsSkipped++;
            continue;
          }

          const result = smsType === "sms"
            ? await sendSms({ to: recipient.formattedPhone!, body: smsMessage })
            : await sendMms({ to: recipient.formattedPhone!, body: smsMessage, mediaUrl: mmsMediaUrl });

          if (result.success) {
            await storage.incrementSmsUsage(user.churchId, billingPeriod, smsType);
            smsSent++;
            remaining--;
          } else {
            smsFailed++;
          }
        }
      }

      res.json({
        success: true,
        emailsSent,
        emailsFailed,
        smsSent,
        smsFailed,
        smsSkipped,
        totalEmailRecipients: uniqueRecipients.length,
      });
    } catch (error: any) {
      console.error("[Announcement] Error:", error);
      res.status(500).json({ message: error.message || "Failed to send announcement" });
    }
  }

  app.post("/api/leader/announcements/send", requireLeader, handleAnnouncementSend);
  app.post("/api/ministry-admin/announcements/send", requireMinistryAdmin, handleAnnouncementSend);

  // Announcement recipient counts
  async function handleAnnouncementRecipientCounts(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user?.churchId) {
      return res.status(403).json({ message: "Not assigned to a church" });
    }

    try {
      const converts = await storage.getConvertsByChurch(user.churchId);
      const newMembers = await storage.getNewMembersByChurch(user.churchId);
      const members = await storage.getMembersByChurch(user.churchId);

      res.json({
        converts: { email: converts.filter(c => c.email).length, phone: converts.filter(c => c.phone).length, total: converts.length },
        new_members: { email: newMembers.filter(nm => nm.email).length, phone: newMembers.filter(nm => nm.phone).length, total: newMembers.length },
        members: { email: members.filter(m => m.email).length, phone: members.filter(m => m.phone).length, total: members.length },
      });
    } catch (error: any) {
      console.error("[Announcement] Error fetching counts:", error);
      res.status(500).json({ message: "Failed to fetch recipient counts" });
    }
  }

  app.get("/api/leader/announcements/recipient-counts", requireLeader, handleAnnouncementRecipientCounts);
  app.get("/api/ministry-admin/announcements/recipient-counts", requireMinistryAdmin, handleAnnouncementRecipientCounts);

  // Scheduled Announcements
  async function handleScheduleAnnouncement(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user?.churchId) {
      return res.status(403).json({ message: "Not assigned to a church" });
    }

    try {
      const { subject, message, notificationMethod, smsMessage, mmsMediaUrl, imageUrl, recipientGroups, scheduledAt } = req.body;

      if (!subject || !message || !recipientGroups || !Array.isArray(recipientGroups) || recipientGroups.length === 0) {
        return res.status(400).json({ message: "Subject, message, and at least one recipient group are required" });
      }

      const validGroups = ["converts", "new_members", "members"];
      const invalidGroups = recipientGroups.filter((g: string) => !validGroups.includes(g));
      if (invalidGroups.length > 0) {
        return res.status(400).json({ message: `Invalid recipient groups: ${invalidGroups.join(", ")}` });
      }

      const validMethods = ["email", "sms", "mms"];
      if (notificationMethod && !validMethods.includes(notificationMethod)) {
        return res.status(400).json({ message: `Invalid notification method: ${notificationMethod}` });
      }

      if (!scheduledAt) {
        return res.status(400).json({ message: "Scheduled date/time is required" });
      }

      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }

      const smsType = notificationMethod === "sms" || notificationMethod === "mms" ? notificationMethod : null;
      if (smsType && !smsMessage?.trim()) {
        return res.status(400).json({ message: `${smsType === "mms" ? "MMS" : "SMS"} message text is required when using ${smsType === "mms" ? "Email + MMS" : "Email + SMS"}` });
      }

      const scheduled = await storage.createScheduledAnnouncement({
        churchId: user.churchId,
        createdByUserId: user.id,
        subject,
        message,
        notificationMethod: notificationMethod || "email",
        smsMessage: smsMessage || null,
        mmsMediaUrl: mmsMediaUrl || null,
        imageUrl: imageUrl || null,
        recipientGroups,
        scheduledAt: scheduledDate,
        status: "PENDING",
      });

      res.json({ success: true, scheduled });
    } catch (error: any) {
      console.error("[Scheduled Announcement] Error:", error);
      res.status(500).json({ message: error.message || "Failed to schedule announcement" });
    }
  }

  async function handleGetScheduledAnnouncements(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user?.churchId) {
      return res.status(403).json({ message: "Not assigned to a church" });
    }

    try {
      const announcements = await storage.getScheduledAnnouncementsByChurch(user.churchId);
      res.json(announcements);
    } catch (error: any) {
      console.error("[Scheduled Announcement] Error fetching:", error);
      res.status(500).json({ message: "Failed to fetch scheduled announcements" });
    }
  }

  async function handleCancelScheduledAnnouncement(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user?.churchId) {
      return res.status(403).json({ message: "Not assigned to a church" });
    }

    try {
      const { id } = req.params;
      const announcement = await storage.getScheduledAnnouncement(id);

      if (!announcement) {
        return res.status(404).json({ message: "Scheduled announcement not found" });
      }
      if (announcement.churchId !== user.churchId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (announcement.status !== "PENDING") {
        return res.status(400).json({ message: "Only pending announcements can be cancelled" });
      }

      await storage.updateScheduledAnnouncementStatus(id, "CANCELLED");
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Scheduled Announcement] Cancel error:", error);
      res.status(500).json({ message: "Failed to cancel scheduled announcement" });
    }
  }

  app.post("/api/leader/announcements/schedule", requireLeader, handleScheduleAnnouncement);
  app.post("/api/ministry-admin/announcements/schedule", requireMinistryAdmin, handleScheduleAnnouncement);
  app.get("/api/leader/announcements/scheduled", requireLeader, handleGetScheduledAnnouncements);
  app.get("/api/ministry-admin/announcements/scheduled", requireMinistryAdmin, handleGetScheduledAnnouncements);
  app.patch("/api/leader/announcements/scheduled/:id/cancel", requireLeader, handleCancelScheduledAnnouncement);
  app.patch("/api/ministry-admin/announcements/scheduled/:id/cancel", requireMinistryAdmin, handleCancelScheduledAnnouncement);

  // Start the reminder email scheduler
  startReminderScheduler();

  return httpServer;
}
