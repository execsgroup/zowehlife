/**
 * Creates a test Ministry Admin user for local development.
 * Run: npx tsx script/seed-ministry-admin.ts
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { storage } from "../server/storage";

const TEST_EMAIL = "ministryadmin@test.com";
const TEST_PASSWORD = "MinistryAdmin123!";

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

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

  const existing = await storage.getUserByEmail(TEST_EMAIL);
  if (existing) {
    await storage.updateUserPassword(existing.id, passwordHash);
    console.log("Ministry Admin already exists; password has been reset.");
  } else {
    await storage.createUser({
      role: "MINISTRY_ADMIN",
      firstName: "Ministry",
      lastName: "Admin",
      email: TEST_EMAIL,
      passwordHash,
      churchId: church.id,
    });
    console.log("Ministry Admin user created.");
  }

  console.log("\n--- Test Ministry Admin credentials ---");
  console.log("Email:", TEST_EMAIL);
  console.log("Password:", TEST_PASSWORD);
  console.log("Ministry:", church.name);
  console.log("----------------------------------------\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
