-- Migration: Add integration_settings table for per-user Vitec credentials
-- Date: 2026-03-28

CREATE TABLE IF NOT EXISTS integration_settings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vitec_api_key TEXT,
  vitec_customer_id TEXT,
  vitec_base_url TEXT,
  vitec_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integration_settings_user_id ON integration_settings(user_id);

-- Add comment
COMMENT ON TABLE integration_settings IS 'Stores per-user integration credentials (Vitec API keys, etc.)';
