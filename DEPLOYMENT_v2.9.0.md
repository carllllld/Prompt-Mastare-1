# Deployment Guide: Complete System Verification v2.9.0

**Date:** 2026-03-21  
**Feature:** Complete verification of all AI-generated outputs and platform rules  
**Priority:** CRITICAL

---

## Overview

This deployment extends platform rule validation and quality checks to ALL 6 generated text fields (improvedPrompt, headline, socialCopy, instagramCaption, showingInvitation, shortAd). Previously, only the main text (improvedPrompt) was thoroughly validated.

### What's Changed

**Generator (v2.9.0):**
- Added platform-specific rules for all 6 auxiliary fields
- Added validateGeneratedOutput() method
- Validates Hemnet violations before returning results
- Validates field-specific quality requirements (headline max 9 words, etc.)

**Post-Processor:**
- Added removePlatformForbiddenPatterns() method
- Added enforceFieldQualityRules() method
- Removes Hemnet violations from ALL fields
- Enforces field quality (headline punctuation, social copy period, Instagram emoji limit)

**Analyzer:**
- Updated to analyze ALL 6 fields (added instagramCaption, showingInvitation, shortAd)
- Added timeout handling (30 seconds)
- Flags platform violations in auxiliary fields as critical severity

**Monitoring:**
- New metrics tracking system (system-verification-metrics.ts)
- Tracks violations by field and pattern
- Alert thresholds for production monitoring

---

## Pre-Deployment Checklist

### 1. Code Review
- [ ] Review generator changes (PROMPT_VERSION bump to 2.9.0)
- [ ] Review post-processor changes (new filtering methods)
- [ ] Review analyzer changes (all 6 fields)
- [ ] Review test coverage

### 2. Environment Verification
- [ ] Verify OpenAI API key is set (OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY)
- [ ] Verify Redis is accessible (for prompt caching)
- [ ] Verify database connection
- [ ] Verify Sentry DSN (for error tracking)

### 3. Dependencies
- [ ] All npm packages installed
- [ ] TypeScript compilation successful (`npm run check`)
- [ ] No critical linting errors

### 4. Testing
- [ ] Unit tests pass (generator, post-processor, analyzer)
- [ ] Integration tests pass
- [ ] Property-based tests pass (optional, can be skipped for faster deployment)

---

## Deployment Steps

### Step 1: Clear Redis Cache

The PROMPT_VERSION has been bumped from 2.8.0 to 2.9.0, which requires clearing the Redis cache to ensure new prompts are used.

```bash
# Connect to Redis
redis-cli

# Clear all cached prompts
FLUSHDB

# Or clear specific keys
KEYS smart-generation-*
DEL smart-generation-balanced-hemnet
DEL smart-generation-factual-hemnet
DEL smart-generation-selling-hemnet
# ... repeat for all platforms
```

### Step 2: Deploy to Staging

```bash
# Build the application
npm run build

# Deploy to staging environment
# (Render auto-deploys on git push to staging branch)
git checkout staging
git merge main
git push origin staging
```

### Step 3: Staging Verification (24 hours)

Run canary tests with real property data:

```bash
# Run canary tests
npm run test:canary

# Monitor logs for violations
tail -f logs/production.log | grep "PLATFORM_VIOLATIONS_REMOVED"
tail -f logs/production.log | grep "GENERATOR_VALIDATION_FAILED"
```

**Expected Results:**
- 0 Hemnet violations in production logs
- Generator validation catches violations before post-processor
- All 6 fields present in generated output
- Analyzer analyzes all 6 fields

**Metrics to Monitor:**
- Platform compliance rate: 100%
- Forbidden phrase rate: 100%
- Field quality score: 95%+
- Pipeline health: 95%+

### Step 4: Production Deployment

If staging verification passes:

```bash
# Deploy to production
git checkout main
git push origin main
```

Render will auto-deploy to production.

### Step 5: Post-Deployment Monitoring (1 week)

Monitor the following metrics:

**Critical Metrics:**
- Hemnet violations per hour: < 10
- Generator validation failures per hour: < 5
- Analyzer timeouts per hour: < 3

**Quality Metrics:**
- Overall quality score: > 7.0
- Field quality violations: < 5%
- Forbidden phrase occurrences: < 20/hour

**Performance Metrics:**
- Generator latency: < 10s
- Post-processor latency: < 1s
- Analyzer latency: < 30s

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)

If critical issues are discovered:

1. **Revert PROMPT_VERSION:**
   ```bash
   # Edit server/lib/perfect-swedish-generator.ts
   # Change PROMPT_VERSION from '2.9.0' to '2.8.0'
   ```

2. **Clear Redis cache:**
   ```bash
   redis-cli FLUSHDB
   ```

3. **Redeploy:**
   ```bash
   git add server/lib/perfect-swedish-generator.ts
   git commit -m "Rollback: Revert PROMPT_VERSION to 2.8.0"
   git push origin main
   ```

4. **Monitor for 15 minutes** to ensure system returns to previous behavior.

### Partial Rollback (< 15 minutes)

If only specific component is problematic:

**Generator issues:**
```bash
# Revert generator changes only
git revert <generator-commit-hash>
git push origin main
```

**Post-processor issues:**
```bash
# Revert post-processor changes only
git revert <post-processor-commit-hash>
git push origin main
```

**Analyzer issues:**
```bash
# Revert analyzer changes only
git revert <analyzer-commit-hash>
git push origin main
```

### Full Rollback (< 30 minutes)

If multiple components are problematic:

```bash
# Revert all changes
git revert <first-commit-hash>^..<last-commit-hash>
git push origin main

# Clear Redis cache
redis-cli FLUSHDB

# Restart services (Render will auto-restart on deploy)
```

---

## Monitoring and Alerts

### Dashboard Metrics

Create monitoring dashboard showing:

1. **Platform Compliance Rate**
   - % of generations with 0 Hemnet violations
   - Trend over time
   - Breakdown by field

2. **Forbidden Phrase Rate**
   - % of generations with 0 forbidden phrases
   - Top 10 most common violations
   - Trend over time

3. **Field Quality Score**
   - % of each field meeting quality requirements
   - Breakdown by requirement (word count, punctuation, etc.)

4. **Pipeline Health**
   - Generator validation success rate
   - Post-processor error rate
   - Analyzer timeout rate
   - Average processing time per component

### Alert Configuration

Configure alerts for:

- **Critical:** Hemnet violations > 10/hour
- **High:** Generator failures > 5/hour
- **Medium:** Forbidden phrases > 20/hour
- **High:** Analyzer timeouts > 3/hour

---

## Success Criteria

### Functional Success
- ✅ 100% of Hemnet texts have 0 price/fee/energiklass violations in ALL fields
- ✅ 100% of texts have 0 forbidden phrases in ALL fields
- ✅ 95%+ of texts meet field-specific quality requirements
- ✅ Analyzer provides feedback for ALL fields

### Technical Success
- ✅ Generator validation catches violations before post-processor
- ✅ Post-processor successfully filters all fields
- ✅ Analyzer analyzes all 6 fields
- ✅ All tests pass

### Quality Success
- ✅ 0 production incidents related to platform violations
- ✅ User satisfaction maintained or improved
- ✅ Expert analysis quality maintained
- ✅ No performance degradation (< 5% increase in latency)

---

## Known Issues and Limitations

### Generator Validation
- Generator may occasionally produce output that violates rules despite prompt instructions
- Validation will catch these and throw errors, which is expected behavior
- Monitor generator validation failure rate

### Post-Processor
- Post-processor removes violations but may occasionally remove legitimate content
- Monitor transformations log for false positives
- Adjust regex patterns if needed

### Analyzer
- Analyzer may timeout on complex texts (30-second limit)
- Timeout handling returns basic analysis instead of failing
- Monitor analyzer timeout rate

---

## Contact and Support

**Deployment Lead:** [Your Name]  
**On-Call Engineer:** [On-Call Name]  
**Escalation:** [Manager Name]

**Monitoring Dashboard:** [Dashboard URL]  
**Logs:** [Logs URL]  
**Sentry:** [Sentry URL]

---

## Post-Deployment Report Template

After 1 week of monitoring, complete this report:

### Metrics Summary
- Platform compliance rate: ____%
- Forbidden phrase rate: ____%
- Field quality score: ____%
- Pipeline health: ____%

### Incidents
- Total incidents: ___
- Critical incidents: ___
- Resolved incidents: ___

### Performance
- Average generator latency: ___s
- Average post-processor latency: ___s
- Average analyzer latency: ___s

### Recommendations
- [ ] Continue monitoring for another week
- [ ] Adjust alert thresholds
- [ ] Optimize performance
- [ ] Other: _______________

---

**Deployment Status:** ⏳ Pending  
**Last Updated:** 2026-03-21
