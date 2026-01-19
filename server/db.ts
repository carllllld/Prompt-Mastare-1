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
    // Create user_sessions table for connect-pg-simple (needed in production)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        CONSTRAINT user_sessions_pkey PRIMARY KEY (sid)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS IDX_user_sessions_expire ON user_sessions (expire)
    `);
    
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
    
    console.log("Database tables initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}
