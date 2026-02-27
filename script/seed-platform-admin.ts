/**
 * Creates a Platform Admin user for local testing.
 * Run: npm run seed:platform-admin
 *
 * Optional env overrides (do not use production credentials):
 *   PLATFORM_ADMIN_EMAIL=admin@example.com
 *   PLATFORM_ADMIN_PASSWORD=YourSecurePassword123!
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { storage } from "../server/storage";

const DEFAULT_EMAIL = "platformadmin@test.com";
const DEFAULT_PASSWORD = "PlatformAdmin123!";

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL ?? DEFAULT_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await storage.getUserByEmail(email);
  if (existing) {
    if (existing.role !== "ADMIN") {
      throw new Error(`User ${email} exists but is not a platform admin (role: ${existing.role}). Use a different email.`);
    }
    await storage.updateUserPassword(existing.id, passwordHash);
    console.log("Platform Admin already exists; password has been updated.");
  } else {
    const adminCount = await storage.getAdminCount();
    if (adminCount > 0) {
      console.log("A platform admin already exists. Creating an additional admin with the given email.");
    }
    await storage.createUser({
      role: "ADMIN",
      firstName: "Platform",
      lastName: "Admin",
      email,
      passwordHash,
      churchId: null,
    });
    console.log("Platform Admin user created.");
  }

  console.log("\n--- Platform Admin (test) credentials ---");
  console.log("Email:", email);
  if (process.env.PLATFORM_ADMIN_PASSWORD) {
    console.log("Password: (from PLATFORM_ADMIN_PASSWORD)");
  } else {
    console.log("Password:", DEFAULT_PASSWORD);
  }
  console.log("Login: /login → use 'Ministry Login' or admin login, then this email/password");
  console.log("------------------------------------------\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
