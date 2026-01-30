import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { sendFollowUpNotification, sendFollowUpReminderEmail, sendAccountApprovalEmail, sendAccountDenialEmail } from "./email";
import { startReminderScheduler } from "./scheduler";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import {
  insertChurchSchema,
  insertPrayerRequestSchema,
  insertAccountRequestSchema,
  loginSchema,
  adminSetupSchema,
  publicConvertSubmissionSchema,
} from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: string;
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

// Middleware to check leader role
async function requireLeader(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "LEADER") {
    return res.status(403).json({ message: "Forbidden - Leader access required" });
  }

  if (!user.churchId) {
    return res.status(403).json({ message: "Leader not assigned to a church" });
  }

  (req as any).user = user;
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

      // Verify setup key
      if (data.setupKey !== process.env.ADMIN_SETUP_KEY) {
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
        fullName: data.fullName,
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
      
      res.json({ id: church.id, name: church.name, logoUrl: church.logoUrl });
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
      });
      
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

      const request = await storage.createAccountRequest(data);
      res.status(201).json({ message: "Account request submitted successfully. You will be notified once reviewed." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to submit account request" });
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
        fullName: z.string().min(2),
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
        fullName: data.fullName,
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
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
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
        sendFollowUpNotification({
          convertName: `${convert.firstName} ${convert.lastName}`,
          convertEmail: convert.email || undefined,
          leaderName: user.fullName,
          leaderEmail: user.email,
          churchName: church?.name || "Ministry",
          followUpDate: data.nextFollowupDate,
          notes: data.notes || undefined,
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
        status: z.enum(["NEW", "ACTIVE", "IN_PROGRESS", "CONNECTED", "INACTIVE"]).optional(),
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

      // Build data for Excel
      const data = convertsWithChurch.map((c) => ({
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
        "Status": c.status,
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
      const finalName = editedData.fullName;
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
        fullName: finalName,
        email: finalEmail,
        phone: finalPhone,
        churchName: finalChurchName,
        reason: finalReason,
      });

      // Find or create the church
      const { church, created: churchCreated } = await storage.findOrCreateChurch(finalChurchName);

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Create the leader account
      const newLeader = await storage.createUser({
        role: "LEADER",
        fullName: finalName,
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
        leaderName: finalName,
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
        applicantName: request.fullName,
        applicantEmail: request.email,
      });

      res.json({ message: "Account request denied" });
    } catch (error) {
      console.error("Failed to deny account request:", error);
      res.status(500).json({ message: "Failed to deny account request" });
    }
  });

  // ==================== LEADER ROUTES ====================

  // Leader stats
  app.get("/api/leader/stats", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const stats = await storage.getLeaderStats(user.churchId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

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
      res.json(convertsList);
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

      // Build data for Excel
      const data = convertsList.map((c) => ({
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
        "Status": c.status,
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

  // Export leader's follow-ups as Excel
  app.get("/api/leader/followups/export-excel", requireLeader, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const user = (req as any).user;

      // Use the same data source as the follow-ups page
      const followupsWithDetails = await storage.getUpcomingFollowups(user.churchId);

      // Build data for Excel
      const data = followupsWithDetails.map((f) => ({
        "Convert Name": `${f.convertFirstName} ${f.convertLastName}`,
        "Phone": f.convertPhone || "",
        "Email": f.convertEmail || "",
        "Follow-up Date": f.nextFollowupDate || "",
        "Notes": f.notes || "",
      }));

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

      res.json({ ...convert, checkins: checkinsList });
    } catch (error) {
      res.status(500).json({ message: "Failed to get convert" });
    }
  });

  // Get upcoming follow-ups
  app.get("/api/leader/followups", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;
      const followups = await storage.getUpcomingFollowups(user.churchId);
      res.json(followups);
    } catch (error) {
      res.status(500).json({ message: "Failed to get follow-ups" });
    }
  });

  // Create convert
  app.post("/api/leader/converts", requireLeader, async (req, res) => {
    try {
      const user = (req as any).user;

      const schema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        summaryNotes: z.string().optional(),
        status: z.enum(["NEW", "ACTIVE", "IN_PROGRESS", "CONNECTED", "INACTIVE"]),
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

      res.status(201).json(convert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create convert" });
    }
  });

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
        status: z.enum(["NEW", "ACTIVE", "IN_PROGRESS", "CONNECTED", "INACTIVE"]).optional(),
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
        customLeaderSubject: z.string().optional(),
        customLeaderMessage: z.string().optional(),
        customConvertSubject: z.string().optional(),
        customConvertMessage: z.string().optional(),
        includeVideoLink: z.boolean().optional(),
      });

      const data = schema.parse(req.body);

      // Fetch church info for video link and email
      const church = await storage.getChurch(user.churchId);

      // Generate video call link if requested
      let videoCallLink: string | undefined;
      if (data.includeVideoLink) {
        const sanitizedMinistry = (church?.name || 'zoweh').toLowerCase().replace(/[^a-z0-9]/g, '');
        const roomName = `${sanitizedMinistry}-${convert.firstName.toLowerCase()}-${convert.lastName.toLowerCase()}-${Date.now()}`.replace(/[^a-z0-9-]/g, '');
        videoCallLink = `https://meet.jit.si/${roomName}`;
      }

      // Create a checkin record to track the scheduled follow-up
      const checkin = await storage.createCheckin({
        convertId,
        churchId: user.churchId,
        createdByUserId: user.id,
        checkinDate: new Date().toISOString().split('T')[0],
        notes: `Follow-up scheduled for ${data.nextFollowupDate}`,
        outcome: "SCHEDULED_VISIT",
        nextFollowupDate: data.nextFollowupDate,
        videoLink: videoCallLink || null,
      });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "CHECKIN",
        entityId: checkin.id,
      });

      // Send follow-up notification emails
      console.log(`Sending follow-up emails to leader: ${user.email}, convert: ${convert.email || 'N/A'}`);
      sendFollowUpNotification({
        convertName: `${convert.firstName} ${convert.lastName}`,
        convertEmail: convert.email || undefined,
        leaderName: user.fullName,
        leaderEmail: user.email,
        churchName: church?.name || "Ministry",
        followUpDate: data.nextFollowupDate,
        notes: videoCallLink ? `Video Call Link: ${videoCallLink}` : undefined,
        customLeaderMessage: data.customLeaderMessage || undefined,
        customConvertMessage: data.customConvertMessage || undefined,
        customLeaderSubject: data.customLeaderSubject || undefined,
        customConvertSubject: data.customConvertSubject || undefined,
        videoCallLink,
      }).then(result => {
        console.log(`Follow-up email result:`, result);
      }).catch(err => console.error("Email notification failed:", err));

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
        outcome: z.enum(["CONNECTED", "NO_RESPONSE", "NEEDS_PRAYER", "SCHEDULED_VISIT", "REFERRED", "OTHER"]),
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

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "CHECKIN",
        entityId: checkin.id,
      });

      if (data.nextFollowupDate) {
        const church = await storage.getChurch(user.churchId);
        sendFollowUpNotification({
          convertName: `${convert.firstName} ${convert.lastName}`,
          convertEmail: convert.email || undefined,
          leaderName: user.fullName,
          leaderEmail: user.email,
          churchName: church?.name || "Ministry",
          followUpDate: data.nextFollowupDate,
          notes: data.notes || undefined,
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

  // Start the reminder email scheduler
  startReminderScheduler();

  return httpServer;
}
