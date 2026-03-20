# Post-Mortem Template: Perfect Swedish Pipeline

**Incident ID:** [AUTO-GENERATED or MANUAL]  
**Date:** [YYYY-MM-DD]  
**Severity:** [Critical | High | Medium | Low]  
**Status:** [Draft | Under Review | Finalized]

---

## Executive Summary

**One-sentence summary of what happened:**

[Brief description of the incident]

**Impact:**
- **Duration:** [Start time] to [End time] ([Total duration])
- **Users Affected:** [Number or percentage]
- **Service Degradation:** [Description]
- **Data Loss:** [Yes/No - Description if yes]

**Root Cause:**

[One-sentence root cause]

**Resolution:**

[One-sentence resolution]

---

## Incident Details

### Timeline

**All times in UTC**

| Time | Event | Action Taken | By Whom |
|------|-------|--------------|---------|
| 14:00 | Issue first detected | Alert triggered in Sentry | Automated |
| 14:05 | Investigation started | Checked metrics and logs | [Engineer] |
| 14:15 | Root cause identified | Found [specific issue] | [Engineer] |
| 14:20 | Rollback initiated | Disabled new pipeline | [Engineer] |
| 14:25 | Rollback complete | Verified old pipeline active | [Engineer] |
| 14:30 | Service restored | Metrics returned to normal | Automated |
| 14:45 | Monitoring confirmed | No further issues | [Engineer] |

### Detection

**How was the incident detected?**
- [ ] Automated alert (Sentry)
- [ ] Automated alert (Health check)
- [ ] User report
- [ ] Internal monitoring
- [ ] Other: [Specify]

**Detection method details:**

[Describe how the issue was first noticed]

**Time to detection:** [Time from incident start to detection]

### Impact Analysis

**Metrics at Incident:**

| Metric | Normal | During Incident | Impact |
|--------|--------|-----------------|--------|
| Success Rate | 96% | 85% | -11pp |
| Avg Generation Time | 22s | 35s | +13s |
| Fallback Rate | 3% | 15% | +12pp |
| User Satisfaction | 85% | 70% | -15pp |
| Error Rate | 2% | 18% | +16pp |

**User Impact:**

- **Total Users Affected:** [Number]
- **Percentage of User Base:** [Percentage]
- **User Segments Affected:** [Description]
- **User-Facing Errors:** [Description]

**Business Impact:**

- **Revenue Impact:** [Estimated amount or N/A]
- **SLA Breach:** [Yes/No]
- **Support Tickets:** [Number of tickets]
- **Reputation Impact:** [Description]

---

## Root Cause Analysis

### What Happened

**Detailed description of the incident:**

[Comprehensive explanation of what went wrong, including technical details]

### Why It Happened

**Root Cause:**

[Detailed explanation of the underlying cause]

**Contributing Factors:**

1. **Factor 1:** [Description]
2. **Factor 2:** [Description]
3. **Factor 3:** [Description]

### Why It Wasn't Caught Earlier

**Prevention Gaps:**

- [ ] Insufficient testing
- [ ] Missing monitoring
- [ ] Inadequate alerting
- [ ] Code review oversight
- [ ] Other: [Specify]

**Details:**

[Explain why existing safeguards didn't prevent or detect the issue earlier]

---

## Resolution

### Immediate Actions Taken

**Rollback:**

- **Method:** [Disable pipeline / Reduce percentage / Git revert]
- **Time to Rollback:** [Duration]
- **Verification:** [How rollback was verified]

**Communication:**

- **Internal:** [Who was notified and when]
- **External:** [User communication if any]

### Temporary Workarounds

[Any temporary solutions applied]

### Permanent Fix

**Fix Description:**

[Detailed description of the permanent solution]

**Code Changes:**

- **Files Modified:** [List of files]
- **Pull Request:** [Link to PR]
- **Code Review:** [Reviewer names]

**Testing:**

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Staging deployment tested
- [ ] Load testing performed

**Deployment:**

- **Deployment Date:** [Date]
- **Deployment Method:** [Description]
- **Verification:** [How fix was verified]

---

## Lessons Learned

### What Went Well

1. **Detection:** [What worked well in detecting the issue]
2. **Response:** [What worked well in responding]
3. **Communication:** [What worked well in communication]
4. **Recovery:** [What worked well in recovery]

### What Went Poorly

1. **Detection:** [What could have been better]
2. **Response:** [What could have been better]
3. **Communication:** [What could have been better]
4. **Recovery:** [What could have been better]

### Where We Got Lucky

[Things that could have made the incident worse but didn't happen]

---

## Action Items

### Immediate (This Week)

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | [Name] | [Date] | [ ] |
| [Action 2] | [Name] | [Date] | [ ] |
| [Action 3] | [Name] | [Date] | [ ] |

### Short-term (This Month)

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | [Name] | [Date] | [ ] |
| [Action 2] | [Name] | [Date] | [ ] |
| [Action 3] | [Name] | [Date] | [ ] |

### Long-term (This Quarter)

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | [Name] | [Date] | [ ] |
| [Action 2] | [Name] | [Date] | [ ] |
| [Action 3] | [Name] | [Date] | [ ] |

---

## Prevention Measures

### Monitoring Improvements

**New Alerts:**
- [ ] [Alert 1 description]
- [ ] [Alert 2 description]

**Threshold Adjustments:**
- [ ] [Threshold 1 adjustment]
- [ ] [Threshold 2 adjustment]

**New Metrics:**
- [ ] [Metric 1 to track]
- [ ] [Metric 2 to track]

### Testing Improvements

**New Tests:**
- [ ] [Test 1 description]
- [ ] [Test 2 description]

**Test Coverage:**
- [ ] Increase coverage in [area]
- [ ] Add edge case tests for [scenario]

### Process Improvements

**Code Review:**
- [ ] [Improvement 1]
- [ ] [Improvement 2]

**Deployment:**
- [ ] [Improvement 1]
- [ ] [Improvement 2]

**Documentation:**
- [ ] Update [document 1]
- [ ] Create [document 2]

---

## Supporting Information

### Relevant Links

- **Sentry Issue:** [Link]
- **GitHub Issue:** [Link]
- **Pull Request (Fix):** [Link]
- **Slack Thread:** [Link]
- **Metrics Dashboard:** [Link]

### Logs and Screenshots

**Error Logs:**
```
[Paste relevant error logs]
```

**Metrics Screenshots:**

[Attach or link to screenshots showing metrics during incident]

**Sentry Screenshots:**

[Attach or link to Sentry error screenshots]

### Related Incidents

- **Incident #1:** [Link] - [Brief description]
- **Incident #2:** [Link] - [Brief description]

---

## Review and Sign-off

### Reviewers

| Name | Role | Review Date | Approved |
|------|------|-------------|----------|
| [Name] | [Role] | [Date] | [ ] |
| [Name] | [Role] | [Date] | [ ] |
| [Name] | [Role] | [Date] | [ ] |

### Follow-up Meeting

**Date:** [Date]  
**Attendees:** [List]  
**Agenda:**
- Review post-mortem
- Discuss action items
- Assign owners and deadlines
- Plan prevention measures

---

## Appendix

### Technical Details

**System Configuration:**
```
PERFECT_SWEDISH_PIPELINE_ENABLED=true
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=50
NODE_ENV=production
```

**Database State:**
```sql
-- Relevant database queries and results
```

**Code Snippets:**
```typescript
// Relevant code that caused or fixed the issue
```

### Metrics Data

**Raw Metrics:**
```json
{
  "variant": "treatment",
  "successRate": 85.2,
  "avgGenerationTime": 35000,
  "fallbackRate": 15.3,
  "userSatisfaction": 0.70,
  "sampleSize": 450
}
```

---

**Document Status:** [Draft | Under Review | Finalized]  
**Last Updated:** [Date]  
**Next Review:** [Date]
