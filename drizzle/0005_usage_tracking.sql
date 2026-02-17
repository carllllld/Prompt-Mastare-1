-- Create usage tracking table for monthly limits and feature access
CREATE TABLE IF NOT EXISTS usage_tracking (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    month TEXT NOT NULL, -- Format: '2024-02'
    year INTEGER NOT NULL,
    texts_generated INTEGER DEFAULT 0,
    area_searches_used INTEGER DEFAULT 0,
    text_edits_used INTEGER DEFAULT 0,
    personal_style_analyses INTEGER DEFAULT 0,
    plan_type TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, month, year)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_plan ON usage_tracking(plan_type);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_usage_tracking_updated_at 
    BEFORE UPDATE ON usage_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update users table to ensure plan_type field exists and has proper constraints
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS check_plan_type 
    CHECK (plan_type IN ('free', 'pro', 'premium'));

-- Create function to get or create monthly usage record
CREATE OR REPLACE FUNCTION get_monthly_usage(user_uuid TEXT, target_month TEXT, target_year INTEGER)
RETURNS TABLE (
    texts_generated INTEGER,
    area_searches_used INTEGER,
    text_edits_used INTEGER,
    personal_style_analyses INTEGER,
    plan_type TEXT,
    remaining_texts INTEGER
) AS $$
DECLARE
    usage_record RECORD;
    user_plan TEXT;
    max_texts INTEGER;
BEGIN
    -- Get user's current plan
    SELECT plan_type INTO user_plan FROM users WHERE id = user_uuid;
    
    -- Set max texts based on plan
    CASE user_plan
        WHEN 'free' THEN max_texts := 3;
        WHEN 'pro' THEN max_texts := 10;
        WHEN 'premium' THEN max_texts := 999999; -- Unlimited
        ELSE max_texts := 3;
    END CASE;
    
    -- Get or create usage record
    SELECT * INTO usage_record 
    FROM usage_tracking 
    WHERE user_id = user_uuid AND month = target_month AND year = target_year;
    
    IF NOT FOUND THEN
        INSERT INTO usage_tracking (user_id, month, year, plan_type)
        VALUES (user_uuid, target_month, target_year, user_plan)
        RETURNING * INTO usage_record;
    END IF;
    
    -- Return results
    RETURN QUERY SELECT 
        usage_record.texts_generated,
        usage_record.area_searches_used,
        usage_record.text_edits_used,
        usage_record.personal_style_analyses,
        usage_record.plan_type,
        GREATEST(0, max_texts - usage_record.texts_generated);
END;
$$ LANGUAGE plpgsql;
