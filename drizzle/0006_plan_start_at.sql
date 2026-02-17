-- Add plan_start_at column to users table for proper monthly billing cycles
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_start_at TIMESTAMP DEFAULT NOW();

-- Update existing users to set plan_start_at to their creation date
UPDATE users SET plan_start_at = created_at WHERE plan_start_at IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_plan_start_at ON users(plan_start_at);
