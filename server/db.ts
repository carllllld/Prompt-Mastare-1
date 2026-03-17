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
        run_id TEXT NOT NULL,
        user_id TEXT REFERENCES users(id) NOT NULL,
        plan TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        total_duration_ms INTEGER NOT NULL,
        total_ai_calls INTEGER NOT NULL,
        total_tokens_used INTEGER,
        total_cost_usd TEXT,
        final_quality_score INTEGER,
        final_word_count INTEGER,
        rescue_attempts INTEGER NOT NULL DEFAULT 0,
        polish_attempts INTEGER NOT NULL DEFAULT 0,
        fast_path_taken BOOLEAN NOT NULL DEFAULT false,
        structured_data_used BOOLEAN NOT NULL DEFAULT false,
        features_used JSONB NOT NULL DEFAULT '[]',
        error_count INTEGER NOT NULL DEFAULT 0,
        steps JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migrate existing pipeline_metrics table — add any missing columns from schema updates
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS run_id TEXT`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS success BOOLEAN`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS total_duration_ms INTEGER`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS total_ai_calls INTEGER`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS total_cost_usd TEXT`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS final_quality_score INTEGER`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS final_word_count INTEGER`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS rescue_attempts INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS polish_attempts INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS fast_path_taken BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS structured_data_used BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS features_used JSONB DEFAULT '[]'`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE pipeline_metrics ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'`);
    // Remove old columns that no longer exist in schema (ignore errors if they don't exist)
    try { await pool.query(`ALTER TABLE pipeline_metrics DROP COLUMN IF EXISTS session_id`); } catch {}
    try { await pool.query(`ALTER TABLE pipeline_metrics DROP COLUMN IF EXISTS platform`); } catch {}
    try { await pool.query(`ALTER TABLE pipeline_metrics DROP COLUMN IF EXISTS style`); } catch {}
    try { await pool.query(`ALTER TABLE pipeline_metrics DROP COLUMN IF EXISTS input_signal_coverage`); } catch {}
    try { await pool.query(`ALTER TABLE pipeline_metrics DROP COLUMN IF EXISTS quality_score`); } catch {}
    try { await pool.query(`ALTER TABLE pipeline_metrics DROP COLUMN IF EXISTS word_count`); } catch {}
    try { await pool.query(`ALTER TABLE pipeline_metrics DROP COLUMN IF EXISTS violation_count`); } catch {}
    try { await pool.query(`ALTER TABLE pipeline_metrics DROP COLUMN IF EXISTS generation_time_ms`); } catch {}
    try { await pool.query(`ALTER TABLE pipeline_metrics DROP COLUMN IF EXISTS steps_completed`); } catch {}
    try { await pool.query(`ALTER TABLE pipeline_metrics DROP COLUMN IF EXISTS fallback_triggered`); } catch {}

    // Create experiment_assignments table for A/B testing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS experiment_assignments (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id) NOT NULL,
        experiment_id TEXT NOT NULL,
        variant_id TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, experiment_id)
      )
    `);

    // Create experiment_results table for A/B test outcome tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS experiment_results (
        id SERIAL PRIMARY KEY,
        experiment_id TEXT NOT NULL,
        variant_id TEXT NOT NULL,
        user_id TEXT REFERENCES users(id) NOT NULL,
        metrics JSONB NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
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
