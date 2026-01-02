import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
        stripe_subscription_id TEXT
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
