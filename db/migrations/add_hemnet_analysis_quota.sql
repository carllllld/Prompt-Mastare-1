-- Migration: Add Hemnet analysis quota tracking
-- Date: 2026-03-28
-- Description: Adds hemnet_analyses_used column to usage_tracking table

-- Add column with default value
ALTER TABLE usage_tracking
ADD COLUMN IF NOT EXISTS hemnet_analyses_used INTEGER DEFAULT 0 NOT NULL;

-- Update existing rows to have 0 analyses used
UPDATE usage_tracking
SET hemnet_analyses_used = 0
WHERE hemnet_analyses_used IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN usage_tracking.hemnet_analyses_used IS 'Number of Hemnet text analyses performed this month';
