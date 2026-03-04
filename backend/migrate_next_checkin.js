// backend/migrate_next_checkin.js
// Run this script once to:
//   1. Add the `next_checkin_date` column if it doesn't exist
//   2. Create an index on the new column
//   3. Backfill all existing contacts with a calculated value

require("dotenv").config();
const { Pool } = require("pg");

const isDevelopment = process.env.NODE_ENV === "development";
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ...(!isDevelopment && { ssl: { rejectUnauthorized: false } }),
};

const pool = new Pool(dbConfig);

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting migration: next_checkin_date...");

    // Step 1: Add the column
    await client.query(`
      ALTER TABLE contacts
      ADD COLUMN IF NOT EXISTS next_checkin_date TIMESTAMPTZ;
    `);
    console.log("  ✓ Column 'next_checkin_date' added (or already exists).");

    // Step 2: Create the index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_next_checkin
      ON contacts(next_checkin_date);
    `);
    console.log("  ✓ Index 'idx_contacts_next_checkin' created (or already exists).");

    // Step 3: Backfill existing contacts
    // Logic: If snoozed and snooze is in the future, use snooze_until.
    //        Otherwise, calculate last_checkin + checkin_frequency days.
    const result = await client.query(`
      UPDATE contacts
      SET next_checkin_date = CASE
        WHEN snooze_until IS NOT NULL AND snooze_until > NOW()
          THEN snooze_until
        ELSE last_checkin + (checkin_frequency * INTERVAL '1 day')
      END
      WHERE next_checkin_date IS NULL;
    `);
    console.log(`  ✓ Backfilled ${result.rowCount} contacts with next_checkin_date.`);

    console.log("\nMigration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
