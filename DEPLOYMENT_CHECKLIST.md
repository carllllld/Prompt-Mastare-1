# 🚀 Deployment Checklist

**Date:** March 27, 2026  
**Status:** Ready for deployment  
**Estimated Time:** 3-4 hours

---

## Pre-Deployment Verification

### Code Changes Verified ✅
- [x] `server/lib/url-validator.ts` - Created
- [x] `server/lib/rate-limiter.ts` - Created
- [x] `server/lib/image-downloader.ts` - Modified
- [x] `server/lib/image-analyzer.ts` - Modified
- [x] `server/lib/hemnet-integration.ts` - Modified
- [x] `server/routes.ts` - Modified

### Files Listed
```
✅ url-validator.ts
✅ rate-limiter.ts
✅ image-downloader.ts
✅ image-analyzer.ts
✅ hemnet-integration.ts
✅ vitec-integration.ts
```

---

## Step 1: Local Build & Test (30 minutes)

### Build
```bash
npm run build
```
**Expected:** No errors, successful compilation

### Type Check
```bash
npm run check
```
**Expected:** No type errors

### Run Tests
```bash
npm run test
```
**Expected:** All tests pass

### Checklist
- [ ] Build completes without errors
- [ ] No type errors
- [ ] Tests pass
- [ ] No warnings

---

## Step 2: Staging Deployment (1 hour)

### Deploy to Staging
```bash
git add .
git commit -m "fix: implement critical production hardening fixes

- Add SSRF protection for URLs
- Add rate limiting for image analysis
- Add timeout protection for image analysis
- Fix cached image handling
- Add retry logic with exponential backoff
- Improve error recovery and warnings
- Upgrade GPT-4 model and detail level"

git push origin main
```

**Expected:** Auto-deploy to staging

### Verify Staging Deployment
- [ ] Application starts without errors
- [ ] No error logs in Sentry
- [ ] Health check passes
- [ ] Database migrations complete

---

## Step 3: Integration Testing (1 hour)

### Test SSRF Protection
```bash
# Test with private IP (should be blocked)
curl -X POST http://staging.example.com/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrls": ["http://127.0.0.1:3000/admin"],
    "propertyData": {...}
  }'
# Expected: 400 error or blocked URL warning
```

### Test Rate Limiting
```bash
# Make 11 requests in quick succession
for i in {1..11}; do
  curl -X POST http://staging.example.com/api/optimize \
    -H "Content-Type: application/json" \
    -d '{...}'
done
# Expected: 11th request returns 429
```

### Test Timeout Protection
```bash
# Test with slow image
curl -X POST http://staging.example.com/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrls": ["https://slow-api.example.com/image.jpg"],
    "propertyData": {...}
  }'
# Expected: Timeout after 30 seconds, continues without image
```

### Test Hemnet Import
```bash
# Test with real Hemnet URL
curl -X POST http://staging.example.com/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "hemnetUrl": "https://www.hemnet.se/bostader/...",
    "propertyData": {...}
  }'
# Expected: Success with images downloaded and analyzed
```

### Test Error Recovery
```bash
# Test with invalid image URL
curl -X POST http://staging.example.com/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrls": ["http://invalid-domain-12345.com/image.jpg"],
    "propertyData": {...}
  }'
# Expected: Success with warning about failed image download
```

### Checklist
- [ ] SSRF protection working
- [ ] Rate limiting working
- [ ] Timeout protection working
- [ ] Hemnet import working
- [ ] Error recovery working
- [ ] No errors in logs

---

## Step 4: Load Testing (30 minutes)

### Load Test Setup
```bash
# Install load testing tool
npm install -g artillery

# Create load test config
cat > load-test.yml << EOF
config:
  target: "http://staging.example.com"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up"
    - duration: 60
      arrivalRate: 100
      name: "Spike"
scenarios:
  - name: "Optimize endpoint"
    flow:
      - post:
          url: "/api/optimize"
          json:
            prompt: "Describe this property"
            propertyData:
              address: "Test Address"
              area: 100
              rooms: 3
              price: 5000000
EOF
```

### Run Load Test
```bash
artillery run load-test.yml
```

### Verify Results
- [ ] Response time < 5 seconds (p95)
- [ ] Error rate < 1%
- [ ] No timeouts
- [ ] No memory leaks
- [ ] CPU usage reasonable

---

## Step 5: Monitoring Setup (15 minutes)

### Verify Sentry Integration
- [ ] Sentry project configured
- [ ] Error tracking active
- [ ] Rate limit violations logged
- [ ] Timeout events logged
- [ ] SSRF blocks logged

### Verify Metrics
- [ ] Image download success rate tracked
- [ ] Image analysis success rate tracked
- [ ] Rate limit violations tracked
- [ ] Timeout occurrences tracked

### Verify Alerts
- [ ] Alert on error rate > 1%
- [ ] Alert on rate limit violations > 5/day
- [ ] Alert on timeout rate > 1%
- [ ] Alert on SSRF blocks > 10/day

---

## Step 6: Production Deployment (30 minutes)

### Pre-Production Checklist
- [ ] All staging tests passed
- [ ] Load tests passed
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Team notified

### Deploy to Production
```bash
# Verify main branch is up to date
git status
# Expected: "On branch main, nothing to commit"

# Deploy (auto-deploy on git push)
# Already pushed to main in staging step
```

**Expected:** Auto-deploy to production

### Verify Production Deployment
- [ ] Application starts without errors
- [ ] Health check passes
- [ ] No error spikes in Sentry
- [ ] Response times normal
- [ ] Database queries normal

---

## Step 7: Post-Deployment Monitoring (24 hours)

### Hour 1: Critical Monitoring
- [ ] Error rate < 1%
- [ ] Response time < 5s
- [ ] No SSRF blocks
- [ ] No rate limit violations
- [ ] No timeout events

### Hour 2-4: Continued Monitoring
- [ ] Error rate stable
- [ ] Response time stable
- [ ] User feedback positive
- [ ] No critical issues

### Hour 4-24: Extended Monitoring
- [ ] Error rate remains < 1%
- [ ] Response time remains < 5s
- [ ] No performance degradation
- [ ] User adoption normal
- [ ] No rollback needed

### Checklist
- [ ] Monitor Sentry for errors
- [ ] Monitor response times
- [ ] Monitor error rates
- [ ] Monitor user feedback
- [ ] Check logs for issues

---

## Rollback Plan

### If Critical Issues Occur

```bash
# Revert to previous version
git revert <commit-hash>
git push origin main

# Or disable image analysis temporarily
export DISABLE_IMAGE_ANALYSIS=true
```

### Rollback Checklist
- [ ] Identify issue
- [ ] Notify team
- [ ] Execute rollback
- [ ] Verify rollback successful
- [ ] Investigate root cause
- [ ] Plan fix

---

## Success Criteria

### Deployment Success
- ✅ All code deployed
- ✅ No errors on startup
- ✅ Health checks pass
- ✅ Monitoring active

### Testing Success
- ✅ SSRF protection working
- ✅ Rate limiting working
- ✅ Timeout protection working
- ✅ Error recovery working

### Performance Success
- ✅ Response time < 5s
- ✅ Error rate < 1%
- ✅ No memory leaks
- ✅ CPU usage normal

### User Success
- ✅ No user complaints
- ✅ Feature working as expected
- ✅ Performance acceptable
- ✅ No critical issues

---

## Communication Plan

### Before Deployment
- [ ] Notify team of deployment
- [ ] Share deployment plan
- [ ] Confirm rollback plan
- [ ] Set up monitoring

### During Deployment
- [ ] Monitor deployment progress
- [ ] Check for errors
- [ ] Verify health checks
- [ ] Update team

### After Deployment
- [ ] Confirm successful deployment
- [ ] Share monitoring dashboard
- [ ] Provide status updates
- [ ] Gather feedback

---

## Documentation

### Deployment Documentation
- [x] FIXES_APPLIED_COMPLETE.md - What was fixed
- [x] IMPLEMENTATION_VERIFICATION.md - Verification report
- [x] FINAL_SUMMARY.md - Overall summary
- [x] DEPLOYMENT_CHECKLIST.md - This document

### Runbooks
- [ ] Create runbook for SSRF blocks
- [ ] Create runbook for rate limit violations
- [ ] Create runbook for timeout events
- [ ] Create runbook for rollback

---

## Team Assignments

### Deployment Lead
- [ ] Oversee deployment
- [ ] Monitor progress
- [ ] Handle issues
- [ ] Communicate status

### Monitoring Lead
- [ ] Monitor Sentry
- [ ] Monitor metrics
- [ ] Alert on issues
- [ ] Investigate problems

### Testing Lead
- [ ] Run integration tests
- [ ] Run load tests
- [ ] Verify functionality
- [ ] Document results

### Communication Lead
- [ ] Notify team
- [ ] Update status
- [ ] Gather feedback
- [ ] Document lessons learned

---

## Timeline

### Day 1: Deployment
- 09:00 - Start build & test (30 min)
- 09:30 - Deploy to staging (1 hour)
- 10:30 - Integration testing (1 hour)
- 11:30 - Load testing (30 min)
- 12:00 - Monitoring setup (15 min)
- 12:15 - Deploy to production (30 min)
- 12:45 - Post-deployment monitoring (1 hour)

### Day 2-7: Continued Monitoring
- Daily checks of error rates
- Daily checks of response times
- Weekly performance review
- Gather user feedback

---

## Sign-Off

### Pre-Deployment Sign-Off
- [ ] Code review complete
- [ ] Tests passing
- [ ] Staging verified
- [ ] Ready for production

### Post-Deployment Sign-Off
- [ ] Deployment successful
- [ ] Monitoring active
- [ ] No critical issues
- [ ] Ready for normal operations

---

## Contact Information

### On-Call Engineer
- Name: [Your Name]
- Phone: [Your Phone]
- Email: [Your Email]

### Escalation
- Level 1: On-call engineer
- Level 2: Team lead
- Level 3: Engineering manager

---

## Additional Resources

### Documentation
- FIXES_APPLIED_COMPLETE.md
- IMPLEMENTATION_VERIFICATION.md
- FINAL_SUMMARY.md
- README_START_HERE.md

### Monitoring
- Sentry Dashboard: [URL]
- Metrics Dashboard: [URL]
- Logs: [URL]

### Runbooks
- SSRF Protection Runbook: [URL]
- Rate Limiting Runbook: [URL]
- Timeout Handling Runbook: [URL]
- Rollback Runbook: [URL]

---

**Deployment Checklist Complete**  
**Ready for Production Deployment**  
**Status:** ✅ READY

---

## Quick Reference

### Build & Test
```bash
npm run build
npm run check
npm run test
```

### Deploy
```bash
git push origin main
```

### Monitor
- Sentry: Check for errors
- Metrics: Check response times
- Logs: Check for issues

### Rollback
```bash
git revert <commit-hash>
git push origin main
```

---

**Next Step:** Execute Step 1 (Local Build & Test)
