#!/usr/bin/env node
/**
 * Exits with error if .env or .env.* (except .env.example) are staged for commit.
 * Run before committing: npm run check:no-env
 */
import { execSync } from "child_process";
const staged = execSync("git diff --cached --name-only", { encoding: "utf8" })
  .trim()
  .split(/\n/)
  .filter(Boolean);
const bad = staged.filter(
  (f) => f === ".env" || (f.startsWith(".env.") && f !== ".env.example")
);
if (bad.length > 0) {
  console.error("Do not commit secret files:", bad.join(", "));
  process.exit(1);
}
