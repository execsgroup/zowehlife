#!/usr/bin/env node
/**
 * Asks which branch to push to, then runs: git push origin <branch>
 * Usage: npm run push
 */
import { createInterface } from "readline";
import { execSync } from "child_process";

const rl = createInterface({ input: process.stdin, output: process.stdout });

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function main() {
  const branch = await question("Which branch do you want to push to? (e.g. main, dev): ");
  const trimmed = branch.trim();
  if (!trimmed) {
    console.error("No branch given. Exiting.");
    rl.close();
    process.exit(1);
  }
  rl.close();
  console.log(`Pushing to origin/${trimmed}...`);
  try {
    execSync(`git push origin ${trimmed}`, { stdio: "inherit" });
  } catch (e) {
    process.exit(e.status ?? 1);
  }
}

main();
