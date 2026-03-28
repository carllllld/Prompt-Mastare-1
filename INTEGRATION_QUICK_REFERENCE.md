# Integration Quick Reference

Quick lookup for OptiPrompt integrations - what works, what doesn't, and what to do.

---

## Status at a Glance

| Integration | Status | Score | Notes |
|------------|--------|-------|-------|
| OpenAI | ✅ Perfect | 9.5/10 | Enterprise-grade, working perfectly |
| Stripe | ✅ Perfect | 8.5/10 | Production-ready, minor improvements possible |
| Vitec Import | ✅ Perfect | 9/10 | Working perfectly in production |
| Vitec Export | ⚠️ UNTESTED | 7/10 | **CRITICAL: Needs real account testing** |
| Hemnet | ✅ Perfect | 9/10 | Robust scraping, working well |
| Resend | 🔧 Good | 8/10 | Working, needs webhook handler |
| Redis | 🔧 Good | 7/10 | Working, underutilized |
| Sentry | ✅ Perfect | 9.5/10 | Excellent error tracking |

---

## What to Fix First

### 🚨 CRITICAL (Do Now)

**Vitec Export Testing** (4-6 hours)
```bash
# Problem: Export endpoints untested, might not work
# Action: Test with real Vitec account
# Contact: support@vitec.se
```

**Vitec Encryption Key** (30 minutes)
```bash
# Problem: Hardcoded encryption key (security issue)
# Action: Move to environment variable
# File: server/lib/vitec-export.ts
```

### ⚠️ HIGH (This Week)

**Stripe Webhook Logging** (1 hour)
```sql
-- Add persistent webhook log
CREATE TABLE stripe_webhook_log (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW()
);
```

### 🔧 MEDIUM (This Month)

**Resend Webhook Handler** (2 hours)
```typescript
// Track email delivery status
app.post('/api/resend/webhook', async (req, res) => {
  const { type, email, status } = req.body;
  if (type === 'email.delivered') {
    await markEmailDelivered(email);
  }
});
```

**Email Queue Persistence** (3 hours)
```sql
-- Move queue from memory to database
CREATE TABLE email_queue (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  to TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER DEFAULT 0
);
```

---

## Integration Details

### OpenAI (GPT-5.2)

**Status**: ✅ Working perfectly  
**Files**: `server/lib/openai-resilient-client.ts`

**Features**:
- Circuit breaker pattern
- Retry logic with exponential backoff
- Timeout protection (30s)
- Token tracking and cost calculation
- Comprehensive observability

**Environment Variables**:
```bash
OPENAI_API_KEY=sk-...
```

**No action needed** - Working perfectly ✅

---

### Stripe (Payments)

**Status**: ✅ Working perfectly  
**Files**: `server/routes.ts` (lines 4270-4500)

**Features**:
- Webhook signature verification
- Event deduplication
- Smart payment failure handling
- Subscription lifecycle management

**Environment Variables**:
```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
```

**Minor improvement**: Add webhook logging (1 hour)

---

### Vitec (Mäklarsystem)

**Import Status**: ✅ Working perfectly  
**Export Status**: ⚠️ UNTESTED (CRITICAL)  
**Files**: `server/lib/vitec-integration.ts`, `server/lib/vitec-export.ts`

**Import Features**:
- Maps 40+ property fields
- Fallback endpoints
- Custom error classes

**Export Problems**:
- PUT endpoints untested
- Might be read-only
- Encryption key hardcoded

**Environment Variables**:
```bash
# Stored encrypted in database per user
# Need to add:
VITEC_ENCRYPTION_KEY=<32-byte-key>
```

**Action required**: Test export with real account (4-6 hours)

---

### Hemnet (Property Listings)

**Status**: ✅ Working perfectly  
**Files**: `server/lib/hemnet-integration.ts`

**Features**:
- Multiple parsing strategies
- Rate limiting with exponential backoff
- Image caching with SHA-256
- Anti-detection measures

**No environment variables needed** (web scraping)

**Minor improvement**: Add structure monitoring (1 hour)

---

### Resend (Email)

**Status**: 🔧 Working, needs webhook handler  
**Files**: `server/lib/email-service.ts`

**Features**:
- Queue system with retry logic
- Rate limiting
- Template system

**Missing**:
- Webhook handler for delivery tracking
- Email queue persistence

**Environment Variables**:
```bash
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@optiprompt.se
```

**Action required**: Add webhook handler (2 hours)

---

### Redis (Caching)

**Status**: 🔧 Working, underutilized  
**Files**: `server/lib/redis-cache.ts`

**Features**:
- Optional with graceful degradation
- Reconnection logic
- A/B test caching

**Missing**:
- User plan caching
- Integration settings caching
- Generated text caching

**Environment Variables**:
```bash
REDIS_URL=redis://... # Optional
```

**Action required**: Expand caching (2-3 hours)

---

### Sentry (Error Tracking)

**Status**: ✅ Working perfectly  
**Files**: `server/index.ts`, used throughout

**Features**:
- Comprehensive coverage
- Context-aware error reporting
- Performance monitoring

**Environment Variables**:
```bash
SENTRY_DSN=https://...@sentry.io/...
```

**No action needed** - Working perfectly ✅

---

## Quick Commands

### Test Vitec Export
```bash
# 1. Get test Vitec account
# 2. Add credentials to database
# 3. Test export from UI
# 4. Verify in Vitec
```

### Add Webhook Logging
```bash
# 1. Create table
psql $DATABASE_URL -c "CREATE TABLE stripe_webhook_log (...)"

# 2. Add logging to webhook handler
# Edit server/routes.ts line ~4380

# 3. Test with Stripe CLI
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

### Monitor Hemnet
```bash
# Add daily health check
# Edit server/lib/hemnet-integration.ts
# Add cron job or scheduled task
```

---

## Contact Information

- **Vitec Support**: support@vitec.se
- **Stripe Support**: https://support.stripe.com
- **Resend Support**: https://resend.com/support
- **OpenAI Support**: https://help.openai.com

---

## Files to Edit

### Critical Fixes
- `server/lib/vitec-export.ts` - Fix encryption key
- `server/routes.ts` - Add webhook logging

### Medium Priority
- `server/lib/email-service.ts` - Add webhook handler
- `server/lib/email-queue.ts` - Persist queue

### Low Priority
- `server/lib/redis-cache.ts` - Expand caching
- `server/lib/hemnet-integration.ts` - Add monitoring

---

**Full Analysis**: See `INTEGRATION_DEEP_ANALYSIS_VERIFIED.md`  
**Summary**: See `INTEGRATION_ANALYSIS_SUMMARY.md`

