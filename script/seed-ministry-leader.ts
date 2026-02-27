/**
 * Creates a test Ministry Leader user for local development.
 * Run: npx tsx script/seed-ministry-leader.ts
 *
 * Optional env overrides:
 *   LEADER_EMAIL=leader@example.com
 *   LEADER_PASSWORD=YourPassword123!
 *   LEADER_FIRST_NAME=Jane
 *   LEADER_LAST_NAME=Leader
 *   MINISTRY_ID=<church id>  (default: first church in DB)
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { storage } from "../server/storage";

const DEFAULT_EMAIL = "leader@test.com";
const DEFAULT_PASSWORD = "Leader123!";
const DEFAULT_FIRST_NAME = "Ministry";
const DEFAULT_LAST_NAME = "Leader";

async function main() {
  const email = process.env.LEADER_EMAIL ?? DEFAULT_EMAIL;
  const password = process.env.LEADER_PASSWORD ?? DEFAULT_PASSWORD;
  const firstName = process.env.LEADER_FIRST_NAME ?? DEFAULT_FIRST_NAME;
  const lastName = process.env.LEADER_LAST_NAME ?? DEFAULT_LAST_NAME;

  let churchId: string | undefined = process.env.MINISTRY_ID;
  if (!churchId) {
    const churches = await storage.getChurches();
    if (churches.length === 0) {
      throw new Error("No ministry (church) found. Create a ministry first (e.g. run seed-ministry-admin or register via app).");
    }
    churchId = churches[0].id;
  }

  const church = await storage.getChurch(churchId);
  if (!church) {
    throw new Error(`Ministry not found for id: ${churchId}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await storage.getUserByEmail(email);

  if (existing) {
    if (existing.role !== "LEADER") {
      throw new Error(`User ${email} exists but is not a leader (role: ${existing.role}). Use a different LEADER_EMAIL.`);
    }
    await storage.updateUserPassword(existing.id, passwordHash);
    console.log("Ministry Leader already exists; password has been reset.");
  } else {
    await storage.createUser({
      role: "LEADER",
      firstName,
      lastName,
      email,
      passwordHash,
      churchId,
    });
    console.log("Ministry Leader user created.");
  }

  console.log("\n--- Ministry Leader login credentials ---");
  console.log("Email:", email);
  console.log("Password: (set via LEADER_PASSWORD env or dev default)");
  console.log("Ministry:", church.name);
  console.log("Login URL: /login (then use Ministry Login)");
  console.log("------------------------------------------\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
