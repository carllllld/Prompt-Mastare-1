-- Migration: Add form_templates table
-- Date: 2026-04-02
-- Description: Adds template system for saving and reusing form data

-- Create form_templates table
CREATE TABLE IF NOT EXISTS form_templates (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  used_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT form_templates_user_name_unique UNIQUE(user_id, name)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_form_templates_user_id ON form_templates(user_id);

-- Create index for faster name lookups
CREATE INDEX IF NOT EXISTS idx_form_templates_name ON form_templates(name);

-- Create index for most used templates
CREATE INDEX IF NOT EXISTS idx_form_templates_used_count ON form_templates(used_count DESC);

-- Add comment
COMMENT ON TABLE form_templates IS 'Stores reusable form templates for users to save BRF info, location descriptions, etc.';
COMMENT ON COLUMN form_templates.template_data IS 'JSONB object containing all form field values';
COMMENT ON COLUMN form_templates.used_count IS 'Number of times this template has been used';
