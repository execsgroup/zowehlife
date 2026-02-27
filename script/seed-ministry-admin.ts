/**
 * Creates a test Ministry Admin user for local development.
 * Run: npx tsx script/seed-ministry-admin.ts
 *
 * Optional env overrides (do not commit real credentials):
 *   MINISTRY_ADMIN_EMAIL=admin@example.com
 *   MINISTRY_ADMIN_PASSWORD=YourSecurePassword123!
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { storage } from "../server/storage";

const DEFAULT_EMAIL = "ministryadmin@test.com";
const DEFAULT_PASSWORD = "MinistryAdmin123!";

async function main() {
  const email = process.env.MINISTRY_ADMIN_EMAIL ?? DEFAULT_EMAIL;
  const password = process.env.MINISTRY_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  // Get or create a church for the Ministry Admin
  let churches = await storage.getChurches();
  if (churches.length === 0) {
    await storage.createChurch({
      name: "Test Ministry",
      plan: "foundations",
      subscriptionStatus: "active",
    });
    churches = await storage.getChurches();
  }
  const church = churches[0];
  if (!church) {
    throw new Error("No church available");
  }

  const existing = await storage.getUserByEmail(email);
  if (existing) {
    await storage.updateUserPassword(existing.id, passwordHash);
    console.log("Ministry Admin already exists; password has been reset.");
  } else {
    await storage.createUser({
      role: "MINISTRY_ADMIN",
      firstName: "Ministry",
      lastName: "Admin",
      email,
      passwordHash,
      churchId: church.id,
    });
    console.log("Ministry Admin user created.");
  }

  console.log("\n--- Test Ministry Admin credentials ---");
  console.log("Email:", email);
  console.log("Password: (set via MINISTRY_ADMIN_PASSWORD or dev default)");
  console.log("Ministry:", church.name);
  console.log("----------------------------------------\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
