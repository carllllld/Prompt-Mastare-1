# Perfect Swedish Pipeline - Troubleshooting Guide

**Version:** 1.0  
**Last Updated:** 2026-01-20  
**Audience:** DevOps, SRE, Support Engineers

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Performance Issues](#performance-issues)
4. [Error Patterns](#error-patterns)
5. [User-Reported Issues](#user-reported-issues)
6. [Integration Issues](#integration-issues)

---

## Quick Diagnostics

### Health Check Commands

```bash
# 1. System health
curl https://optiprompt.se/api/perfect-swedish/health

# 2. Current metrics
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# 3. Check Sentry errors
# Visit: https://sentry.io/organizations/optiprompt/issues/

# 4. Check server logs
# Render dashboard → Logs tab

# 5. Database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# 6. Redis connectivity
redis-cli -u $REDIS_URL PING
```

### Quick Status Check

```bash
# Run all checks at once
echo "=== Health Check ===" && \
curl -s https://optiprompt.se/api/perfect-swedish/health | jq && \
echo "\n=== Metrics ===" && \
curl -s https://optiprompt.se/api/perfect-swedish/metrics/current/treatment | jq && \
echo "\n=== Database ===" && \
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pipeline_generations WHERE created_at > NOW() - INTERVAL '1 hour';" && \
echo "\n=== Redis ===" && \
redis-cli -u $REDIS_URL PING
```

---

## Common Issues

### Issue 1: Pipeline Not Executing

**Symptoms:**
- Users report no text generation
- Timeout errors
- Blank results

**Diagnosis:**

```bash
# 1. Check if pipeline is enabled
echo $PERFECT_SWEDISH_PIPELINE_ENABLED

# 2. Check recent generations
psql $DATABASE_URL -c "SELECT id, variant, success, error_type, created_at FROM pipeline_generations ORDER BY created_at DESC LIMIT 10;"

# 3. Check Sentry for errors
# Filter by: component:perfect-swedish-orchestrator

# 4. Check server logs
# Look for: "Pipeline execution failed"
```

**Common Causes:**

1. **Pipeline Disabled**
   ```bash
   # Solution: Enable pipeline
   # In Render: PERFECT_SWEDISH_PIPELINE_ENABLED=true
   ```

2. **OpenAI API Key Invalid**
   ```bash
   # Check API key
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   
   # If 401: Update API key in Render environment
   ```

3. **Database Connection Failed**
   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   
   # If fails: Check DATABASE_URL in Render
   # Verify database is running in Render dashboard
   ```

4. **Timeout Issues**
   ```bash
   # Check OpenAI API status
   curl https://status.openai.com/api/v2/status.json
   
   # If degraded: Wait or increase timeout
   # Or temporarily disable: PERFECT_SWEDISH_PIPELINE_ENABLED=false
   ```

**Resolution Steps:**

1. Verify environment variables
2. Test external dependencies (OpenAI, database, Redis)
3. Check recent code deployments
4. Review error logs in Sentry
5. If critical, rollback to old pipeline

---

### Issue 2: High Error Rate

**Symptoms:**
- Success rate < 95%
- Many Sentry errors
- Users reporting failures

**Diagnosis:**

```bash
# 1. Check success rate
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment | jq '.successRate'

# 2. Check error types
psql $DATABASE_URL -c "SELECT error_type, COUNT(*) FROM pipeline_generations WHERE variant = 'treatment' AND success = false AND created_at > NOW() - INTERVAL '1 hour' GROUP BY error_type ORDER BY COUNT(*) DESC;"

# 3. Check Sentry error patterns
# Visit Sentry, filter by last 1 hour

# 4. Check OpenAI API status
curl https://status.openai.com/api/v2/status.json
```

**Common Causes:**

1. **OpenAI API Issues**
   ```bash
   # Check status
   curl https://status.openai.com/api/v2/status.json
   
   # If degraded:
   # - Wait for recovery
   # - Or reduce percentage: PERFECT_SWEDISH_PIPELINE_PERCENTAGE=25
   # - Or disable: PERFECT_SWEDISH_PIPELINE_ENABLED=false
   ```

2. **Invalid Input Data**
   ```bash
   # Check recent failed generations
   psql $DATABASE_URL -c "SELECT id, disposition, error_type FROM pipeline_generations WHERE success = false ORDER BY created_at DESC LIMIT 5;"
   
   # Look for patterns in disposition data
   # Add validation if needed
   ```

3. **Code Bugs**
   ```bash
   # Check recent deployments
   # Review Sentry stack traces
   # Look for common error patterns
   
   # If bug confirmed:
   # - Revert deployment
   # - Or hotfix and redeploy
   ```

4. **Resource Exhaustion**
   ```bash
   # Check server resources in Render
   # Metrics tab → CPU and Memory
   
   # If high:
   # - Scale up instance
   # - Or reduce load: PERFECT_SWEDISH_PIPELINE_PERCENTAGE=25
   ```

**Resolution Steps:**

1. Identify error pattern from Sentry
2. Check external dependencies
3. Review recent code changes
4. If widespread: Reduce percentage or disable
5. Fix root cause and redeploy
6. Gradually increase percentage again

---

### Issue 3: Slow Performance

**Symptoms:**
- Generation time > 25s
- Users complaining about slowness
- Timeout warnings

**Diagnosis:**

```bash
# 1. Check average duration
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment | jq '.avgGenerationTime, .p95GenerationTime'

# 2. Check step durations (if tracked)
psql $DATABASE_URL -c "SELECT AVG(step1_duration) as avg_step1, AVG(step2_duration) as avg_step2, AVG(step3_duration) as avg_step3 FROM pipeline_generations WHERE variant = 'treatment' AND created_at > NOW() - INTERVAL '1 hour';"

# 3. Check OpenAI API latency
# Visit: https://status.openai.com/

# 4. Check database query performance
psql $DATABASE_URL -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# 5. Check server resources
# Render dashboard → Metrics tab
```

**Common Causes:**

1. **OpenAI API Slow**
   ```bash
   # Check status
   curl https://status.openai.com/api/v2/status.json
   
   # If slow:
   # - Wait for recovery
   # - Monitor status page
   # - Consider temporary rollback if critical
   ```

2. **Database Slow Queries**
   ```bash
   # Find slow queries
   psql $DATABASE_URL -c "SELECT query, mean_exec_time FROM pg_stat_statements WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC LIMIT 5;"
   
   # Add indexes if needed
   # Optimize queries
   # Consider connection pooling adjustments
   ```

3. **Redis Cache Misses**
   ```bash
   # Check cache hit rate
   redis-cli -u $REDIS_URL INFO stats | grep keyspace_hits
   
   # If low hit rate:
   # - Verify cache is working
   # - Check TTL settings
   # - Warm cache with common requests
   ```

4. **High Server Load**
   ```bash
   # Check concurrent requests
   # Render dashboard → Metrics
   
   # If high:
   # - Scale up instance
   # - Add rate limiting
   # - Reduce percentage temporarily
   ```

**Resolution Steps:**

1. Identify bottleneck (Step 1, 2, or 3)
2. Check external dependencies
3. Optimize slow component
4. Monitor improvement
5. Document optimization

---

### Issue 4: High Fallback Rate

**Symptoms:**
- Fallback rate > 10%
- Users getting old pipeline results
- Inconsistent experience

**Diagnosis:**

```bash
# 1. Check fallback rate
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment | jq '.fallbackRate'

# 2. Check fallback reasons
psql $DATABASE_URL -c "SELECT error_type, COUNT(*) FROM pipeline_generations WHERE variant = 'treatment' AND fallback_used = true AND created_at > NOW() - INTERVAL '1 hour' GROUP BY error_type;"

# 3. Check retry counts
psql $DATABASE_URL -c "SELECT retry_count, COUNT(*) FROM pipeline_generations WHERE variant = 'treatment' AND created_at > NOW() - INTERVAL '1 hour' GROUP BY retry_count ORDER BY retry_count;"

# 4. Review Sentry errors
# Filter by: component:perfect-swedish-orchestrator
```

**Common Causes:**

1. **Insufficient Retries**
   ```typescript
   // In perfect-swedish-orchestrator.ts
   // Increase max retries from 2 to 3
   const maxRetries = 3;
   ```

2. **Timeout Too Aggressive**
   ```typescript
   // Increase timeout in generator/analyzer
   timeout: 30000, // 30 seconds instead of 20
   ```

3. **Non-Retryable Errors Classified Wrong**
   ```typescript
   // Review error classification
   // Some errors might be retryable
   ```

4. **OpenAI API Reliability**
   ```bash
   # Check status
   curl https://status.openai.com/api/v2/status.json
   
   # If unreliable:
   # - Wait for stability
   # - Or reduce percentage
   ```

**Resolution Steps:**

1. Analyze fallback patterns
2. Adjust retry strategy if needed
3. Fix classification of retryable errors
4. Monitor improvement
5. If persistent: Investigate root cause

---

### Issue 5: Low User Satisfaction

**Symptoms:**
- User satisfaction < 70%
- High regeneration rate
- Negative feedback

**Diagnosis:**

```bash
# 1. Check satisfaction score
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment | jq '.userSatisfaction, .regenerationRate'

# 2. Check feedback distribution
psql $DATABASE_URL -c "SELECT satisfaction_score, COUNT(*) FROM user_feedback uf JOIN pipeline_generations pg ON uf.generation_id = pg.id WHERE pg.variant = 'treatment' AND pg.created_at > NOW() - INTERVAL '24 hours' GROUP BY satisfaction_score;"

# 3. Check expert feedback categories
psql $DATABASE_URL -c "SELECT category, severity, COUNT(*) FROM expert_feedback_items efi JOIN pipeline_generations pg ON efi.generation_id = pg.id WHERE pg.variant = 'treatment' AND pg.created_at > NOW() - INTERVAL '24 hours' GROUP BY category, severity ORDER BY COUNT(*) DESC;"

# 4. Read user feedback text
psql $DATABASE_URL -c "SELECT feedback_text FROM user_feedback WHERE feedback_text IS NOT NULL ORDER BY created_at DESC LIMIT 20;"
```

**Common Causes:**

1. **Quality Issues**
   ```bash
   # Check most common feedback categories
   # Grammar, style, legal, broker_realism, clarity
   
   # If grammar issues:
   # - Review Swedish language rules in prompt
   # - Add more examples
   # - Adjust post-processor
   
   # If broker realism issues:
   # - Review prompt examples
   # - Adjust forbidden phrases
   # - Add more natural language guidelines
   ```

2. **Too Many Critical Feedback Items**
   ```bash
   # Check critical feedback count
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM expert_feedback_items WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours';"
   
   # If high:
   # - Review analysis prompt
   # - Adjust severity thresholds
   # - Improve generation quality
   ```

3. **Editing Tools Not Working**
   ```bash
   # Check if users are applying fixes
   psql $DATABASE_URL -c "SELECT applied, dismissed, COUNT(*) FROM expert_feedback_items WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY applied, dismissed;"
   
   # If low application rate:
   # - Check frontend functionality
   # - Review UX of editing tools
   # - Gather user feedback on tools
   ```

**Resolution Steps:**

1. Analyze feedback patterns
2. Identify quality issues
3. Improve prompt or post-processor
4. Test improvements in staging
5. Deploy and monitor

---

## Performance Issues

### Slow Step 1 (Smart Generation)

**Target:** 15-18 seconds  
**Symptoms:** Step 1 taking >20 seconds

**Diagnosis:**

```bash
# Check average Step 1 duration
psql $DATABASE_URL -c "SELECT AVG(step1_duration) FROM pipeline_generations WHERE variant = 'treatment' AND created_at > NOW() - INTERVAL '1 hour';"

# Check OpenAI API status
curl https://status.openai.com/api/v2/status.json
```

**Solutions:**

1. **Reduce Prompt Length**
   ```typescript
   // In perfect-swedish-generator.ts
   // Review and shorten:
   // - System prompt
   // - Examples (keep most important)
   // - Self-check instructions
   ```

2. **Optimize OpenAI Settings**
   ```typescript
   // Consider adjusting:
   temperature: 0.7, // Lower for faster?
   max_tokens: 1800, // Reduce if possible
   ```

3. **Check Cache Hit Rate**
   ```bash
   # Verify prompt templates are cached
   redis-cli -u $REDIS_URL KEYS "prompt_template:*"
   ```

---

### Slow Step 2 (Post-Processing)

**Target:** <1 second  
**Symptoms:** Step 2 taking >1 second

**Diagnosis:**

```bash
# Check average Step 2 duration
psql $DATABASE_URL -c "SELECT AVG(step2_duration) FROM pipeline_generations WHERE variant = 'treatment' AND created_at > NOW() - INTERVAL '1 hour';"

# Profile transformations (add timing logs)
```

**Solutions:**

1. **Optimize Regex Patterns**
   ```typescript
   // Ensure patterns are pre-compiled
   // Review complex patterns
   // Consider simpler alternatives
   ```

2. **Skip Unnecessary Transformations**
   ```typescript
   // Add quick checks before expensive operations
   if (!text.includes('[')) {
     // Skip placeholder removal
   }
   ```

3. **Profile Individual Transformations**
   ```typescript
   // Add timing logs to identify slow operations
   console.time('placeholder-removal');
   // ... transformation code
   console.timeEnd('placeholder-removal');
   ```

---

### Slow Step 3 (Expert Analysis)

**Target:** 5-7 seconds  
**Symptoms:** Step 3 taking >8 seconds

**Diagnosis:**

```bash
# Check average Step 3 duration
psql $DATABASE_URL -c "SELECT AVG(step3_duration) FROM pipeline_generations WHERE variant = 'treatment' AND created_at > NOW() - INTERVAL '1 hour';"

# Check OpenAI API status
curl https://status.openai.com/api/v2/status.json
```

**Solutions:**

1. **Reduce Analysis Prompt Length**
   ```typescript
   // In perfect-swedish-analyzer.ts
   // Shorten analysis instructions
   // Reduce examples
   ```

2. **Limit Feedback Items**
   ```typescript
   // Return only top 10 most important items
   // Skip minor suggestions
   ```

3. **Make Text Span Identification Optional**
   ```typescript
   // Add option to skip detailed span identification
   // For faster analysis
   ```

---

## Error Patterns

### OpenAI API Errors

**Error:** `OpenAI API timeout`

```bash
# Check status
curl https://status.openai.com/api/v2/status.json

# Solutions:
# 1. Wait for recovery
# 2. Increase timeout
# 3. Reduce percentage
# 4. Disable if critical
```

**Error:** `OpenAI API rate limit exceeded`

```bash
# Solutions:
# 1. Check rate limits in OpenAI dashboard
# 2. Implement request queuing
# 3. Reduce concurrent requests
# 4. Upgrade OpenAI plan if needed
```

**Error:** `OpenAI API authentication failed`

```bash
# Check API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# If 401: Update API key in Render
```

---

### Database Errors

**Error:** `Database connection failed`

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Solutions:
# 1. Check DATABASE_URL in Render
# 2. Verify database is running
# 3. Check connection pool settings
# 4. Restart database if needed
```

**Error:** `Query timeout`

```bash
# Find slow queries
psql $DATABASE_URL -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;"

# Solutions:
# 1. Add missing indexes
# 2. Optimize queries
# 3. Increase query timeout
```

---

### Redis Errors

**Error:** `Redis connection failed`

```bash
# Test connection
redis-cli -u $REDIS_URL PING

# Solutions:
# 1. Check REDIS_URL in Render
# 2. Verify Redis is running
# 3. Restart Redis if needed
# 4. Check network connectivity
```

**Error:** `Redis timeout`

```bash
# Check Redis performance
redis-cli -u $REDIS_URL INFO stats

# Solutions:
# 1. Increase timeout
# 2. Check Redis memory usage
# 3. Clear old keys if needed
```

---

## User-Reported Issues

### "Text generation is stuck"

**Diagnosis:**

```bash
# Check if request is in progress
psql $DATABASE_URL -c "SELECT id, user_id, created_at FROM pipeline_generations WHERE user_id = <USER_ID> ORDER BY created_at DESC LIMIT 5;"

# Check WebSocket connection
# Review browser console for errors
```

**Solutions:**

1. Check server logs for errors
2. Verify WebSocket is working
3. Check if timeout occurred
4. Ask user to refresh and retry

---

### "Feedback panel not showing"

**Diagnosis:**

```bash
# Check if expert analysis was generated
psql $DATABASE_URL -c "SELECT id, expert_analysis FROM pipeline_generations WHERE user_id = <USER_ID> ORDER BY created_at DESC LIMIT 1;"

# Check browser console for errors
```

**Solutions:**

1. Verify expert analysis in database
2. Check frontend component rendering
3. Review browser console errors
4. Test with different browser

---

### "One-click fix not working"

**Diagnosis:**

```bash
# Check if feedback has auto_fix
psql $DATABASE_URL -c "SELECT feedback_id, auto_fix FROM expert_feedback_items WHERE generation_id = <GENERATION_ID>;"

# Check browser console for errors
```

**Solutions:**

1. Verify auto_fix is present
2. Check text span positions
3. Review frontend fix logic
4. Test with different feedback item

---

## Integration Issues

### Sentry Not Receiving Events

```bash
# Check SENTRY_DSN
echo $SENTRY_DSN

# Test Sentry
curl -X POST https://sentry.io/api/<PROJECT_ID>/store/ \
  -H "X-Sentry-Auth: Sentry sentry_key=<KEY>" \
  -d '{"message": "Test"}'

# Solutions:
# 1. Verify SENTRY_DSN is correct
# 2. Check Sentry project settings
# 3. Review Sentry initialization in code
```

---

### Metrics Not Updating

```bash
# Check if scheduler is running
# Look for logs: "[Scheduler] Running health check..."

# Check NODE_ENV
echo $NODE_ENV  # Should be "production"

# Solutions:
# 1. Set NODE_ENV=production
# 2. Restart server
# 3. Verify scheduler initialization
```

---

## Escalation Path

**Level 1: Self-Service**
- Use this troubleshooting guide
- Check Sentry and logs
- Review metrics

**Level 2: On-Call Engineer**
- Complex issues
- Performance degradation
- Multiple alerts

**Level 3: Emergency**
- System down
- Data loss
- Security incident

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-20  
**Next Review:** After major incidents
