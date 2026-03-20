# Perfect Swedish Pipeline - Operations Documentation Index

**Version:** 1.0  
**Last Updated:** 2026-01-20  
**Status:** Complete

---

## Overview

This directory contains comprehensive deployment and operations documentation for the Perfect Swedish Pipeline. All documentation is production-ready and covers the complete operational lifecycle from deployment to incident response.

---

## Documentation Structure

### 📘 Core Documentation

1. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**
   - Pre-deployment checklist
   - Environment configuration
   - Database migration procedures
   - Staging deployment steps
   - Production deployment (gradual rollout)
   - Rollback procedures
   - Post-deployment verification

2. **[OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md)**
   - Common operations tasks
   - Monitoring and metrics access
   - Alert response procedures
   - Performance tuning
   - Database operations
   - Cache management
   - A/B test management

3. **[TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)**
   - Quick diagnostics
   - Common issues and solutions
   - Performance issues
   - Error patterns
   - User-reported issues
   - Integration issues

4. **[ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md)**
   - Rollback decision matrix
   - Emergency rollback procedures
   - Planned rollback procedures
   - Partial rollback strategies
   - Rollback verification
   - Post-rollback actions

5. **[MONITORING_SETUP.md](./MONITORING_SETUP.md)**
   - Metrics collection
   - Alert configuration
   - Dashboard setup
   - Sentry integration
   - Automated health checks
   - Custom notifications

6. **[POST_MORTEM_TEMPLATE.md](./POST_MORTEM_TEMPLATE.md)**
   - Incident documentation template
   - Root cause analysis framework
   - Action items tracking
   - Prevention measures

---

## Quick Reference

### Emergency Contacts

- **On-Call Engineer:** [Your contact info]
- **Sentry Dashboard:** https://sentry.io/organizations/optiprompt/
- **Render Dashboard:** https://dashboard.render.com/
- **OpenAI Status:** https://status.openai.com/

### Critical Commands

```bash
# Emergency rollback (fastest)
# In Render: PERFECT_SWEDISH_PIPELINE_ENABLED=false

# Check system health
curl https://optiprompt.se/api/perfect-swedish/health

# Check current metrics
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# View daily summary
curl https://optiprompt.se/api/perfect-swedish/metrics/summary
```

### Key Metrics Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Success Rate | ≥95% | <95% | <90% |
| Generation Time | <25s | >25s | >30s |
| Fallback Rate | <10% | >10% | >20% |
| User Satisfaction | ≥70% | <70% | <60% |

---

## Documentation by Role

### DevOps / SRE

**Primary Documents:**
1. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - For deployments
2. [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - For daily operations
3. [MONITORING_SETUP.md](./MONITORING_SETUP.md) - For monitoring configuration

**Key Sections:**
- Environment configuration
- Database operations
- Cache management
- Metrics collection
- Alert configuration

### On-Call Engineers

**Primary Documents:**
1. [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - For incident response
2. [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md) - For rollback procedures
3. [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - For alert response

**Key Sections:**
- Quick diagnostics
- Common issues
- Emergency rollback
- Alert response
- Escalation path

### Support Engineers

**Primary Documents:**
1. [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - For user issues
2. [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - For metrics access

**Key Sections:**
- User-reported issues
- Quick diagnostics
- Monitoring and metrics
- Common operations

### Product / Management

**Primary Documents:**
1. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - For rollout planning
2. [MONITORING_SETUP.md](./MONITORING_SETUP.md) - For metrics understanding
3. [POST_MORTEM_TEMPLATE.md](./POST_MORTEM_TEMPLATE.md) - For incident review

**Key Sections:**
- Gradual rollout strategy
- Success criteria
- Key metrics
- Business impact

---

## Documentation by Scenario

### Scenario: First Deployment

**Documents to Read:**
1. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete guide
   - Pre-deployment checklist
   - Environment configuration
   - Database migration
   - Staging deployment
   - Production deployment (10% canary)

2. [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Setup monitoring
   - Verify metrics collection
   - Configure alerts
   - Test health checks

**Checklist:**
- [ ] Read deployment guide
- [ ] Complete pre-deployment checklist
- [ ] Configure environment variables
- [ ] Run database migration
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production (10%)
- [ ] Monitor for 24 hours

### Scenario: Alert Triggered

**Documents to Read:**
1. [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - Alert response
   - Alert types
   - Response procedures
   - Escalation path

2. [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - Diagnosis
   - Quick diagnostics
   - Common issues
   - Error patterns

3. [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md) - If needed
   - Rollback decision matrix
   - Emergency rollback

**Checklist:**
- [ ] Check alert details
- [ ] Run quick diagnostics
- [ ] Identify issue type
- [ ] Follow response procedure
- [ ] Escalate if needed
- [ ] Document incident

### Scenario: Performance Degradation

**Documents to Read:**
1. [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - Performance issues
   - Slow Step 1, 2, or 3
   - Database issues
   - Redis issues

2. [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - Performance tuning
   - Optimization strategies
   - Database operations
   - Cache management

**Checklist:**
- [ ] Check current metrics
- [ ] Identify bottleneck
- [ ] Review troubleshooting guide
- [ ] Apply optimization
- [ ] Monitor improvement
- [ ] Document changes

### Scenario: User Complaints

**Documents to Read:**
1. [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - User-reported issues
   - Common user issues
   - Diagnosis steps
   - Solutions

2. [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - Check metrics
   - User satisfaction
   - Regeneration rate
   - Feedback analysis

**Checklist:**
- [ ] Gather user details
- [ ] Check user's generations
- [ ] Review metrics
- [ ] Identify pattern
- [ ] Apply solution
- [ ] Follow up with user

### Scenario: Need to Rollback

**Documents to Read:**
1. [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md) - Complete guide
   - Decision matrix
   - Rollback procedures
   - Verification
   - Post-rollback actions

2. [POST_MORTEM_TEMPLATE.md](./POST_MORTEM_TEMPLATE.md) - Document incident
   - Incident details
   - Root cause analysis
   - Action items

**Checklist:**
- [ ] Assess severity
- [ ] Choose rollback method
- [ ] Execute rollback
- [ ] Verify rollback
- [ ] Notify stakeholders
- [ ] Create post-mortem
- [ ] Plan fix

### Scenario: Gradual Rollout

**Documents to Read:**
1. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Rollout phases
   - Phase 1: Canary (10%)
   - Phase 2: Expanded (50%)
   - Phase 3: Full (100%)

2. [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Monitor progress
   - Key metrics
   - Success criteria
   - Alert thresholds

**Checklist:**
- [ ] Complete Phase 1 (10%)
- [ ] Monitor for 7 days
- [ ] Verify success criteria
- [ ] Increase to Phase 2 (50%)
- [ ] Monitor for 14 days
- [ ] Verify success criteria
- [ ] Increase to Phase 3 (100%)
- [ ] Monitor continuously

---

## Common Tasks

### Daily Operations

**Morning Checklist:**
```bash
# 1. Check daily summary
curl https://optiprompt.se/api/perfect-swedish/metrics/summary

# 2. Review Sentry errors
# Visit: https://sentry.io/organizations/optiprompt/issues/

# 3. Check current metrics
curl https://optiprompt.se/api/perfect-swedish/metrics/current/treatment

# 4. Review support tickets
# Check for pipeline-related issues
```

**Reference:** [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - Common Operations

### Weekly Operations

**Weekly Review:**
- Analyze A/B test results
- Review performance trends
- Check database size
- Update documentation if needed

**Reference:** [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - Monitoring and Metrics

### Monthly Operations

**Monthly Maintenance:**
- Clean up old data (>90 days)
- Review and optimize slow queries
- Analyze long-term trends
- Plan next improvements

**Reference:** [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - Database Operations

---

## API Endpoints Reference

### Metrics Endpoints

```bash
# Current metrics (last hour)
GET /api/perfect-swedish/metrics/current/{variant}

# Historical metrics
GET /api/perfect-swedish/metrics/historical?days=7

# Daily summary
GET /api/perfect-swedish/metrics/summary

# Export metrics
GET /api/perfect-swedish/metrics/export?format=json
```

### Health Endpoints

```bash
# System health
GET /api/perfect-swedish/health

# Trigger health check
POST /api/perfect-swedish/alerts/check
```

### Alert Endpoints

```bash
# Get alert thresholds
GET /api/perfect-swedish/alerts/thresholds

# Update alert thresholds
POST /api/perfect-swedish/alerts/thresholds
```

**Reference:** [MONITORING_SETUP.md](./MONITORING_SETUP.md) - API Endpoints

---

## Environment Variables

### Required

```bash
# Existing (already configured)
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
REDIS_URL=redis://...
SENTRY_DSN=https://...

# New (Perfect Swedish Pipeline)
PERFECT_SWEDISH_PIPELINE_ENABLED=true
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=50
NODE_ENV=production
```

**Reference:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Environment Configuration

---

## Monitoring Dashboards

### Sentry
- **URL:** https://sentry.io/organizations/optiprompt/
- **Filters:** `component:perfect-swedish-*`
- **Purpose:** Error tracking and alerting

### Render
- **URL:** https://dashboard.render.com/
- **Purpose:** Deployment, logs, metrics, environment

### Metrics API
- **URL:** https://optiprompt.se/api/perfect-swedish/metrics/current/treatment
- **Purpose:** Real-time metrics access

**Reference:** [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Dashboard Setup

---

## Training Resources

### New Team Members

**Onboarding Checklist:**
- [ ] Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Overview
- [ ] Read [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - Daily operations
- [ ] Review [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Monitoring system
- [ ] Practice with [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)
- [ ] Shadow on-call engineer
- [ ] Complete test deployment to staging

### On-Call Training

**Preparation:**
- [ ] Read [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - Complete guide
- [ ] Read [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md) - Emergency procedures
- [ ] Review [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) - Alert response
- [ ] Test access to all systems (Sentry, Render, Database)
- [ ] Practice rollback in staging
- [ ] Review recent incidents

---

## Document Maintenance

### Review Schedule

| Document | Review Frequency | Last Review | Next Review |
|----------|------------------|-------------|-------------|
| DEPLOYMENT_GUIDE.md | After major changes | 2026-01-20 | After full rollout |
| OPERATIONS_RUNBOOK.md | Monthly | 2026-01-20 | 2026-02-20 |
| TROUBLESHOOTING_GUIDE.md | After incidents | 2026-01-20 | After incidents |
| ROLLBACK_PLAN.md | After rollbacks | 2026-01-20 | After rollbacks |
| MONITORING_SETUP.md | Quarterly | 2026-01-20 | 2026-04-20 |
| POST_MORTEM_TEMPLATE.md | Annually | 2026-01-20 | 2027-01-20 |

### Update Process

1. **Identify Need:** Incident, process change, or scheduled review
2. **Draft Updates:** Make changes to relevant documents
3. **Review:** Team review of changes
4. **Approve:** Technical lead approval
5. **Publish:** Update documents and notify team
6. **Archive:** Keep old versions for reference

---

## Feedback and Improvements

### How to Contribute

**Found an issue or have a suggestion?**

1. **Document Issue:**
   - What document?
   - What section?
   - What's wrong or missing?

2. **Propose Solution:**
   - What should be changed?
   - Why is this better?

3. **Submit:**
   - Create GitHub issue
   - Or email: devops@optiprompt.se

### Recent Updates

- **2026-01-20:** Initial documentation created (Task 19)
- [Future updates will be listed here]

---

## Related Documentation

### Implementation Documentation

- [requirements.md](./requirements.md) - Feature requirements
- [design.md](./design.md) - Technical design
- [tasks.md](./tasks.md) - Implementation tasks
- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - Implementation summary

### Testing Documentation

- [server/tests/load/README.md](../../server/tests/load/README.md) - Load testing guide
- [server/tests/load/OPTIMIZATION_GUIDE.md](../../server/tests/load/OPTIMIZATION_GUIDE.md) - Performance optimization

---

## Support

### Getting Help

**For operational issues:**
1. Check [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)
2. Check [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md)
3. Contact on-call engineer
4. Escalate if needed

**For documentation issues:**
1. Check this index
2. Search relevant document
3. Contact documentation maintainer

**For training:**
1. Follow onboarding checklist
2. Shadow experienced team member
3. Practice in staging environment

---

**Index Version:** 1.0  
**Last Updated:** 2026-01-20  
**Maintained By:** DevOps Team  
**Next Review:** 2026-02-20
