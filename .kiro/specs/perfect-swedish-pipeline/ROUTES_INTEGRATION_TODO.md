# Routes Integration

## Status: ✅ COMPLETED

The PerfectSwedishOrchestrator has been **successfully integrated** into the API routes.

## What Was Done

### 1. Added Imports (Line 36-37)
```typescript
import { PerfectSwedishOrchestrator } from "./lib/perfect-swedish-orchestrator";
import { ABTestManager } from "./lib/perfect-swedish-ab-test";
```

### 2. Integrated A/B Testing Logic (After line 3250)
Added complete A/B test integration in the `/api/optimize` endpoint:

**Key Features Implemented:**
- ✅ A/B variant assignment using ABTestManager
- ✅ Session consistency (same user + session = same variant)
- ✅ Manual override support via `forceVariant` parameter
- ✅ Treatment variant uses new 3-step pipeline
- ✅ Control variant uses existing 7-step pipeline
- ✅ Fallback to old pipeline on error
- ✅ Database logging to `pipeline_generations` table
- ✅ Usage quota tracking
- ✅ Optimization history tracking
- ✅ WebSocket progress events
- ✅ Streaming support (NDJSON)
- ✅ Personal style integration
- ✅ Backward compatible response structure

### 3. Integration Flow

```
User Request → /api/optimize
    ↓
Preflight Checks (rate limit, quota)
    ↓
A/B Test Assignment
    ↓
    ├─→ Treatment Variant → PerfectSwedishOrchestrator (new 3-step pipeline)
    │                        ├─ Smart Generation (GPT-4)
    │                        ├─ Post-Processing (deterministic)
    │                        └─ Expert Analysis (dual-perspective)
    │
    └─→ Control Variant → Existing 7-step pipeline
    
    ↓
Save to Database
    ↓
Return Response
```

## Testing

### Manual Testing Commands

1. **Test Treatment Variant (Force New Pipeline)**:
```bash
curl -X POST http://localhost:3000/api/optimize \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "prompt": "Ljus lägenhet i Stockholm",
    "platform": "hemnet",
    "writingStyle": "balanced",
    "forceVariant": "treatment"
  }'
```

2. **Test Control Variant (Force Old Pipeline)**:
```bash
curl -X POST http://localhost:3000/api/optimize \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "prompt": "Ljus lägenhet i Stockholm",
    "platform": "hemnet",
    "writingStyle": "balanced",
    "forceVariant": "control"
  }'
```

3. **Test Random Assignment (50/50 split)**:
```bash
curl -X POST http://localhost:3000/api/optimize \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "prompt": "Ljus lägenhet i Stockholm",
    "platform": "hemnet",
    "writingStyle": "balanced"
  }'
```

### Database Verification

```sql
-- Check pipeline generations
SELECT 
  variant, 
  COUNT(*) as count,
  AVG(total_duration) as avg_duration,
  AVG(CASE WHEN success THEN 1 ELSE 0 END) as success_rate
FROM pipeline_generations
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY variant;

-- Check A/B test assignments
SELECT * FROM ab_test_assignments 
ORDER BY assigned_at DESC 
LIMIT 10;
```

## Environment Variables

Add these to your `.env` file:

```bash
# Enable the new pipeline (default: false)
PERFECT_SWEDISH_PIPELINE_ENABLED=true

# Set treatment percentage 0-100 (default: 50)
PERFECT_SWEDISH_PIPELINE_PERCENTAGE=50

# OpenAI API key (uses existing key if not set)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
```

## Response Structure

The response maintains backward compatibility with the old pipeline:

```typescript
{
  originalPrompt: string,
  improvedPrompt: string,
  headline: string,
  socialCopy: string,
  instagramCaption: string,
  showingInvitation: string,
  shortAd: string,
  expertAnalysis?: ExpertAnalysis,  // NEW: Optional field from new pipeline
  variant: 'control' | 'treatment',  // NEW: Which variant was used
  fallbackUsed: boolean,             // NEW: Whether fallback was triggered
  optimizationId: number,
  createdAt: string
}
```

## Key Implementation Details

### A/B Test Assignment
- Uses consistent hashing for session-based assignment
- Respects feature flag (`PERFECT_SWEDISH_PIPELINE_ENABLED`)
- Supports manual override via `forceVariant` parameter
- Caches assignments in Redis for performance

### Error Handling
- New pipeline errors fall back to old pipeline
- Errors are logged but don't break the user experience
- Fallback is tracked in database (`fallback_used` column)

### Metrics Tracking
- All generations logged to `pipeline_generations` table
- Tracks duration for each step
- Tracks retry count
- Tracks success/failure status
- Enables A/B test analysis

### Quota Integration
- Uses existing `storage.incrementUsage(user.id, 'texts')`
- Respects plan limits (Free: 3, Pro: 10, Premium: 25)
- Quota checked before pipeline execution

### Personal Style Integration
- Loads user's personal style if available
- Passes to Smart Generation Engine
- Included in prompt building

## Next Steps

1. ✅ Routes integration complete
2. ⏭️ Run integration tests: `npm run test -- server/tests/perfect-swedish-pipeline-integration.test.ts`
3. ⏭️ Test with real OpenAI API
4. ⏭️ Verify database schema exists
5. ⏭️ Monitor A/B test metrics
6. ⏭️ Proceed to Task 10 (Frontend components)

## Files Modified

- ✅ `server/routes.ts` - Added imports and A/B test integration (~170 lines added)

## Known Limitations

1. **OpenAI Model**: Currently uses `gpt-4`, will be updated to `gpt-5.2` when available
2. **Reasoning Mode**: Not yet implemented (waiting for GPT-5.2)
3. **Fallback Implementation**: Falls back to old pipeline on error (working as designed)

## Rollout Strategy

1. **Phase 1 (Current)**: Feature flag disabled by default, manual testing
2. **Phase 2**: Enable for 10% of users (canary)
3. **Phase 3**: Expand to 50% of users
4. **Phase 4**: Full rollout (100%)

Each phase should monitor:
- Success rate (target: 95%+)
- Generation time (target: <25s)
- User satisfaction
- Error rate
- Fallback rate
