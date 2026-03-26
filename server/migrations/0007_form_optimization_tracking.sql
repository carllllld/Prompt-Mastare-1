-- Form Optimization Tracking Schema
-- Migration to add tables for tracking form field metadata, chip usage statistics, and optimization runs

-- Table for tracking form field metadata and impact analysis
CREATE TABLE IF NOT EXISTS form_field_metadata (
  id SERIAL PRIMARY KEY,
  field_name VARCHAR(255) NOT NULL UNIQUE,
  field_category VARCHAR(100), -- 'basic', 'kitchen', 'bathroom', 'location', etc.
  data_type VARCHAR(50), -- 'string', 'number', 'boolean', 'array'
  is_required BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  platform VARCHAR(20), -- 'hemnet', 'booli', 'both', 'general'

  -- Impact analysis metrics
  fill_rate DECIMAL(5,4), -- percentage of submissions where field is filled (0-1)
  appearance_rate DECIMAL(5,4), -- percentage of texts where field data appears (0-1)
  quality_correlation DECIMAL(5,4), -- correlation with quality scores (-1 to 1)
  impact_score DECIMAL(5,4), -- composite score (0-100)
  priority_level VARCHAR(20), -- 'critical', 'important', 'optional', 'low'

  -- Usage tracking
  total_submissions INTEGER DEFAULT 0,
  filled_submissions INTEGER DEFAULT 0,
  avg_quality_impact DECIMAL(5,4),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_analyzed_at TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_fill_rate CHECK (fill_rate >= 0 AND fill_rate <= 1),
  CONSTRAINT valid_appearance_rate CHECK (appearance_rate >= 0 AND appearance_rate <= 1),
  CONSTRAINT valid_impact_score CHECK (impact_score >= 0 AND impact_score <= 100)
);

-- Table for tracking chip usage statistics
CREATE TABLE IF NOT EXISTS chip_usage_stats (
  id SERIAL PRIMARY KEY,
  chip_label VARCHAR(255) NOT NULL,
  chip_category VARCHAR(100) NOT NULL, -- 'kitchen', 'bathroom', 'flooring', etc.
  chip_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'premium', 'deprecated'

  -- Usage metrics
  selection_count INTEGER DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  selection_rate DECIMAL(5,4), -- percentage of submissions where chip is selected (0-1)

  -- Quality impact
  appears_in_generated_text BOOLEAN DEFAULT false,
  avg_quality_impact DECIMAL(5,4),
  text_appearance_count INTEGER DEFAULT 0,

  -- Status and recommendations
  is_recommended BOOLEAN DEFAULT true,
  replacement_suggestion VARCHAR(255), -- suggested replacement chip if deprecated
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_analyzed_at TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_selection_rate CHECK (selection_rate >= 0 AND selection_rate <= 1),
  CONSTRAINT unique_chip_category UNIQUE (chip_label, chip_category)
);

-- Table for tracking form optimization analysis runs
CREATE TABLE IF NOT EXISTS form_optimization_runs (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(100) NOT NULL UNIQUE, -- UUID or timestamp-based identifier
  run_type VARCHAR(50) NOT NULL, -- 'full_analysis', 'chip_only', 'field_only', 'impact_only'

  -- Run parameters
  submissions_analyzed INTEGER NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  platforms_included TEXT[], -- array of platforms analyzed

  -- Results summary
  total_fields_analyzed INTEGER DEFAULT 0,
  fields_with_impact_data INTEGER DEFAULT 0,
  chips_analyzed INTEGER DEFAULT 0,
  recommendations_generated INTEGER DEFAULT 0,

  -- Key findings
  high_impact_fields TEXT[], -- array of field names
  low_impact_fields TEXT[], -- array of field names
  recommended_chip_additions TEXT[], -- array of chip labels
  recommended_chip_removals TEXT[], -- array of chip labels
  redundant_fields_identified TEXT[], -- array of field names

  -- Performance metrics
  analysis_duration_ms INTEGER,
  memory_usage_mb DECIMAL(10,2),

  -- Status and output
  status VARCHAR(20) DEFAULT 'completed', -- 'running', 'completed', 'failed'
  error_message TEXT,
  report_path VARCHAR(500), -- path to generated JSON report
  summary_notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_by VARCHAR(100), -- user or system that initiated the run

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('running', 'completed', 'failed')),
  CONSTRAINT valid_run_type CHECK (run_type IN ('full_analysis', 'chip_only', 'field_only', 'impact_only'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_field_metadata_category ON form_field_metadata(field_category);
CREATE INDEX IF NOT EXISTS idx_form_field_metadata_priority ON form_field_metadata(priority_level);
CREATE INDEX IF NOT EXISTS idx_form_field_metadata_impact ON form_field_metadata(impact_score DESC);

CREATE INDEX IF NOT EXISTS idx_chip_usage_stats_category ON chip_usage_stats(chip_category);
CREATE INDEX IF NOT EXISTS idx_chip_usage_stats_rate ON chip_usage_stats(selection_rate DESC);
CREATE INDEX IF NOT EXISTS idx_chip_usage_stats_recommended ON chip_usage_stats(is_recommended);

CREATE INDEX IF NOT EXISTS idx_form_optimization_runs_type ON form_optimization_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_form_optimization_runs_status ON form_optimization_runs(status);
CREATE INDEX IF NOT EXISTS idx_form_optimization_runs_created ON form_optimization_runs(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE form_field_metadata IS 'Tracks form field metadata, usage statistics, and quality impact analysis';
COMMENT ON TABLE chip_usage_stats IS 'Tracks chip selection statistics and recommendations for optimization';
COMMENT ON TABLE form_optimization_runs IS 'Records form optimization analysis runs and their results';

COMMENT ON COLUMN form_field_metadata.impact_score IS 'Composite score (0-100) combining fill rate, appearance rate, and quality correlation';
COMMENT ON COLUMN chip_usage_stats.selection_rate IS 'Percentage of form submissions where this chip is selected (0-1)';
COMMENT ON COLUMN form_optimization_runs.run_id IS 'Unique identifier for the analysis run, used for report lookup';