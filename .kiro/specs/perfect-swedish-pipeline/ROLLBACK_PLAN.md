# Perfect Swedish Pipeline - Rollback Plan

**Version:** 1.0  
**Last Updated:** 2026-01-20  
**Severity Levels:** Emergency | Planned | Partial

---

## Table of Contents

1. [Rollback Decision Matrix](#rollback-decision-matrix)
2. [Emergency Rollback](#emergency-rollback)
3. [Planned Rollback](#planned-rollback)
4. [Partial Rollback](#partial-rollback)
5. [Rollback Verification](#rollback-verification)
6. [Post-Rollback Actions](#post-rollback-actions)

---

## Rollback Decision Matrix

### When to Rollback

| Scenario | Severity | Action | Timeframe |
|----------|----------|--------|-----------|
| Success rate < 90% | Critical | Emergency Rollback | Immediate |
| Success rate 90-95% | Warning | Monitor 30 min, then decide | 30 minutes |
| Generation time > 35s | Critical | Emergency Rollback | Immediate |
| Generation time 25-35s | Warning | Partial Rollback | 1 hour |
| Fallback rate > 20% | Critical | Emergency Rollback | Immediate |
| Fallback rate 10-20% | Warning | Partial Rollback | 1 hour |
| Multiple critical alerts | Critical | Emergency Rollback | Immediate |
| User satisfaction < 60% | Critical | Planned Rollback | 24 hours |
| Data loss or corruption | Emergency | Emergency Rollback + Investigation | Immediate |
| Security vulnerability | Emergency | Emergency Rollback + Patch | Immediate |

### Decision Criteria

**Emergency Rollback Required:**
- System instability
- Data integrity issues
- Security vulnerabilities
- Multiple critical alerts
- Success rate < 90%
- User-facing errors widespread

**Planned Rollback Acceptable:**
- Metrics not meeting targets
- User feedback negative
- Performance degradation
- Single warning alert

**Partial Rollback Sufficient:**
- Isolated issues
- Specific user segments affected
- Performance concerns
- Testing needed

---

## Emergency Rollback

**Use Case:** Critical production issues requiring immediate action

**Estimated Time:** 2-5 minutes

### Method 1: Disable New Pipeline (Fastest)

**Time:** ~2 minutes

```bash
# Step 1: Access Render Dashboard
# Navigate to: https://dashboard.render.com/

# Step 2: Go to Web Service
# Select: optiprompt-web-service (or your service name)

# Step 3: Go to Environment Tab
# Click: Environment

# Step 4: Update Environment Variable
# Find: PERFECT_SWEDISH_PIPELINE_ENABLED
# Change: true → false
# Or add if missing: PERFECT_SWEDISH_PIPELINE_ENABLED = false

# Step 5: Save Changes
# Click: Save Changes
# Render will automatically redeploy (~2 minutes)

# Step 6: Verify Rollback (see Verification section)
```

**Effect:**
- All users immediately use old 7-step pipeline
- New pipeline completely disabled
- No A/B testing
- Safest option for critical issues

### Method 2: Set Percentage to 0

**Time:** ~2 minutes

```bash
# Step 1-3: Same as Method 1

# Step 4: Update Environment Variable
# Find: PERFECT_SWEDISH_PIPELINE_PERCENTAGE
# Change: <current> → 0

# Step 5-6: Same as Method 1
```

**Effect:**
- Same as Method 1
- All users get old pipeline
- A/B test infrastructure remains active

### Method 3: Git Revert

**Time:** ~5 minutes

```bash
# Step 1: Identify commit to revert
git log --oneline -10

# Step 2: Revert to last known good commit
git revert <commit-hash>

# Or revert last commit
git revert HEAD

# Step 3: Push to main
git push origin main

# Step 4: Render auto-deploys
# Monitor deployment in Render dashboard

# Step 5: Verify rollback
```

**Effect:**
- Code reverted to previous version
- All changes undone
- Most thorough rollback
- Use for code bugs

### Emergency Rollback Checklist

- [ ] Identify critical issue
- [ ] Notify team immediately
- [ ] Choose rollback method
- [ ] Execute rollback
- [ ] Verify rollback successful
- [ ] Monitor for 30 minutes
- [ ] Document incident
- [ ] Plan fix

---

## Planned Rollback

**Use Case:** Metrics not meeting targets, negative feedback, planned decision

**Estimated Time:** 15-30 minutes

### Step 1: Analyze Current State

```bash
# Check current metrics
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# Generate summary report
curl https://optiprompt.se/api/perfect-swedish/metrics/summary

# Review Sentry errors
# Visit: https://sentry.io/organizations/optiprompt/issues/

# Check user feedback
psql $DATABASE_URL -c "SELECT satisfaction_score, COUNT(*) FROM user_feedback uf JOIN pipeline_generations pg ON uf.generation_id = pg.id WHERE pg.variant = 'treatment' AND pg.created_at > NOW() - INTERVAL '24 hours' GROUP BY satisfaction_score;"
```

### Step 2: Document Rollback Reason

Create incident report:

```markdown
# Rollback Incident Report

**Date:** 2026-01-20
**Time:** 14:30 UTC
**Severity:** Planned
**Reason:** Success rate below target (92% vs 95% target)

## Metrics at Rollback
- Success Rate: 92%
- Avg Generation Time: 23s
- Fallback Rate: 8%
- User Satisfaction: 75%

## Decision
Rollback to old pipeline while investigating root cause.

## Root Cause Analysis
[To be completed]

## Action Items
- [ ] Investigate success rate drop
- [ ] Fix identified issues
- [ ] Test in staging
- [ ] Plan re-deployment
```

### Step 3: Notify Stakeholders

```markdown
Subject: Planned Rollback - Perfect Swedish Pipeline

Team,

We are performing a planned rollback of the Perfect Swedish Pipeline due to [reason].

Timeline:
- 14:30 UTC: Rollback initiated
- 14:45 UTC: Rollback complete
- 15:00 UTC: Verification complete

Impact:
- All users will use old 7-step pipeline
- No user-facing disruption expected
- Generation times may increase temporarily

Next Steps:
- Root cause analysis
- Fix and test
- Re-deployment plan

Questions? Contact [on-call engineer]
```

### Step 4: Execute Rollback

```bash
# Option A: Disable new pipeline
# In Render: PERFECT_SWEDISH_PIPELINE_ENABLED=false

# Option B: Set percentage to 0
# In Render: PERFECT_SWEDISH_PIPELINE_PERCENTAGE=0

# Wait for deployment (~2 minutes)
```

### Step 5: Verify Rollback

See [Rollback Verification](#rollback-verification) section

### Step 6: Monitor Post-Rollback

```bash
# Monitor for 1 hour
# Check every 15 minutes:

# 1. Success rate
curl https://optiprompt.se/api/perfect-swedish/metrics/current/control

# 2. Error rate
# Sentry dashboard

# 3. User feedback
# Support tickets

# 4. System health
curl https://optiprompt.se/api/health
```

### Planned Rollback Checklist

- [ ] Analyze metrics and identify issues
- [ ] Document rollback reason
- [ ] Notify stakeholders
- [ ] Execute rollback
- [ ] Verify rollback successful
- [ ] Monitor for 1 hour
- [ ] Create incident report
- [ ] Plan root cause analysis
- [ ] Schedule fix and re-deployment

---

## Partial Rollback

**Use Case:** Issues affecting specific user segments or need gradual rollback

**Estimated Time:** 5 minutes

### Reduce Percentage Gradually

```bash
# Current: 100% → Reduce to 50%
# In Render: PERFECT_SWEDISH_PIPELINE_PERCENTAGE=50

# Monitor for 30 minutes

# If issues persist: 50% → 25%
# In Render: PERFECT_SWEDISH_PIPELINE_PERCENTAGE=25

# Monitor for 30 minutes

# If issues persist: 25% → 0%
# In Render: PERFECT_SWEDISH_PIPELINE_PERCENTAGE=0
```

### Gradual Rollback Strategy

| Phase | Percentage | Duration | Monitor |
|-------|------------|----------|---------|
| 1 | 100% → 50% | 30 min | Success rate, errors |
| 2 | 50% → 25% | 30 min | Success rate, errors |
| 3 | 25% → 10% | 1 hour | Success rate, errors |
| 4 | 10% → 0% | Final | Verify stability |

### When to Use Partial Rollback

- Performance degradation (not critical)
- Isolated user reports
- Testing hypothesis
- Gradual risk reduction
- A/B test adjustment

### Partial Rollback Checklist

- [ ] Identify affected user segment
- [ ] Reduce percentage (e.g., 100% → 50%)
- [ ] Monitor for 30 minutes
- [ ] Check if issues resolved
- [ ] If not: Reduce further
- [ ] Document findings
- [ ] Plan fix

---

## Rollback Verification

### Immediate Verification (First 5 Minutes)

```bash
# 1. Check health endpoint
curl https://optiprompt.se/api/health
# Expected: 200 OK

# 2. Check pipeline status
curl https://optiprompt.se/api/perfect-swedish/health
# Expected: Shows old pipeline active or new pipeline disabled

# 3. Test generation manually
# Use frontend to generate a text
# Verify: Uses old pipeline (no expert feedback panel)

# 4. Check Sentry errors
# Visit: https://sentry.io/organizations/optiprompt/issues/
# Expected: Error rate decreasing

# 5. Check current metrics
curl https://optiprompt.se/api/perfect-swedish/metrics/current/control
# Expected: Control variant active, metrics improving
```

### Short-Term Verification (First 30 Minutes)

```bash
# Check every 10 minutes:

# 1. Success rate
psql $DATABASE_URL -c "SELECT variant, COUNT(*) as total, COUNT(*) FILTER (WHERE success = true) as successful, ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*), 2) as success_rate FROM pipeline_generations WHERE created_at > NOW() - INTERVAL '10 minutes' GROUP BY variant;"

# Expected: Control variant success rate > 95%

# 2. Error rate
# Sentry dashboard
# Expected: Errors decreasing

# 3. Generation time
psql $DATABASE_URL -c "SELECT variant, ROUND(AVG(total_duration)) as avg_duration_ms FROM pipeline_generations WHERE created_at > NOW() - INTERVAL '10 minutes' GROUP BY variant;"

# Expected: Control variant ~60-70s (old pipeline)

# 4. User reports
# Check support tickets
# Expected: No new complaints
```

### Long-Term Verification (First 24 Hours)

```bash
# Check every 4 hours:

# 1. Daily summary
curl https://optiprompt.se/api/perfect-swedish/metrics/summary

# 2. User satisfaction
psql $DATABASE_URL -c "SELECT AVG(CASE WHEN satisfaction_score = 1 THEN 1.0 ELSE 0.0 END) as avg_satisfaction FROM user_feedback WHERE created_at > NOW() - INTERVAL '4 hours';"

# 3. Support tickets
# Review volume and content

# 4. System stability
# Sentry dashboard
# Server logs
```

### Verification Checklist

- [ ] Health endpoint responding
- [ ] Old pipeline active
- [ ] Manual test successful
- [ ] Error rate decreasing
- [ ] Success rate improving
- [ ] Generation time stable
- [ ] No new user complaints
- [ ] Metrics returning to baseline

---

## Post-Rollback Actions

### Immediate Actions (First Hour)

1. **Confirm Rollback Success**
   ```bash
   # Verify all metrics stable
   curl https://optiprompt.se/api/perfect-swedish/metrics/current/control
   ```

2. **Notify Stakeholders**
   ```markdown
   Subject: Rollback Complete - Perfect Swedish Pipeline
   
   Team,
   
   Rollback completed successfully at [time].
   
   Status:
   - All users on old pipeline
   - Metrics returning to baseline
   - No user-facing issues
   
   Next Steps:
   - Root cause analysis
   - Fix development
   - Testing in staging
   ```

3. **Create Incident Report**
   - Document timeline
   - Record metrics at rollback
   - Note rollback method used
   - List verification steps

### Short-Term Actions (First 24 Hours)

1. **Root Cause Analysis**
   ```markdown
   # Root Cause Analysis Template
   
   ## Incident Summary
   - Date/Time: [timestamp]
   - Duration: [duration]
   - Impact: [user impact]
   
   ## Timeline
   - [time]: Issue detected
   - [time]: Rollback initiated
   - [time]: Rollback complete
   - [time]: Verification complete
   
   ## Root Cause
   [Detailed analysis]
   
   ## Contributing Factors
   - Factor 1
   - Factor 2
   
   ## Resolution
   [How issue was resolved]
   
   ## Prevention
   - Action 1
   - Action 2
   ```

2. **Fix Development**
   - Identify root cause
   - Develop fix
   - Write tests
   - Code review

3. **Staging Testing**
   ```bash
   # Deploy fix to staging
   git push staging fix-branch
   
   # Test thoroughly
   # - Manual testing
   # - Automated tests
   # - Load testing
   # - Verify fix works
   ```

### Long-Term Actions (First Week)

1. **Post-Mortem Meeting**
   - Review incident
   - Discuss root cause
   - Identify improvements
   - Update procedures

2. **Documentation Updates**
   - Update troubleshooting guide
   - Add known issues
   - Document fix
   - Update runbook

3. **Re-Deployment Planning**
   ```markdown
   # Re-Deployment Plan
   
   ## Fix Summary
   [What was fixed]
   
   ## Testing Completed
   - [ ] Unit tests
   - [ ] Integration tests
   - [ ] Staging tests
   - [ ] Load tests
   
   ## Rollout Strategy
   - Phase 1: 10% (Week 1)
   - Phase 2: 25% (Week 2)
   - Phase 3: 50% (Week 3)
   - Phase 4: 100% (Week 4)
   
   ## Monitoring Plan
   - Metrics to watch
   - Alert thresholds
   - Escalation path
   
   ## Rollback Plan
   - Same as before
   - Lessons learned applied
   ```

4. **Process Improvements**
   - Better monitoring
   - Earlier detection
   - Faster response
   - Improved testing

### Post-Rollback Checklist

- [ ] Rollback verified successful
- [ ] Stakeholders notified
- [ ] Incident report created
- [ ] Root cause identified
- [ ] Fix developed and tested
- [ ] Post-mortem completed
- [ ] Documentation updated
- [ ] Re-deployment planned
- [ ] Process improvements identified

---

## Rollback Communication Templates

### Emergency Rollback Notification

```markdown
Subject: URGENT - Emergency Rollback - Perfect Swedish Pipeline

Team,

We are performing an EMERGENCY ROLLBACK of the Perfect Swedish Pipeline due to [critical issue].

Status: IN PROGRESS
Time: [timestamp]
ETA: 5 minutes

Impact:
- All users will use old pipeline
- No data loss expected
- Service remains available

Updates will be provided every 15 minutes.

Contact: [on-call engineer]
```

### Rollback Complete Notification

```markdown
Subject: Rollback Complete - Perfect Swedish Pipeline

Team,

Rollback completed successfully.

Timeline:
- Issue detected: [time]
- Rollback initiated: [time]
- Rollback complete: [time]
- Verification complete: [time]

Current Status:
- All users on old pipeline
- Metrics stable
- No ongoing issues

Next Steps:
- Root cause analysis (today)
- Fix development (this week)
- Re-deployment plan (next week)

Full incident report: [link]

Questions? Contact [on-call engineer]
```

---

## Rollback Scenarios

### Scenario 1: OpenAI API Outage

**Symptoms:** High error rate, timeouts, API failures

**Rollback Decision:** Emergency (if prolonged)

**Action:**
```bash
# Check OpenAI status
curl https://status.openai.com/api/v2/status.json

# If major outage:
# Disable new pipeline immediately
PERFECT_SWEDISH_PIPELINE_ENABLED=false

# Wait for OpenAI recovery
# Re-enable when stable
```

### Scenario 2: Database Performance Issues

**Symptoms:** Slow queries, timeouts, high load

**Rollback Decision:** Partial → Emergency if critical

**Action:**
```bash
# Reduce load first
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=25

# Monitor database
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# If not improving:
PERFECT_SWEDISH_PIPELINE_ENABLED=false

# Fix database issues
# Re-enable gradually
```

### Scenario 3: Code Bug

**Symptoms:** Specific error pattern, consistent failures

**Rollback Decision:** Emergency

**Action:**
```bash
# Revert code
git revert <commit-hash>
git push origin main

# Or disable
PERFECT_SWEDISH_PIPELINE_ENABLED=false

# Fix bug
# Test in staging
# Redeploy
```

---

## Emergency Contacts

- **On-Call Engineer:** [Your contact]
- **Render Dashboard:** https://dashboard.render.com/
- **Sentry:** https://sentry.io/organizations/optiprompt/
- **OpenAI Status:** https://status.openai.com/

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-20  
**Next Review:** After each rollback incident
