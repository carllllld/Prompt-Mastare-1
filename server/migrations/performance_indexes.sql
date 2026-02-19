-- Performance indexes for OptiPrompt Mäklare
-- These indexes improve query performance for common operations

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);

-- Optimizations table indexes
CREATE INDEX IF NOT EXISTS idx_optimizations_user_created ON optimizations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_optimizations_created_at ON optimizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_optimizations_category ON optimizations(category);

-- Usage tracking table indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month_year ON usage_tracking(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created_at ON usage_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_plan_type ON usage_tracking(plan_type);

-- Personal styles table indexes
CREATE INDEX IF NOT EXISTS idx_personal_styles_user_active ON personal_styles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_personal_styles_team_shared ON personal_styles(team_shared);
CREATE INDEX IF NOT EXISTS idx_personal_styles_created_at ON personal_styles(created_at DESC);

-- Teams table indexes
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams(created_at DESC);

-- Team members table indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- Session table indexes (if not already created by connect-pg-simple)
CREATE INDEX IF NOT EXISTS idx_session_sid ON session(sid);
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(sess->>'userId');

-- Email rate limits table indexes
CREATE INDEX IF NOT EXISTS idx_email_rate_limits_email_type ON email_rate_limits(email, email_type);
CREATE INDEX IF NOT EXISTS idx_email_rate_limits_created_at ON email_rate_limits(created_at DESC);

-- User sessions table indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at DESC);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_optimizations_user_category_created ON optimizations(user_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_plan_created ON usage_tracking(user_id, plan_type, created_at DESC);

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE optimizations;
ANALYZE usage_tracking;
ANALYZE personal_styles;
ANALYZE teams;
ANALYZE team_members;
ANALYZE session;
ANALYZE email_rate_limits;
ANALYZE user_sessions;
