/**
 * One-off migration: create messaging_automation_config and automation_sent_log tables.
 * Run: npx tsx script/migrate-messaging-tables.ts
 */
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  const pool = new Pool({ connectionString });

  try {
    // Create enum if not exists (PostgreSQL doesn't have CREATE TYPE IF NOT EXISTS, so we use DO block)
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE messaging_automation_category AS ENUM ('convert', 'member', 'new_member_guest');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("Enum messaging_automation_category ready");

    // Create messaging_automation_config if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messaging_automation_config (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        church_id varchar NOT NULL REFERENCES churches(id),
        category messaging_automation_category NOT NULL,
        enabled text NOT NULL DEFAULT 'false',
        cutoff_time text,
        delay_hours_same_day integer,
        next_day_send_time text,
        send_email text NOT NULL DEFAULT 'true',
        send_sms text NOT NULL DEFAULT 'false',
        email_subject text,
        email_body text,
        sms_body text,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("Table messaging_automation_config ready");

    // Create automation_sent_log if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automation_sent_log (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        church_id varchar NOT NULL REFERENCES churches(id),
        entity_type messaging_automation_category NOT NULL,
        entity_id varchar NOT NULL,
        sent_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("Table automation_sent_log ready");

    console.log("Migration completed successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
