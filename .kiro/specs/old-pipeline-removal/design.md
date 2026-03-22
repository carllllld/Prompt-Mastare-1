# Design Document: Old Pipeline Removal

## Overview

This feature removes the OLD 7-step pipeline (~2900 lines in routes.ts) and fully migrates to the NEW 3-step PerfectSwedishOrchestrator pipeline. The OLD pipeline was built for GPT-3.5 with extensive workarounds, while the NEW pipeline leverages GPT-5.2 reasoning capabilities for cleaner, faster, and cheaper text generation.

**Current State:**
- OLD Pipeline: routes.ts lines 3200-6100 (~2900 lines), 7-step architecture with multiple AI calls
- NEW Pipeline: PerfectSwedishOrchestrator (~300 lines), 3-step architecture with single AI call
- Status: NEW pipeline is active in production, OLD pipeline code remains but is unused

**Goals:**
1. Remove all OLD pipeline code (~2900 lines)
2. Preserve critical utility functions (emergency fallback)
3. Ensure zero production downtime during migration
4. Maintain or improve quality, speed, and cost metrics
5. Comprehensive monitoring and rollback capability

## Architecture

### Current Architecture (Before Removal)

```
┌─────────────────────────────────────────────────────────────┐
│                        routes.ts                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  NEW Pipeline (Active, ~300 lines)                     │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  PerfectSwedishOrchestrator                      │ │ │
│  │  │  ├─ SmartGenerationEngine (GPT-5.2)             │ │ │
│  │  │  ├─ DeterministicPostProcessor                  │ │ │
│  │  │  └─ ExpertAIAnalyzer                            │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  OLD Pipeline (Unused, ~2900 lines) ❌ TO BE REMOVED  │ │
│  │  ├─ Step 1: Initial generation                        │ │
│  │  ├─ Step 2: finalizeMainMarketingText                │ │
│  │  ├─ Step 3: Quality validation                        │ │
│  │  ├─ Step 4: Post-processing                           │ │
│  │  ├─ Step 5: Correction pass                           │ │
│  │  ├─ Step 6: Expansion pass                            │ │
│  │  └─ Step 7: Fact-checking pass                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Shared Utilities (To Preserve)                        │ │
│  │  └─ buildDeterministicFallbackDescription             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (After Removal)

```
┌─────────────────────────────────────────────────────────────┐
│                    routes.ts (Simplified)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  NEW Pipeline (Only Pipeline)                          │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  PerfectSwedishOrchestrator                      │ │ │
│  │  │  ├─ SmartGenerationEngine (GPT-5.2)             │ │ │
│  │  │  ├─ DeterministicPostProcessor                  │ │ │
│  │  │  ├─ ExpertAIAnalyzer                            │ │ │
│  │  │  └─ EmergencyFallback (new)                     │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────────────────┐
                              │                                 │
                              ▼                                 ▼
┌─────────────────────────────────────┐  ┌──────────────────────────────────┐
│  server/lib/                        │  │  server/lib/                     │
│  perfect-swedish-fallback.ts (new)  │  │  disposition-builder.ts          │
│  ├─ buildDeterministicFallback      │  │  └─ buildDispositionFromData     │
│  └─ Emergency template generation   │  └──────────────────────────────────┘
└─────────────────────────────────────┘
```

## Components and Interfaces

### 1. Emergency Fallback Module (New)

**Location:** `server/lib/perfect-swedish-fallback.ts`

**Purpose:** Provides deterministic emergency text generation when NEW pipeline fails completely.

**Interface:**
```typescript
export interface FallbackRequest {
  disposition: any;
  style: WritingStyle;
  platform: string;
  userId: string;
  sessionId: string;
  originalError: Error;
}

export interface FallbackResult {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  isFallback: true;
  fallbackReason: string;
}

export class PerfectSwedishFallback {
  generate(request: FallbackRequest): FallbackResult;
}
```

**Key Functions:**
- `buildDeterministicFallbackDescription()` - Migrated from routes.ts
- `buildFallbackLocationSentence()` - Migrated from routes.ts
- `formatFallbackValue()` - Migrated from routes.ts

### 2. Enhanced PerfectSwedishOrchestrator

**Location:** `server/lib/perfect-swedish-orchestrator.ts`

**Changes:**
- Add emergency fallback integration
- Add fallback metrics tracking
- Add Sentry logging for fallback events

**New Method:**
```typescript
private async executeWithFallback(request: PipelineRequest): Promise<PipelineResult> {
  try {
    return await this.executeNewPipeline(request);
  } catch (error) {
    // Log to Sentry
    Sentry.captureException(error, {
      tags: { component: 'pipeline', fallback_triggered: 'true' },
      extra: { userId: request.userId, sessionId: request.sessionId }
    });
    
    // Attempt emergency fallback
    const fallback = new PerfectSwedishFallback();
    const fallbackResult = fallback.generate({
      disposition: request.disposition,
      style: request.style,
      platform: request.platform,
      userId: request.userId,
      sessionId: request.sessionId,
      originalError: error
    });
    
    // Mark as fallback in database
    await this.saveFallbackGeneration(fallbackResult, request);
    
    return fallbackResult;
  }
}
```

### 3. Disposition Builder Module

**Location:** `server/lib/disposition-builder.ts`

**Purpose:** Centralize disposition data transformation logic.

**Interface:**
```typescript
export interface DispositionBuilderResult {
  disposition: any;
  metadata: {
    source: 'structured' | 'raw_text';
    hasAddress: boolean;
    hasPropertyType: boolean;
  };
}

export function buildDispositionFromStructuredData(
  propertyData: any
): DispositionBuilderResult;
```

### 4. Feature Flag System

**Location:** `server/lib/feature-flags.ts` (new)

**Purpose:** Control gradual rollout and enable instant rollback.

**Interface:**
```typescript
export interface FeatureFlags {
  oldPipelineRemovalEnabled: boolean;
  autoRollbackOnErrors: boolean;
  errorRateThreshold: number; // percentage
}

export class FeatureFlagManager {
  async getFlags(): Promise<FeatureFlags>;
  async setFlag(name: string, value: boolean): Promise<void>;
  async checkAutoRollback(): Promise<boolean>;
}
```

## Data Models

### Pipeline Generation Record (Enhanced)

**Table:** `pipeline_generations`

**New Columns:**
```sql
ALTER TABLE pipeline_generations ADD COLUMN is_fallback BOOLEAN DEFAULT FALSE;
ALTER TABLE pipeline_generations ADD COLUMN fallback_reason TEXT;
ALTER TABLE pipeline_generations ADD COLUMN pipeline_version VARCHAR(50) DEFAULT 'new';
```

**Purpose:** Track which generations used fallback and why.

### Feature Flag Configuration

**Table:** `feature_flags` (new)

```sql
CREATE TABLE feature_flags (
  id SERIAL PRIMARY KEY,
  flag_name VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255)
);

CREATE INDEX idx_feature_flags_name ON feature_flags(flag_name);
```

### Rollout Metrics

**Table:** `rollout_metrics` (new)

```sql
CREATE TABLE rollout_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_rollout_metrics_timestamp ON rollout_metrics(timestamp DESC);
CREATE INDEX idx_rollout_metrics_name ON rollout_metrics(metric_name);
```

**Tracked Metrics:**
- `new_pipeline_success_rate`
- `new_pipeline_avg_duration`
- `emergency_fallback_rate`
- `generation_cost_per_text`
- `error_rate`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties and performed redundancy elimination:

**Redundancy Analysis:**
- Properties 11.1-11.7 (platform compliance) can be consolidated into comprehensive platform validation properties
- Properties 12.1-12.4 (monitoring metrics) are all variations of "track metric over time" and can be unified
- Properties 1.4-1.8 (NEW pipeline verification) test similar "for all inputs" behaviors and can be streamlined

**Final Properties:** The following properties provide unique validation value without redundancy.

### Property 1: Error Handling with Retry

*For any* input that causes a transient error (network timeout, rate limit, temporary service failure), the NEW pipeline should retry the operation according to configured retry logic and eventually succeed or fail gracefully.

**Validates: Requirements 1.4**

### Property 2: Graceful Degradation

*For any* generation request where post-processing or expert analysis fails, the NEW pipeline should continue execution and return valid output with the failed component marked as unavailable.

**Validates: Requirements 1.5**

### Property 3: Metrics Persistence

*For any* generation request, the NEW pipeline should save complete metrics (duration, retry count, success status, step timings) to the database regardless of success or failure.

**Validates: Requirements 1.6**

### Property 4: WebSocket Progress Updates

*For any* generation request with WebSocket enabled, the NEW pipeline should emit progress events for each step (smart_generation, post_processing, expert_analysis) with accurate progress percentages.

**Validates: Requirements 1.7**

### Property 5: Plan Limits Enforcement

*For any* user plan (free/pro/premium) and word count target, the NEW pipeline should enforce the plan's word count limits and reject requests that exceed quota limits before generation starts.

**Validates: Requirements 1.8**

### Property 6: Emergency Fallback Activation

*For any* input that causes the NEW pipeline to fail after all retries, the system should activate emergency fallback generation using `buildDeterministicFallbackDescription` and return valid broker text.

**Validates: Requirements 3.1, 3.2**

### Property 7: Fallback Logging and Marking

*For any* emergency fallback activation, the system should log the failure to Sentry with full context and mark the database record with `is_fallback=true` and the failure reason.

**Validates: Requirements 3.3, 3.4**

### Property 8: Fallback Output Validity

*For any* emergency fallback generation, the output should pass all platform-specific validation rules (Hemnet/Booli restrictions, headline format, emoji limits, forbidden phrases).

**Validates: Requirements 3.5, 3.6, 3.7**

### Property 9: Platform Compliance - Hemnet

*For any* text generation with platform='hemnet', the output should NOT contain price, fee, or energiklass mentions in any field, and should enforce headline rules (max 9 words, no punctuation), showing invitation must contain "visning", and Instagram caption must have max 2 emojis.

**Validates: Requirements 11.1, 11.3, 11.4, 11.5**

### Property 10: Platform Compliance - Booli

*For any* text generation with platform='booli', the output should allow price/fee/energiklass mentions, and should enforce headline rules (max 9 words, no punctuation), showing invitation must contain "visning", and Instagram caption must have max 2 emojis.

**Validates: Requirements 11.2, 11.3, 11.4, 11.5**

### Property 11: Forbidden Phrase Removal

*For any* text generation, the output should not contain any phrases from the FORBIDDEN_PHRASES list (except those exempted for the specific writing style) in any field.

**Validates: Requirements 11.6**

### Property 12: Paragraph Structure Enforcement

*For any* main text generation, the output should contain at least 3 paragraph breaks (\\n\\n) separating distinct sections (USP opening, layout/features, location/economy).

**Validates: Requirements 11.7**

### Property 13: Feature Flag Control

*For any* generation request when the feature flag is enabled, the system should use only the NEW pipeline and never execute OLD pipeline code paths.

**Validates: Requirements 10.3**

### Property 14: Rollout Metrics Tracking

*For any* time period during rollout, the system should track and persist error rates, success rates, and fallback usage rates to the rollout_metrics table.

**Validates: Requirements 10.4, 10.5, 10.6**

### Property 15: Rollout State Change Logging

*For any* feature flag state change (enabled/disabled) or automatic rollback trigger, the system should log the event to Sentry with full context including timestamp, trigger reason, and current metrics.

**Validates: Requirements 10.8**

### Property 16: Monitoring Metrics Collection

*For any* generation request, the system should collect and expose metrics for success rate, average duration, fallback usage rate, and generation cost that can be queried by monitoring systems.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

### Property 17: Generation Cost Tracking

*For any* generation request, the system should calculate and record the cost based on tokens used and model pricing, enabling cost comparison between OLD and NEW pipelines.

**Validates: Requirements 8.5**

### Property 18: Generation Duration Tracking

*For any* generation request, the system should measure and record total duration and per-step durations (step1, step2, step3) for performance analysis.

**Validates: Requirements 8.6**

### Property 19: Fallback Usage Rate Calculation

*For any* time period, the system should be able to calculate the percentage of generations that used emergency fallback by querying `is_fallback=true` records.

**Validates: Requirements 8.8**

## Error Handling

### Error Categories

**1. Transient Errors (Retryable)**
- Network timeouts (ECONNREFUSED, ETIMEDOUT)
- OpenAI rate limits (429 errors)
- Temporary service unavailability (502, 503, 504)

**Handling:** Retry with exponential backoff (p-retry: 2 retries, 1-4 second delays)

**2. Validation Errors (Non-Retryable)**
- Invalid input data (missing required fields)
- Quota exceeded (monthly limit reached)
- Rate limit exceeded (per-minute limit)

**Handling:** Return user-friendly error immediately, no retry

**3. Generation Errors (Fallback-Eligible)**
- OpenAI API errors after retries
- Post-processing failures (graceful degradation)
- Expert analysis failures (graceful degradation)

**Handling:** Attempt emergency fallback generation

**4. Critical Errors (System Failure)**
- Database connection failures
- Emergency fallback also fails
- Configuration errors

**Handling:** Log to Sentry, return generic error message, alert operations team

### Error Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Generation Request                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Preflight Validation  │
         │  - Rate limits         │
         │  - Quota limits        │
         │  - Input validation    │
         └────────┬───────────────┘
                  │
         ┌────────▼────────┐
         │  Valid?         │
         └────┬────────┬───┘
              │        │
          NO  │        │ YES
              │        │
              ▼        ▼
    ┌─────────────┐  ┌──────────────────────┐
    │ Return 429  │  │  Execute NEW Pipeline│
    │ or 400      │  │  with p-retry        │
    └─────────────┘  └──────┬───────────────┘
                            │
                   ┌────────▼────────┐
                   │  Success?       │
                   └────┬────────┬───┘
                        │        │
                    YES │        │ NO (after retries)
                        │        │
                        ▼        ▼
              ┌──────────────┐  ┌─────────────────────┐
              │ Return Result│  │ Emergency Fallback  │
              │ Save Metrics │  │ - Log to Sentry     │
              └──────────────┘  │ - Mark is_fallback  │
                                │ - Generate template │
                                └──────┬──────────────┘
                                       │
                              ┌────────▼────────┐
                              │  Success?       │
                              └────┬────────┬───┘
                                   │        │
                               YES │        │ NO
                                   │        │
                                   ▼        ▼
                         ┌──────────────┐  ┌──────────────┐
                         │ Return       │  │ Return Error │
                         │ Fallback     │  │ Alert Ops    │
                         │ Result       │  │ Log Sentry   │
                         └──────────────┘  └──────────────┘
```

### Error Messages

**User-Facing Messages (Swedish):**
- Rate limit: "För många förfrågningar. Vänta en minut och försök igen."
- Quota exceeded: "Du har nått din månadsgräns av X genereringar. Uppgradera till [plan] för fler genereringar!"
- Generation failure: "Textgenerering misslyckades. Försök igen om en stund eller kontakta support om problemet kvarstår."
- Fallback used: "Text genererad med förenklad metod på grund av tillfälligt tekniskt problem."

**Internal Error Codes:**
- `RATE_LIMIT_EXCEEDED` - Per-minute rate limit hit
- `QUOTA_EXCEEDED` - Monthly usage limit hit
- `GENERATION_FAILED` - NEW pipeline failed after retries
- `FALLBACK_ACTIVATED` - Emergency fallback used
- `FALLBACK_FAILED` - Emergency fallback also failed
- `VALIDATION_ERROR` - Input validation failed

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:** Focus on specific examples, edge cases, and integration points
- Emergency fallback with specific property data
- Feature flag state transitions
- Database schema migrations
- Import path updates after migration
- Specific error scenarios (rate limit, quota exceeded)

**Property Tests:** Verify universal properties across all inputs
- Platform compliance rules (Hemnet/Booli) with random property data
- Fallback generation with random dispositions and styles
- Metrics tracking with random generation requests
- Error handling with random error types

### Property-Based Testing Configuration

**Library:** fast-check (TypeScript property-based testing)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: old-pipeline-removal, Property {N}: {description}`

**Example Property Test:**
```typescript
import fc from 'fast-check';

describe('Feature: old-pipeline-removal, Property 9: Platform Compliance - Hemnet', () => {
  it('should enforce Hemnet restrictions for any property data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          address: fc.string(),
          rooms: fc.integer({ min: 1, max: 10 }),
          area: fc.integer({ min: 20, max: 500 }),
          style: fc.constantFrom('factual', 'balanced', 'selling')
        }),
        async (propertyData) => {
          const result = await orchestrator.execute({
            disposition: propertyData,
            style: propertyData.style,
            platform: 'hemnet',
            targetWordMin: 150,
            targetWordMax: 250,
            userId: 'test-user',
            sessionId: 'test-session'
          });

          // Verify no price/fee/energiklass in any field
          const allText = [
            result.improvedPrompt,
            result.headline,
            result.socialCopy,
            result.instagramCaption,
            result.showingInvitation,
            result.shortAd
          ].join(' ').toLowerCase();

          expect(allText).not.toMatch(/\b(pris|avgift|energiklass|kr\/mån)\b/);
          
          // Verify headline rules
          const headlineWords = result.headline.split(/\s+/).length;
          expect(headlineWords).toBeLessThanOrEqual(9);
          expect(result.headline).not.toMatch(/[.!?]$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Coverage Requirements

**Minimum Coverage:**
- Unit test coverage: 80% of new code (fallback module, feature flags)
- Property test coverage: All 19 correctness properties
- Integration test coverage: End-to-end generation flow with fallback
- Regression test coverage: Existing tests must pass after migration

**Critical Test Scenarios:**
1. Emergency fallback with various property types (apartment, house, villa)
2. Platform compliance for Hemnet and Booli with edge cases
3. Feature flag transitions (enabled → disabled → enabled)
4. Automatic rollback when error rate exceeds threshold
5. Metrics collection and persistence under load
6. WebSocket progress updates with network interruptions
7. Graceful degradation when post-processor fails
8. Graceful degradation when analyzer fails

### Testing Tools

**Unit Testing:**
- Framework: Vitest
- Mocking: Vitest mocks for OpenAI, database, Sentry
- Assertions: Vitest expect with custom matchers

**Property Testing:**
- Framework: fast-check
- Generators: Custom generators for property data, dispositions, styles
- Shrinking: Automatic test case minimization on failure

**Integration Testing:**
- Framework: Vitest with supertest for API testing
- Database: Test database with migrations
- External Services: Mocked OpenAI, Sentry, Redis

**Load Testing:**
- Framework: k6 (existing load test infrastructure)
- Scenarios: Sustained load, spike testing, fallback stress testing
- Metrics: Success rate, duration, fallback rate under load

### Test Execution

**Pre-Migration:**
```bash
npm run test                    # All tests must pass
npm run test:regression         # Regression tests must pass
npm run test:canary             # Canary quality tests must pass
npm run check                   # TypeScript compilation must succeed
```

**Post-Migration:**
```bash
npm run test                    # All tests must still pass
npm run test:regression         # Regression tests must still pass
npm run test:properties         # New property tests must pass
npm run check                   # TypeScript compilation must succeed
```

**Continuous Monitoring:**
```bash
npm run test:watch              # Watch mode during development
npm run test:coverage           # Verify 80%+ coverage
```

## Migration Strategy

### Phase 1: Preparation (Week 1)

**Objectives:**
- Create new modules (fallback, feature flags)
- Add database schema changes
- Implement monitoring and alerting
- Write comprehensive tests

**Tasks:**
1. Create `server/lib/perfect-swedish-fallback.ts`
   - Migrate `buildDeterministicFallbackDescription`
   - Migrate helper functions
   - Add tests for fallback generation

2. Create `server/lib/feature-flags.ts`
   - Implement feature flag system
   - Add auto-rollback logic
   - Add tests for flag management

3. Create `server/lib/disposition-builder.ts`
   - Migrate `buildDispositionFromStructuredData`
   - Add tests for data transformation

4. Database migrations
   - Add `is_fallback`, `fallback_reason` columns
   - Create `feature_flags` table
   - Create `rollout_metrics` table

5. Enhance PerfectSwedishOrchestrator
   - Integrate emergency fallback
   - Add fallback metrics tracking
   - Add Sentry logging

6. Write property-based tests
   - All 19 correctness properties
   - 100+ iterations per property
   - Edge case coverage

**Success Criteria:**
- All new modules created and tested
- Database migrations applied successfully
- All tests pass (unit + property + integration)
- TypeScript compilation succeeds

### Phase 2: Gradual Rollout (Week 2-3)

**Objectives:**
- Enable feature flag gradually
- Monitor metrics closely
- Verify no regressions
- Collect performance data

**Rollout Schedule:**
```
Day 1-2:   Feature flag enabled for 10% of traffic
Day 3-4:   Increase to 25% if metrics are good
Day 5-7:   Increase to 50% if metrics are good
Day 8-10:  Increase to 75% if metrics are good
Day 11-14: Increase to 100% if metrics are good
```

**Monitoring Checklist (Check Every 4 Hours):**
- [ ] Success rate >= 95%
- [ ] Average duration < 10 seconds
- [ ] Fallback rate < 1%
- [ ] Error rate not increased by >5%
- [ ] No critical Sentry alerts
- [ ] User complaints = 0

**Rollback Triggers:**
- Success rate drops below 90%
- Average duration exceeds 15 seconds
- Fallback rate exceeds 5%
- Error rate increases by >5%
- Critical Sentry alerts
- Multiple user complaints

**Rollback Procedure:**
1. Disable feature flag immediately
2. Verify OLD pipeline code still works
3. Investigate root cause
4. Fix issues
5. Re-test thoroughly
6. Resume rollout

### Phase 3: Code Removal (Week 4)

**Objectives:**
- Remove OLD pipeline code
- Clean up unused functions
- Update documentation
- Verify production stability

**Tasks:**
1. Verify 100% traffic on NEW pipeline for 7 days
2. Verify all metrics are stable and good
3. Remove OLD pipeline code (lines 3200-6100 in routes.ts)
4. Remove unused functions:
   - `finalizeMainMarketingText`
   - OLD pipeline repair functions
   - OLD pipeline quality gates
   - OLD pipeline retry logic
5. Update all imports to new module locations
6. Run full test suite
7. Deploy to production
8. Monitor for 48 hours

**Success Criteria:**
- ~2900 lines removed from routes.ts
- All tests pass
- TypeScript compilation succeeds
- Production metrics unchanged or improved
- No user complaints
- No critical errors

### Phase 4: Measurement and Documentation (Week 5)

**Objectives:**
- Measure impact of removal
- Document lessons learned
- Update architecture diagrams
- Create troubleshooting guides

**Measurements:**
- Codebase size reduction: ~2900 lines
- routes.ts size reduction: ~43% smaller
- Test suite execution time: Measure before/after
- TypeScript compilation time: Measure before/after
- Average generation cost: Compare OLD vs NEW
- Average generation time: Compare OLD vs NEW
- Generation success rate: Compare OLD vs NEW
- Emergency fallback usage: Track rate

**Documentation:**
- Architecture diagrams (updated to show only NEW pipeline)
- Migration timeline and decisions
- Lessons learned from dual-pipeline maintenance
- Troubleshooting guide for NEW pipeline
- Emergency fallback usage guide
- Monitoring and alerting guide

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass (unit + property + integration + regression)
- [ ] TypeScript compilation succeeds with no errors
- [ ] Database migrations tested in staging
- [ ] Feature flag system tested and working
- [ ] Emergency fallback tested with various inputs
- [ ] Monitoring dashboards created and tested
- [ ] Alert rules configured and tested
- [ ] Rollback procedure documented and rehearsed
- [ ] Team briefed on rollout plan and monitoring

### Deployment

- [ ] Deploy database migrations
- [ ] Deploy new code with feature flag disabled
- [ ] Verify deployment successful
- [ ] Enable feature flag for 10% traffic
- [ ] Monitor metrics for 4 hours
- [ ] Gradually increase traffic percentage
- [ ] Monitor continuously during rollout

### Post-Deployment

- [ ] Verify 100% traffic on NEW pipeline
- [ ] Verify all metrics are stable
- [ ] Remove OLD pipeline code
- [ ] Deploy code removal
- [ ] Monitor for 48 hours
- [ ] Measure and document impact
- [ ] Update documentation
- [ ] Close migration project

## Rollback Plan

### Automatic Rollback

The system will automatically disable the feature flag if:
- Error rate increases by >5% compared to baseline
- Success rate drops below 90%
- Fallback rate exceeds 5%

**Implementation:**
```typescript
// In feature-flags.ts
async checkAutoRollback(): Promise<boolean> {
  const metrics = await this.getRecentMetrics(15); // Last 15 minutes
  
  if (metrics.errorRate > baseline.errorRate * 1.05) {
    await this.disableFlag('oldPipelineRemovalEnabled');
    await this.logRollback('error_rate_exceeded', metrics);
    return true;
  }
  
  if (metrics.successRate < 0.90) {
    await this.disableFlag('oldPipelineRemovalEnabled');
    await this.logRollback('success_rate_too_low', metrics);
    return true;
  }
  
  if (metrics.fallbackRate > 0.05) {
    await this.disableFlag('oldPipelineRemovalEnabled');
    await this.logRollback('fallback_rate_too_high', metrics);
    return true;
  }
  
  return false;
}
```

### Manual Rollback

**Trigger Conditions:**
- Critical Sentry alerts
- Multiple user complaints
- Unexpected behavior observed
- Team decision to pause rollout

**Procedure:**
1. Disable feature flag via admin panel or database:
   ```sql
   UPDATE feature_flags 
   SET enabled = false 
   WHERE flag_name = 'oldPipelineRemovalEnabled';
   ```

2. Verify OLD pipeline code is still present (before Phase 3)

3. Monitor metrics to confirm rollback successful

4. Investigate root cause

5. Document incident and lessons learned

6. Fix issues and re-test

7. Resume rollout when ready

### Post-Removal Rollback (Emergency)

If issues are discovered after OLD pipeline code is removed:

1. Revert git commit that removed OLD pipeline code
2. Deploy previous version
3. Disable feature flag
4. Investigate and fix issues
5. Re-test thoroughly
6. Attempt removal again

**Git Revert Command:**
```bash
git revert <commit-hash-of-removal>
git push origin main
# Render will auto-deploy the revert
```

## Success Metrics

### Technical Metrics

**Code Quality:**
- Lines of code removed: ~2900 (target)
- routes.ts size reduction: ~43% (target)
- Test coverage: >=80% (target)
- TypeScript errors: 0 (target)

**Performance:**
- Average generation time: <10 seconds (target)
- P95 generation time: <15 seconds (target)
- P99 generation time: <20 seconds (target)

**Reliability:**
- Success rate: >=95% (target)
- Fallback rate: <1% (target)
- Error rate: No increase (target)

**Cost:**
- Average cost per generation: <50% of OLD pipeline (target)
- Total monthly AI costs: Reduced (target)

### Business Metrics

**User Experience:**
- User complaints: 0 (target)
- Generation quality: Maintained or improved (target)
- Response time: Maintained or improved (target)

**Operational:**
- Deployment time: <30 minutes (target)
- Rollback time: <5 minutes (target)
- Incident count: 0 (target)

### Monitoring Dashboard

**Real-Time Metrics (Updated Every Minute):**
- Current success rate (last 15 minutes)
- Current average duration (last 15 minutes)
- Current fallback rate (last 15 minutes)
- Current error rate (last 15 minutes)
- Feature flag status (enabled/disabled)

**Historical Metrics (Last 24 Hours):**
- Success rate trend
- Duration trend
- Fallback rate trend
- Error rate trend
- Cost per generation trend

**Comparison Metrics (OLD vs NEW):**
- Success rate comparison
- Duration comparison
- Cost comparison
- Quality score comparison

## Risk Mitigation

### Identified Risks

**Risk 1: Emergency Fallback Fails**
- **Probability:** Low
- **Impact:** High
- **Mitigation:** Comprehensive testing of fallback with edge cases, monitoring fallback usage rate
- **Contingency:** Manual intervention, revert to OLD pipeline

**Risk 2: Performance Degradation**
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:** Load testing before rollout, gradual traffic increase, continuous monitoring
- **Contingency:** Automatic rollback if duration exceeds threshold

**Risk 3: Quality Regression**
- **Probability:** Low
- **Impact:** High
- **Mitigation:** Property-based tests for platform compliance, canary quality tests, user feedback monitoring
- **Contingency:** Rollback and investigate, fix issues before resuming

**Risk 4: Database Migration Issues**
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:** Test migrations in staging, backup database before production migration
- **Contingency:** Rollback migration, restore from backup if needed

**Risk 5: Feature Flag System Failure**
- **Probability:** Very Low
- **Impact:** High
- **Mitigation:** Simple implementation, comprehensive testing, fallback to default behavior
- **Contingency:** Manual code deployment to disable feature

### Contingency Plans

**Plan A: Automatic Rollback**
- System detects metrics degradation
- Feature flag automatically disabled
- OLD pipeline code still present (Phase 1-2)
- Monitor metrics to confirm recovery

**Plan B: Manual Rollback**
- Team observes issues
- Manually disable feature flag
- Investigate root cause
- Fix and re-test before resuming

**Plan C: Code Revert**
- Critical issues after code removal (Phase 3+)
- Git revert to previous version
- Deploy reverted code
- Full investigation and re-planning

**Plan D: Emergency Maintenance**
- System completely broken
- Enable maintenance mode
- Fix issues offline
- Deploy fix and verify
- Resume normal operation

## Conclusion

This design provides a comprehensive, safe approach to removing the OLD pipeline code while maintaining production stability. The gradual rollout strategy, comprehensive monitoring, automatic rollback capability, and emergency fallback mechanism ensure that users experience no disruption during the migration.

Key success factors:
1. Thorough testing (unit + property + integration)
2. Gradual rollout with continuous monitoring
3. Automatic rollback on metrics degradation
4. Emergency fallback for complete failures
5. Clear documentation and runbooks

Expected outcomes:
- ~2900 lines of code removed
- Simpler, more maintainable codebase
- Reduced AI costs (single GPT-5.2 call vs multiple)
- Faster generation (3 steps vs 7 steps)
- Maintained or improved quality and reliability
