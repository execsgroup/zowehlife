/**
 * Delete a user account by email so the email can be reused (e.g. as ministry admin).
 * Run: npx tsx script/delete-user-by-email.ts deprinc3@gmail.com
 * Or:  DELETE_USER_EMAIL=deprinc3@gmail.com npx tsx script/delete-user-by-email.ts
 */
import "dotenv/config";
import { storage } from "../server/storage";

const EMAIL = process.env.DELETE_USER_EMAIL ?? process.argv[2];

async function main() {
  if (!EMAIL) {
    console.error("Usage: npx tsx script/delete-user-by-email.ts <email>");
    console.error("   or: DELETE_USER_EMAIL=... npx tsx script/delete-user-by-email.ts");
    process.exit(1);
  }

  const deleted = await storage.deleteUserByEmail(EMAIL);
  if (deleted) {
    console.log(`User account ${EMAIL} has been deleted. The email can be reused.`);
  } else {
    console.log(`No user found with email ${EMAIL}.`);
  }
  process.exit(deleted ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
