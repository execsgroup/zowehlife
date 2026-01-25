import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import {
  insertChurchSchema,
  insertPrayerRequestSchema,
  loginSchema,
  adminSetupSchema,
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

  // ==================== AUTH ROUTES ====================

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
          const leaders = await storage.getLeadersByChurch(church.id);
          const convertsList = await storage.getConvertsByChurch(church.id);
          return {
            ...church,
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

      // Build CSV
      const headers = ["First Name", "Last Name", "Phone", "Email", "Status", "Created At"];
      const rows = convertsList.map((c) => [
        c.firstName,
        c.lastName,
        c.phone || "",
        c.email || "",
        c.status,
        new Date(c.createdAt).toISOString(),
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=converts.csv");
      res.send(csv);
    } catch (error) {
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

      res.status(201).json(checkin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create checkin" });
    }
  });

  return httpServer;
}
