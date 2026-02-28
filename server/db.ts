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

    console.log("Database tables initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}
