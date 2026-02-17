-- Create personal_styles table for user writing style analysis
CREATE TABLE IF NOT EXISTS personal_styles (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    reference_texts JSONB NOT NULL,
    style_profile JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    team_shared BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_styles_user_id ON personal_styles(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_styles_active ON personal_styles(user_id, is_active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_personal_styles_updated_at 
    BEFORE UPDATE ON personal_styles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
