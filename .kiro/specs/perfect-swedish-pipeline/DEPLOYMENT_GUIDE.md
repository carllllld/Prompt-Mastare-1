# Perfect Swedish Pipeline - Deployment Guide

**Version:** 1.0  
**Last Updated:** 2026-01-20  
**Target Platform:** Render (Web Service + PostgreSQL + Redis)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Migration](#database-migration)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Deployment Verification](#post-deployment-verification)

---

## Pre-Deployment Checklist

### Code Readiness
- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compilation successful (`npm run check`)
- [ ] No critical Sentry errors in last 24 hours
- [ ] Code review completed and approved
- [ ] Feature branch merged to `main`

### Infrastructure Readiness
- [ ] Database backup completed
- [ ] Redis cache cleared (optional, for clean start)
- [ ] Sentry configured and receiving events
- [ ] Environment variables documented
- [ ] Rollback plan reviewed

### Team Readiness
- [ ] Deployment window scheduled (low-traffic period recommended)
- [ ] Team notified of deployment
- [ ] On-call engineer assigned
- [ ] Monitoring dashboard accessible

---

## Environment Configuration

### Required Environment Variables

```bash
# Existing (already configured)
DATABASE_URL=postgresql://user:password@host:5432/database
OPENAI_API_KEY=sk-...
REDIS_URL=redis://host:6379
SENTRY_DSN=https://...@sentry.io/...
SESSION_SECRET=your-session-secret
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...

# New (Perfect Swedish Pipeline)
PERFECT_SWEDISH_PIPELINE_ENABLED=true
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=50
NODE_ENV=production
```

### Environment Variable Details

#### `PERFECT_SWEDISH_PIPELINE_ENABLED`
- **Type:** Boolean (`true` | `false`)
- **Default:** `true`
- **Purpose:** Master switch for new pipeline
- **Usage:** Set to `false` to disable new pipeline entirely

#### `PERFECT_SWEDISH_PIPELINE_PERCENTAGE`
- **Type:** Number (0-100)
- **Default:** `50`
- **Purpose:** Percentage of users assigned to treatment group
- **Usage:** 
  - `0` = All users get old pipeline
  - `50` = 50/50 split
  - `100` = All users get new pipeline

#### `NODE_ENV`
- **Type:** String (`development` | `production`)
- **Default:** `development`
- **Purpose:** Enables production features (scheduler, monitoring)
- **Usage:** Must be `production` for automated health checks

### Setting Environment Variables in Render

1. Navigate to your Web Service in Render dashboard
2. Go to **Environment** tab
3. Add new environment variables:
   ```
   PERFECT_SWEDISH_PIPELINE_ENABLED = true
   PERFECT_SWEDISH_PIPELINE_PERCENTAGE = 10
   ```
4. Click **Save Changes**
5. Render will automatically redeploy

---

## Database Migration

### New Tables

The Perfect Swedish Pipeline requires 5 new database tables:

1. `pipeline_generations` - Track all generation attempts
2. `ab_test_assignments` - Session-consistent variant assignments
3. `pipeline_metrics_v2` - Aggregated daily metrics
4. `user_feedback` - User satisfaction tracking
5. `expert_feedback_items` - Detailed feedback analytics

### Migration Steps

#### Option 1: Automatic Migration (Recommended)

The tables are created automatically on first deployment via `server/db.ts`:

```bash
# Deploy to Render
git push origin main

# Render will:
# 1. Build the application
# 2. Run database migrations automatically
# 3. Start the server
```

#### Option 2: Manual Migration

If you prefer manual control:

```bash
# Connect to production database
psql $DATABASE_URL

# Run migration SQL (from server/db.ts)
-- See "Database Schema SQL" section below
```

### Database Schema SQL

```sql
-- 1. Pipeline Generations Table
CREATE TABLE IF NOT EXISTS pipeline_generations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('control', 'treatment')),
  
  disposition JSONB NOT NULL,
  style TEXT NOT NULL,
  platform TEXT NOT NULL,
  personal_style_prompt TEXT,
  target_word_min INTEGER NOT NULL,
  target_word_max INTEGER NOT NULL,
  
  improved_prompt TEXT,
  headline TEXT,
  social_copy TEXT,
  instagram_caption TEXT,
  showing_invitation TEXT,
  short_ad TEXT,
  expert_analysis JSONB,
  
  total_duration INTEGER,
  step1_duration INTEGER,
  step2_duration INTEGER,
  step3_duration INTEGER,
  retry_count INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL,
  error_type TEXT,
  fallback_used BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_generations_user_id ON pipeline_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_generations_variant ON pipeline_generations(variant);
CREATE INDEX IF NOT EXISTS idx_pipeline_generations_created_at ON pipeline_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_generations_success ON pipeline_generations(success);

-- 2. A/B Test Assignments Table
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('control', 'treatment')),
  manual_override BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_session_id ON ab_test_assignments(session_id);

-- 3. Pipeline Metrics Table
CREATE TABLE IF NOT EXISTS pipeline_metrics_v2 (
  id SERIAL PRIMARY KEY,
  variant TEXT NOT NULL CHECK (variant IN ('control', 'treatment')),
  metric_date DATE NOT NULL,
  
  total_generations INTEGER NOT NULL DEFAULT 0,
  successful_generations INTEGER NOT NULL DEFAULT 0,
  failed_generations INTEGER NOT NULL DEFAULT 0,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  
  avg_total_duration FLOAT,
  p50_total_duration FLOAT,
  p95_total_duration FLOAT,
  p99_total_duration FLOAT,
  
  avg_user_satisfaction FLOAT,
  regeneration_count INTEGER NOT NULL DEFAULT 0,
  minor_edit_count INTEGER NOT NULL DEFAULT 0,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (variant, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_v2_variant ON pipeline_metrics_v2(variant);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_v2_date ON pipeline_metrics_v2(metric_date);

-- 4. User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
  id SERIAL PRIMARY KEY,
  generation_id INTEGER NOT NULL REFERENCES pipeline_generations(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  
  satisfaction_score INTEGER CHECK (satisfaction_score IN (-1, 1)),
  regenerated BOOLEAN DEFAULT FALSE,
  edit_type TEXT CHECK (edit_type IN ('none', 'minor', 'major', 'complete_rewrite')),
  time_to_final_text INTEGER,
  feedback_text TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_generation_id ON user_feedback(generation_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);

-- 5. Expert Feedback Items Table
CREATE TABLE IF NOT EXISTS expert_feedback_items (
  id SERIAL PRIMARY KEY,
  generation_id INTEGER NOT NULL REFERENCES pipeline_generations(id),
  
  feedback_id TEXT NOT NULL,
  issue TEXT NOT NULL,
  location TEXT NOT NULL,
  text_span JSONB,
  suggestion TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('grammar', 'style', 'legal', 'broker_realism', 'clarity')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'important', 'suggestion')),
  expert TEXT NOT NULL CHECK (expert IN ('broker', 'lawyer')),
  actionable BOOLEAN NOT NULL,
  auto_fix TEXT,
  
  applied BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expert_feedback_generation_id ON expert_feedback_items(generation_id);
CREATE INDEX IF NOT EXISTS idx_expert_feedback_category ON expert_feedback_items(category);
CREATE INDEX IF NOT EXISTS idx_expert_feedback_severity ON expert_feedback_items(severity);
```

### Verify Migration

```bash
# Connect to database
psql $DATABASE_URL

# Check tables exist
\dt pipeline_*
\dt ab_test_*
\dt user_feedback
\dt expert_feedback_*

# Check indexes
\di idx_pipeline_*
\di idx_ab_test_*
```

---

## Staging Deployment

### Step 1: Deploy to Staging Environment

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Push to staging (if separate staging environment)
git push staging main

# Or deploy via Render dashboard:
# 1. Go to staging service
# 2. Click "Manual Deploy"
# 3. Select "main" branch
# 4. Click "Deploy"
```

### Step 2: Configure Staging Environment

```bash
# Set environment variables in Render
PERFECT_SWEDISH_PIPELINE_ENABLED=true
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=100  # Test with 100% in staging
NODE_ENV=production
```

### Step 3: Run Smoke Tests

```bash
# Test basic functionality
curl https://staging.optiprompt.se/api/health

# Test pipeline endpoint (requires authentication)
# Use Postman or similar tool to test:
POST https://staging.optiprompt.se/api/optimize
Headers:
  Cookie: connect.sid=<session-cookie>
Body:
  {
    "disposition": { ... },
    "style": "balanced",
    "platform": "hemnet"
  }
```

### Step 4: Verify Monitoring

```bash
# Check Sentry for errors
# Visit: https://sentry.io/organizations/optiprompt/issues/

# Check metrics endpoint
curl https://staging.optiprompt.se/api/perfect-swedish/metrics/current/treatment

# Check health check is running
# Look for console logs: "[Scheduler] Running health check..."
```

### Step 5: Internal Testing

- [ ] Test with 5-10 different property types
- [ ] Verify inline highlights display correctly
- [ ] Test expert feedback panel functionality
- [ ] Test one-click fix feature
- [ ] Test AI-assisted selection edit
- [ ] Verify undo/redo works
- [ ] Check WebSocket progress updates
- [ ] Test error handling (invalid inputs)

---

## Production Deployment

### Gradual Rollout Strategy

The Perfect Swedish Pipeline uses a **gradual rollout** approach:

1. **Canary (10%)** - Week 1
2. **Expanded (50%)** - Week 2-3
3. **Full (100%)** - Week 4+

### Phase 1: Canary Deployment (10%)

#### Deploy

```bash
# Push to production
git push origin main

# Render auto-deploys on push to main
```

#### Configure

```bash
# Set in Render Environment
PERFECT_SWEDISH_PIPELINE_ENABLED=true
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=10  # 10% of users
NODE_ENV=production
```

#### Monitor (First 24 Hours)

```bash
# Check metrics every hour
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# Check for alerts
# Sentry dashboard: https://sentry.io/organizations/optiprompt/issues/

# Check health status
curl https://optiprompt.se/api/perfect-swedish/health
```

#### Success Criteria

- [ ] Success rate ≥ 95%
- [ ] Average generation time < 25s
- [ ] Fallback rate < 10%
- [ ] No critical errors in Sentry
- [ ] User satisfaction ≥ 70%

### Phase 2: Expanded Deployment (50%)

**Timing:** After 7 days of successful canary

#### Update Configuration

```bash
# Increase to 50%
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=50
```

#### Monitor (First Week)

- Daily metrics review
- Compare control vs treatment
- Analyze user feedback
- Review Sentry errors

#### Success Criteria

- [ ] Success rate ≥ 95% sustained
- [ ] Generation time improvement vs control
- [ ] User satisfaction improvement vs control
- [ ] No increase in support tickets

### Phase 3: Full Deployment (100%)

**Timing:** After 14 days of successful expanded rollout

#### Update Configuration

```bash
# Full rollout
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=100
```

#### Monitor (First 48 Hours)

- Continuous monitoring
- Real-time alert response
- User feedback collection
- Performance analysis

#### Success Criteria

- [ ] All metrics meet targets
- [ ] No critical issues
- [ ] Positive user feedback
- [ ] Support ticket volume normal

---

## Rollback Procedures

### Emergency Rollback (Immediate)

**When to use:** Critical production issues, high error rates, system instability

#### Option 1: Disable New Pipeline (Fastest)

```bash
# In Render dashboard, update environment variable:
PERFECT_SWEDISH_PIPELINE_ENABLED=false

# Save and redeploy (takes ~2 minutes)
```

**Effect:** All users immediately use old 7-step pipeline

#### Option 2: Reduce Percentage

```bash
# Reduce to 0% (same effect as disabling)
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=0
```

#### Option 3: Git Revert

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Render auto-deploys reverted code
```

### Planned Rollback

**When to use:** Metrics not meeting targets, user feedback negative

#### Step 1: Analyze Issues

```bash
# Check metrics
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# Review Sentry errors
# Visit Sentry dashboard

# Check user feedback
# Query user_feedback table
```

#### Step 2: Decide Rollback Strategy

- **Partial rollback:** Reduce percentage (e.g., 50% → 10%)
- **Full rollback:** Disable completely
- **Fix forward:** Deploy hotfix and continue

#### Step 3: Execute Rollback

```bash
# Update environment variable
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=10  # or 0

# Monitor for 1 hour
# Verify metrics stabilize
```

#### Step 4: Post-Rollback

- [ ] Document rollback reason
- [ ] Create incident report
- [ ] Plan fixes
- [ ] Schedule re-deployment

### Rollback Verification

```bash
# Verify old pipeline is active
curl https://optiprompt.se/api/optimize \
  -H "Cookie: connect.sid=<session>" \
  -d '{"disposition": {...}, "style": "balanced", "platform": "hemnet"}'

# Check response includes old pipeline indicators
# (no expertAnalysis field, different timing)

# Monitor error rates
# Should return to baseline within 5 minutes
```

---

## Post-Deployment Verification

### Immediate Checks (First 30 Minutes)

```bash
# 1. Health check
curl https://optiprompt.se/api/health
# Expected: 200 OK

# 2. Pipeline health
curl https://optiprompt.se/api/perfect-swedish/health
# Expected: { "status": "healthy", ... }

# 3. Check Sentry
# Visit: https://sentry.io/organizations/optiprompt/issues/
# Expected: No new critical errors

# 4. Check metrics
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment
# Expected: Valid metrics response

# 5. Test generation (manual)
# Use frontend to generate a text
# Verify: Completes successfully, shows expert feedback
```

### First Hour Checks

- [ ] Monitor Sentry for errors (every 15 minutes)
- [ ] Check metrics endpoint (every 15 minutes)
- [ ] Review server logs for warnings
- [ ] Test 3-5 different property types
- [ ] Verify WebSocket updates working

### First 24 Hours

- [ ] Review metrics every 4 hours
- [ ] Check daily summary report (next morning)
- [ ] Analyze user feedback
- [ ] Compare control vs treatment metrics
- [ ] Review support tickets

### First Week

- [ ] Daily metrics review
- [ ] Weekly summary report
- [ ] User feedback analysis
- [ ] Performance optimization if needed
- [ ] Plan next rollout phase

---

## Troubleshooting

### Issue: High Error Rate

**Symptoms:** Success rate < 95%, many Sentry errors

**Diagnosis:**
```bash
# Check error types
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# Review Sentry errors
# Look for patterns in error messages
```

**Solutions:**
1. Check OpenAI API status: https://status.openai.com/
2. Verify database connectivity
3. Check Redis connectivity
4. Review recent code changes
5. Consider rollback if critical

### Issue: Slow Performance

**Symptoms:** Generation time > 25s

**Diagnosis:**
```bash
# Check step durations
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# Look at p95_generation_time
```

**Solutions:**
1. Check OpenAI API latency
2. Review database query performance
3. Check Redis cache hit rate
4. Monitor server CPU/memory
5. Consider scaling up resources

### Issue: High Fallback Rate

**Symptoms:** Fallback rate > 10%

**Diagnosis:**
```bash
# Check fallback reasons in logs
# Review Sentry for pipeline failures
```

**Solutions:**
1. Review retry logic effectiveness
2. Check OpenAI API reliability
3. Verify error handling
4. Adjust retry strategy if needed

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code review approved
- [ ] Database backup completed
- [ ] Environment variables configured
- [ ] Team notified
- [ ] Rollback plan reviewed

### During Deployment
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Verify monitoring working
- [ ] Deploy to production
- [ ] Monitor for 30 minutes

### Post-Deployment
- [ ] Health checks passing
- [ ] Metrics collecting correctly
- [ ] No critical errors
- [ ] User testing successful
- [ ] Documentation updated

---

## Support Contacts

- **On-Call Engineer:** [Your contact info]
- **Sentry:** https://sentry.io/organizations/optiprompt/
- **Render Dashboard:** https://dashboard.render.com/
- **OpenAI Status:** https://status.openai.com/

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-20  
**Next Review:** After full rollout (100%)
