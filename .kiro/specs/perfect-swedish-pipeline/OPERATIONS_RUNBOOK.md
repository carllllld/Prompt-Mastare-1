# Perfect Swedish Pipeline - Operations Runbook

**Version:** 1.0  
**Last Updated:** 2026-01-20  
**Audience:** DevOps, SRE, On-Call Engineers

---

## Table of Contents

1. [Common Operations](#common-operations)
2. [Monitoring and Metrics](#monitoring-and-metrics)
3. [Alert Response](#alert-response)
4. [Performance Tuning](#performance-tuning)
5. [Database Operations](#database-operations)
6. [Cache Management](#cache-management)
7. [A/B Test Management](#ab-test-management)

---

## Common Operations

### Check System Health

```bash
# Overall health check
curl https://optiprompt.se/api/perfect-swedish/health

# Expected response:
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "openai": "ok"
  },
  "timestamp": "2026-01-20T10:00:00Z"
}
```

### View Current Metrics

```bash
# Treatment (new pipeline) metrics
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# Control (old pipeline) metrics
curl https://optiprompt.se/api/perfect-swedish/metrics/current/control

# Expected response:
{
  "variant": "treatment",
  "successRate": 96.5,
  "avgGenerationTime": 22000,
  "p95GenerationTime": 24500,
  "fallbackRate": 3.2,
  "userSatisfaction": 0.85,
  "regenerationRate": 8.5,
  "minorEditRate": 72.0,
  "sampleSize": 1250,
  "timestamp": "2026-01-20T10:00:00Z"
}
```

### View Historical Metrics

```bash
# Last 7 days
curl https://optiprompt.se/api/perfect-swedish/metrics/historical?days=7

# Specific date range
curl "https://optiprompt.se/api/perfect-swedish/metrics/historical?startDate=2026-01-13&endDate=2026-01-20"

# Filter by variant
curl "https://optiprompt.se/api/perfect-swedish/metrics/historical?variant=treatment&days=7"
```

### Generate Daily Summary

```bash
# Today's summary
curl https://optiprompt.se/api/perfect-swedish/metrics/summary

# Specific date
curl "https://optiprompt.se/api/perfect-swedish/metrics/summary?date=2026-01-19"

# Expected response:
📊 Perfect Swedish Pipeline - Daily Summary
Date: 2026-01-20

🔵 Control (Old Pipeline)
  • Success Rate: 72.3%
  • Avg Generation Time: 58.2s
  • P95 Generation Time: 72.5s
  • Fallback Rate: 0.0%
  • User Satisfaction: 68.5%
  • Regeneration Rate: 28.5%
  • Sample Size: 850

🟢 Treatment (New Pipeline)
  • Success Rate: 96.5%
  • Avg Generation Time: 22.0s
  • P95 Generation Time: 24.5s
  • Fallback Rate: 3.2%
  • User Satisfaction: 85.0%
  • Regeneration Rate: 8.5%
  • Sample Size: 1250

📈 Improvement
  • Success Rate: +24.2pp
  • Generation Time: -36.2s
  • User Satisfaction: +16.5pp
```

### Export Metrics

```bash
# Export as JSON
curl https://optiprompt.se/api/perfect-swedish/metrics/export?format=json > metrics.json

# Export as CSV
curl https://optiprompt.se/api/perfect-swedish/metrics/export?format=csv > metrics.csv
```

### Adjust A/B Test Percentage

```bash
# Update environment variable in Render
# Go to: Dashboard → Web Service → Environment

# Change PERFECT_SWEDISH_PIPELINE_PERCENTAGE
# Values: 0-100
# 0 = All users get old pipeline
# 50 = 50/50 split
# 100 = All users get new pipeline

# Save and redeploy (takes ~2 minutes)
```

### Enable/Disable New Pipeline

```bash
# Disable new pipeline (emergency)
# In Render dashboard:
PERFECT_SWEDISH_PIPELINE_ENABLED=false

# Enable new pipeline
PERFECT_SWEDISH_PIPELINE_ENABLED=true

# Save and redeploy
```

### Force User to Specific Variant

```bash
# Via API (requires admin access)
POST https://optiprompt.se/api/perfect-swedish/ab-test/assign
Headers:
  Cookie: connect.sid=<admin-session>
Body:
  {
    "userId": 123,
    "sessionId": "abc123",
    "variant": "treatment",
    "manualOverride": true
  }

# This forces the user to always get the specified variant
```

### Clear User's Variant Assignment

```bash
# Delete from database
psql $DATABASE_URL -c "DELETE FROM ab_test_assignments WHERE user_id = 123;"

# User will be randomly assigned on next request
```

---

## Monitoring and Metrics

### Key Metrics to Monitor

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Success Rate | ≥95% | <95% | <90% |
| Avg Generation Time | <25s | >25s | >30s |
| P95 Generation Time | <28s | >28s | >35s |
| Fallback Rate | <10% | >10% | >20% |
| User Satisfaction | ≥70% | <70% | <60% |
| Regeneration Rate | <15% | >15% | >25% |

### Monitoring Dashboard

Access metrics via API endpoints:

```bash
# Current metrics (last hour)
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# Historical trends (last 7 days)
curl https://optiprompt.se/api/perfect-swedish/metrics/historical?days=7

# Daily summary
curl https://optiprompt.se/api/perfect-swedish/metrics/summary
```

### Sentry Integration

**Dashboard:** https://sentry.io/organizations/optiprompt/issues/

**Key Tags to Filter:**
- `component:perfect-swedish-*` - All pipeline components
- `variant:treatment` - New pipeline errors
- `variant:control` - Old pipeline errors
- `severity:critical` - Critical alerts

**Common Error Patterns:**
- `OpenAI API timeout` - Check OpenAI status
- `Database connection failed` - Check database health
- `Redis connection failed` - Check Redis health
- `Pipeline execution failed` - Review error details

### Automated Health Checks

The scheduler runs automated health checks every 60 minutes (configurable).

**Check logs:**
```bash
# In Render dashboard, view logs
# Look for:
[Scheduler] Running health check...
[Alerts] ✅ All metrics healthy

# Or if issues:
[Alerts] 🚨 2 alert(s) detected (1 critical, 1 warning)
```

**Configure check interval:**
```typescript
// In server/index.ts
import { initializeScheduler } from './lib/perfect-swedish-scheduler';

// Change interval (in minutes)
initializeScheduler(30); // Check every 30 minutes
```

---

## Alert Response

### Alert Types

#### 1. Success Rate Alert

**Trigger:** Success rate < 95%

**Severity:** 
- Warning: 90-95%
- Critical: <90%

**Response:**

```bash
# 1. Check current metrics
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# 2. Review Sentry errors
# Visit: https://sentry.io/organizations/optiprompt/issues/
# Filter by: component:perfect-swedish-*

# 3. Check OpenAI API status
curl https://status.openai.com/api/v2/status.json

# 4. Review recent deployments
# Check if alert started after deployment

# 5. If critical, consider rollback
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=0  # Disable new pipeline
```

**Common Causes:**
- OpenAI API issues
- Database connectivity problems
- Code bugs in recent deployment
- Invalid input data

#### 2. Generation Time Alert

**Trigger:** Avg generation time > 25s

**Severity:**
- Warning: 25-30s
- Critical: >30s

**Response:**

```bash
# 1. Check step durations
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment
# Look at: avgGenerationTime, p95GenerationTime

# 2. Check OpenAI API latency
# Visit: https://status.openai.com/

# 3. Check database query performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# 4. Check Redis cache hit rate
redis-cli INFO stats | grep keyspace_hits

# 5. Monitor server resources
# In Render dashboard: Metrics tab
# Check CPU and memory usage
```

**Common Causes:**
- OpenAI API slow response
- Database query slowness
- Redis cache misses
- High server load

#### 3. Fallback Rate Alert

**Trigger:** Fallback rate > 10%

**Severity:**
- Warning: 10-20%
- Critical: >20%

**Response:**

```bash
# 1. Check fallback reasons
# Review Sentry errors for pipeline failures

# 2. Check retry effectiveness
# Look at retry_count in pipeline_generations table
psql $DATABASE_URL -c "SELECT retry_count, COUNT(*) FROM pipeline_generations WHERE variant = 'treatment' AND created_at > NOW() - INTERVAL '1 hour' GROUP BY retry_count;"

# 3. Review error patterns
# Check most common error_type
psql $DATABASE_URL -c "SELECT error_type, COUNT(*) FROM pipeline_generations WHERE variant = 'treatment' AND success = false AND created_at > NOW() - INTERVAL '1 hour' GROUP BY error_type ORDER BY COUNT(*) DESC;"

# 4. Consider adjusting retry strategy
# Or temporarily reduce percentage
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=25
```

**Common Causes:**
- OpenAI API reliability issues
- Timeout configuration too aggressive
- Insufficient retry attempts
- Code bugs causing consistent failures

#### 4. User Satisfaction Alert

**Trigger:** User satisfaction < 70%

**Severity:**
- Warning: 60-70%
- Critical: <60%

**Response:**

```bash
# 1. Check user feedback
psql $DATABASE_URL -c "SELECT satisfaction_score, COUNT(*) FROM user_feedback uf JOIN pipeline_generations pg ON uf.generation_id = pg.id WHERE pg.variant = 'treatment' AND pg.created_at > NOW() - INTERVAL '24 hours' GROUP BY satisfaction_score;"

# 2. Review regeneration rate
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment
# Look at: regenerationRate

# 3. Check expert feedback categories
psql $DATABASE_URL -c "SELECT category, severity, COUNT(*) FROM expert_feedback_items efi JOIN pipeline_generations pg ON efi.generation_id = pg.id WHERE pg.variant = 'treatment' AND pg.created_at > NOW() - INTERVAL '24 hours' GROUP BY category, severity ORDER BY COUNT(*) DESC;"

# 4. Review user feedback text
psql $DATABASE_URL -c "SELECT feedback_text FROM user_feedback WHERE feedback_text IS NOT NULL ORDER BY created_at DESC LIMIT 20;"
```

**Common Causes:**
- Quality issues in generated text
- Too many critical feedback items
- Swedish language errors
- Broker realism problems

### Alert Escalation

**Level 1: Warning**
- Monitor for 1 hour
- Document in incident log
- No immediate action required

**Level 2: Critical**
- Immediate investigation
- Notify on-call engineer
- Consider rollback if unresolved in 30 minutes

**Level 3: Emergency**
- Multiple critical alerts
- System instability
- Immediate rollback
- Post-incident review required

---

## Performance Tuning

### Optimize Smart Generation (Step 1)

**Target:** 15-18 seconds

```bash
# Check current performance
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment
# Look at: step1_duration (if tracked)

# Optimization options:
# 1. Reduce prompt length
# 2. Optimize examples
# 3. Adjust OpenAI timeout
# 4. Cache prompt templates (already implemented)
```

### Optimize Post-Processing (Step 2)

**Target:** <1 second

```bash
# Profile transformations
# Add timing logs in perfect-swedish-post-processor.ts

# Optimization options:
# 1. Pre-compile regex patterns (already done)
# 2. Skip unnecessary transformations
# 3. Optimize forbidden phrase detection
```

### Optimize Expert Analysis (Step 3)

**Target:** 5-7 seconds

```bash
# Check current performance
# Look at: step3_duration (if tracked)

# Optimization options:
# 1. Reduce analysis prompt length
# 2. Limit feedback items to top 10
# 3. Make text span identification optional
# 4. Use reasoning:low (already implemented)
```

### Database Query Optimization

```bash
# Find slow queries
psql $DATABASE_URL -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check missing indexes
psql $DATABASE_URL -c "SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats WHERE schemaname = 'public' AND tablename LIKE 'pipeline_%' ORDER BY abs(correlation) DESC;"

# Add indexes if needed
psql $DATABASE_URL -c "CREATE INDEX idx_pipeline_generations_user_created ON pipeline_generations(user_id, created_at DESC);"
```

### Redis Cache Optimization

```bash
# Check cache hit rate
redis-cli INFO stats | grep keyspace

# Check cache size
redis-cli INFO memory | grep used_memory_human

# Clear cache if needed (use with caution)
redis-cli FLUSHDB

# Check specific keys
redis-cli KEYS "ab_test:*"
redis-cli KEYS "prompt_template:*"
```

---

## Database Operations

### Backup Database

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_20260120_100000.sql
```

### Query Pipeline Generations

```bash
# Recent generations
psql $DATABASE_URL -c "SELECT id, user_id, variant, success, total_duration, created_at FROM pipeline_generations ORDER BY created_at DESC LIMIT 20;"

# Success rate by variant
psql $DATABASE_URL -c "SELECT variant, COUNT(*) as total, COUNT(*) FILTER (WHERE success = true) as successful, ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*), 2) as success_rate FROM pipeline_generations WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY variant;"

# Average duration by variant
psql $DATABASE_URL -c "SELECT variant, ROUND(AVG(total_duration)) as avg_duration_ms, ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration)) as p95_duration_ms FROM pipeline_generations WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY variant;"
```

### Query User Feedback

```bash
# Recent feedback
psql $DATABASE_URL -c "SELECT uf.id, uf.user_id, pg.variant, uf.satisfaction_score, uf.regenerated, uf.edit_type, uf.created_at FROM user_feedback uf JOIN pipeline_generations pg ON uf.generation_id = pg.id ORDER BY uf.created_at DESC LIMIT 20;"

# Satisfaction by variant
psql $DATABASE_URL -c "SELECT pg.variant, COUNT(*) as total, COUNT(*) FILTER (WHERE uf.satisfaction_score = 1) as positive, COUNT(*) FILTER (WHERE uf.satisfaction_score = -1) as negative, ROUND(100.0 * COUNT(*) FILTER (WHERE uf.satisfaction_score = 1) / COUNT(*), 2) as positive_rate FROM user_feedback uf JOIN pipeline_generations pg ON uf.generation_id = pg.id WHERE uf.created_at > NOW() - INTERVAL '24 hours' GROUP BY pg.variant;"
```

### Query Expert Feedback

```bash
# Feedback by category
psql $DATABASE_URL -c "SELECT category, severity, COUNT(*) FROM expert_feedback_items efi JOIN pipeline_generations pg ON efi.generation_id = pg.id WHERE pg.variant = 'treatment' AND pg.created_at > NOW() - INTERVAL '24 hours' GROUP BY category, severity ORDER BY COUNT(*) DESC;"

# Most common issues
psql $DATABASE_URL -c "SELECT issue, COUNT(*) FROM expert_feedback_items efi JOIN pipeline_generations pg ON efi.generation_id = pg.id WHERE pg.variant = 'treatment' AND pg.created_at > NOW() - INTERVAL '24 hours' GROUP BY issue ORDER BY COUNT(*) DESC LIMIT 10;"
```

### Clean Up Old Data

```bash
# Delete generations older than 90 days
psql $DATABASE_URL -c "DELETE FROM pipeline_generations WHERE created_at < NOW() - INTERVAL '90 days';"

# Delete old metrics (keep 1 year)
psql $DATABASE_URL -c "DELETE FROM pipeline_metrics_v2 WHERE metric_date < NOW() - INTERVAL '1 year';"

# Vacuum tables
psql $DATABASE_URL -c "VACUUM ANALYZE pipeline_generations;"
psql $DATABASE_URL -c "VACUUM ANALYZE pipeline_metrics_v2;"
```

---

## Cache Management

### Check Redis Status

```bash
# Connect to Redis
redis-cli -u $REDIS_URL

# Check info
INFO

# Check memory usage
INFO memory

# Check keyspace
INFO keyspace
```

### View Cached Data

```bash
# List all keys
KEYS *

# List A/B test assignments
KEYS "ab_test:session:*"

# List prompt templates
KEYS "prompt_template:*"

# Get specific key
GET "ab_test:session:abc123"
```

### Clear Cache

```bash
# Clear all A/B test assignments
redis-cli -u $REDIS_URL --scan --pattern "ab_test:*" | xargs redis-cli -u $REDIS_URL DEL

# Clear all prompt templates
redis-cli -u $REDIS_URL --scan --pattern "prompt_template:*" | xargs redis-cli -u $REDIS_URL DEL

# Clear entire database (use with caution!)
redis-cli -u $REDIS_URL FLUSHDB
```

### Set Cache Expiration

```bash
# Set TTL for A/B test assignments (24 hours)
redis-cli -u $REDIS_URL EXPIRE "ab_test:session:abc123" 86400

# Set TTL for prompt templates (7 days)
redis-cli -u $REDIS_URL EXPIRE "prompt_template:smart-generation:v1" 604800
```

---

## A/B Test Management

### View Current Configuration

```bash
# Check environment variables
echo $PERFECT_SWEDISH_PIPELINE_ENABLED
echo $PERFECT_SWEDISH_PIPELINE_PERCENTAGE

# Or via Render dashboard:
# Dashboard → Web Service → Environment
```

### View Variant Distribution

```bash
# Count assignments by variant
psql $DATABASE_URL -c "SELECT variant, COUNT(*) FROM ab_test_assignments GROUP BY variant;"

# Recent assignments
psql $DATABASE_URL -c "SELECT user_id, session_id, variant, manual_override, assigned_at FROM ab_test_assignments ORDER BY assigned_at DESC LIMIT 20;"
```

### Adjust Rollout Percentage

```bash
# In Render dashboard:
# 1. Go to Environment tab
# 2. Update PERFECT_SWEDISH_PIPELINE_PERCENTAGE
# 3. Save changes (triggers redeploy)

# Recommended progression:
# Week 1: 10%
# Week 2: 25%
# Week 3: 50%
# Week 4: 75%
# Week 5: 100%
```

### Force User to Variant

```bash
# Insert manual assignment
psql $DATABASE_URL -c "INSERT INTO ab_test_assignments (user_id, session_id, variant, manual_override, assigned_at) VALUES (123, 'session123', 'treatment', true, NOW()) ON CONFLICT (user_id, session_id) DO UPDATE SET variant = 'treatment', manual_override = true;"

# Or via API (if endpoint exists)
POST /api/perfect-swedish/ab-test/assign
{
  "userId": 123,
  "sessionId": "session123",
  "variant": "treatment",
  "manualOverride": true
}
```

### Clear All Assignments

```bash
# Clear database assignments
psql $DATABASE_URL -c "DELETE FROM ab_test_assignments;"

# Clear Redis cache
redis-cli -u $REDIS_URL --scan --pattern "ab_test:*" | xargs redis-cli -u $REDIS_URL DEL

# Users will be randomly assigned on next request
```

---

## Maintenance Tasks

### Daily Tasks

- [ ] Review daily summary report
- [ ] Check Sentry for new errors
- [ ] Monitor key metrics
- [ ] Review user feedback

### Weekly Tasks

- [ ] Analyze A/B test results
- [ ] Review performance trends
- [ ] Check database size and performance
- [ ] Update documentation if needed

### Monthly Tasks

- [ ] Clean up old data (>90 days)
- [ ] Review and optimize slow queries
- [ ] Analyze long-term trends
- [ ] Plan next improvements

---

## Emergency Contacts

- **On-Call Engineer:** [Your contact]
- **Sentry:** https://sentry.io/organizations/optiprompt/
- **Render Dashboard:** https://dashboard.render.com/
- **OpenAI Status:** https://status.openai.com/
- **Database:** Render PostgreSQL dashboard

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-20  
**Next Review:** Monthly
