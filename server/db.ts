import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use SSL for external databases (Render, etc.) - detect by checking if DATABASE_URL contains common cloud hosts
const databaseUrl = process.env.DATABASE_URL;
const needsSSL = databaseUrl.includes('render.com') ||
  databaseUrl.includes('neon.tech') ||
  databaseUrl.includes('supabase.co') ||
  databaseUrl.includes('railway.app') ||
  process.env.DATABASE_SSL === 'true';

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

// Initialize database tables that may not exist
export async function initializeDatabase() {
  try {
    // Create session_usage table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_usage (
        session_id VARCHAR PRIMARY KEY,
        prompts_used_today INTEGER NOT NULL DEFAULT 0,
        last_reset_date DATE DEFAULT CURRENT_DATE
      )
    `);

    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plan TEXT DEFAULT 'free',
        prompts_used_today INTEGER DEFAULT 0,
        last_reset_date DATE DEFAULT CURRENT_DATE,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        email_verified BOOLEAN DEFAULT false,
        verification_token TEXT,
        verification_token_expires TIMESTAMP
      )
    `);

    // Add email verification columns if they don't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS verification_token TEXT,
      ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP
    `);

    // Add profile columns if they don't exist
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS display_name VARCHAR,
      ADD COLUMN IF NOT EXISTS avatar_color VARCHAR
    `);

    // Add missing columns for fresh deployments
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS plan_start_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
      ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);

    // Create email rate limits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_rate_limits (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        email_type TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create optimizations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS optimizations (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        original_prompt TEXT NOT NULL,
        improved_prompt TEXT NOT NULL,
        category TEXT NOT NULL,
        improvements JSONB NOT NULL,
        suggestions JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Performance indexes for frequently queried columns
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_stripe_sub ON users (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users (verification_token) WHERE verification_token IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users (password_reset_token) WHERE password_reset_token IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_rate_limits_lookup ON email_rate_limits (email, email_type, sent_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_optimizations_user_id ON optimizations (user_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members (user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members (team_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_presence_sessions_user ON presence_sessions (user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_shared_prompts_team ON shared_prompts (team_id, updated_at DESC)`);

    // Create pipeline_metrics table for tracking generation quality over time
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_metrics (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        session_id TEXT,
        platform TEXT,
        plan TEXT,
        style TEXT,
        input_signal_coverage NUMERIC,
        quality_score NUMERIC,
        word_count INTEGER,
        violation_count INTEGER,
        generation_time_ms INTEGER,
        steps_completed INTEGER,
        fallback_triggered BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create experiment_assignments table for A/B testing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS experiment_assignments (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        experiment_id TEXT NOT NULL,
        variant TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create experiment_results table for A/B test outcome tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS experiment_results (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        experiment_id TEXT NOT NULL,
        variant TEXT NOT NULL,
        metric TEXT NOT NULL,
        value NUMERIC,
        recorded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_user ON pipeline_metrics (user_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON experiment_assignments (user_id, experiment_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_experiment_results_experiment ON experiment_results (experiment_id, variant)`);

    console.log("Database tables initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}
