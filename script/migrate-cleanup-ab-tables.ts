/**
 * Migration: Remove dead A/B test experiment tables
 *
 * Drops experiment_results and experiment_assignments tables which were
 * created for the old A/B testing infrastructure and are no longer used.
 *
 * Run with: npx tsx script/migrate-cleanup-ab-tables.ts
 *
 * Safe to run multiple times (uses IF EXISTS).
 */

import { Pool } from "pg";

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("Starting A/B table cleanup migration...");

    await client.query("BEGIN");

    // Back up row counts before dropping
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'experiment_results') AS results_exists,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'experiment_assignments') AS assignments_exists
    `);

    const resultsExists = counts.rows[0].results_exists === "1";
    const assignmentsExists = counts.rows[0].assignments_exists === "1";

    if (resultsExists) {
      const { rows } = await client.query("SELECT COUNT(*) AS n FROM experiment_results");
      console.log(`experiment_results: ${rows[0].n} rows — dropping`);
      await client.query("DROP TABLE IF EXISTS experiment_results CASCADE");
    } else {
      console.log("experiment_results: does not exist, skipping");
    }

    if (assignmentsExists) {
      const { rows } = await client.query("SELECT COUNT(*) AS n FROM experiment_assignments");
      console.log(`experiment_assignments: ${rows[0].n} rows — dropping`);
      await client.query("DROP TABLE IF EXISTS experiment_assignments CASCADE");
    } else {
      console.log("experiment_assignments: does not exist, skipping");
    }

    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
