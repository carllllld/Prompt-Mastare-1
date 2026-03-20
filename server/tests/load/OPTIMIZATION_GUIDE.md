# Performance Optimization Guide

This guide documents performance optimization strategies for the Perfect Swedish Pipeline based on load testing results.

## Performance Targets

- **Total Pipeline Duration**: <25 seconds (95th percentile)
- **Success Rate**: 95%+ under load
- **Concurrent Users**: 10-20 users
- **Step 1 (Smart Generation)**: 15-18 seconds
- **Step 2 (Post-Processing)**: <1 second
- **Step 3 (Expert Analysis)**: 5-7 seconds

## Optimization Strategies

### 1. Smart Generation Optimization (Step 1)

**Target**: 15-18 seconds

#### Prompt Optimization
- ✅ **Cache prompt templates** in Redis (already implemented)
- ✅ **Minimize prompt length** while maintaining quality
- ⚠️ **Review system prompt** - currently ~1200 tokens
- ⚠️ **Consider splitting** long examples into separate cache

**Implementation**:
```typescript
// Already implemented in perfect-swedish-generator.ts
const cachedTemplate = await getCachedPromptTemplate('smart-generation', this.PROMPT_VERSION);
```

#### OpenAI API Settings
- ✅ **Use GPT-4** (GPT-5.2 when available)
- ✅ **Temperature: 0.7** - good balance
- ✅ **Max tokens: 2000** - appropriate for output
- ⚠️ **Consider connection pooling** for high concurrency

**Potential Improvements**:
```typescript
// Add connection pooling
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 20000,
  // Consider adding custom fetch with connection pooling
});
```

#### Caching Strategy
- ✅ **Prompt template caching** (implemented)
- ⚠️ **Consider caching similar dispositions** (future)
- ⚠️ **Cache common property types** (future)

### 2. Post-Processing Optimization (Step 2)

**Target**: <1 second

#### Regex Pattern Optimization
- ✅ **Pre-compile patterns** at module load (already implemented)
- ✅ **Use efficient regex patterns**
- ⚠️ **Profile individual transformations** to find slow patterns

**Current Implementation**:
```typescript
// Already optimized - patterns compiled once
private readonly PLACEHOLDER_PATTERNS = {
  TID: /\[TID\]/gi,
  KONTAKT: /\[KONTAKT\]/gi,
  MÄKLARE: /\[MÄKLARE\]/gi,
  ADRESS: /\[ADRESS\]/gi
};
```

#### Transformation Pipeline
- ✅ **Sequential processing** is appropriate
- ✅ **Early exit on errors** with graceful degradation
- ⚠️ **Consider skipping transformations** if text is already clean

**Potential Improvements**:
```typescript
// Add quick check before expensive operations
if (!text.includes('[')) {
  // Skip placeholder removal
}
```

#### Forbidden Phrase Detection
- ✅ **Pre-compiled patterns** (implemented)
- ✅ **Style-aware exemptions** (implemented)
- ⚠️ **Consider Aho-Corasick algorithm** for many patterns (future)

### 3. Expert Analysis Optimization (Step 3)

**Target**: 5-7 seconds

#### Prompt Optimization
- ✅ **Use reasoning:low** for speed (when GPT-5.2 available)
- ⚠️ **Review analysis prompt length** - currently ~800 tokens
- ⚠️ **Consider reducing example count**

**Current Settings**:
```typescript
model: 'gpt-4',  // Will be gpt-5.2 with reasoning:low
temperature: 0.3,  // Lower for consistency
max_tokens: 1500,
timeout: 10000
```

#### Analysis Scope
- ✅ **Structured JSON output** (efficient parsing)
- ⚠️ **Consider limiting feedback items** to top 5-10
- ⚠️ **Make text span identification optional** for speed

**Potential Improvements**:
```typescript
// Add option to skip detailed analysis
interface AnalysisRequest {
  // ... existing fields
  detailedAnalysis?: boolean; // Default: true
}
```

#### Parallel Execution
- ⚠️ **Consider running Step 3 in parallel** with user viewing Step 1+2 results
- ⚠️ **Stream analysis results** as they become available

### 4. Database Optimization

#### Query Performance
- ⚠️ **Add indexes** on frequently queried columns
- ⚠️ **Use connection pooling** (check current settings)
- ⚠️ **Monitor slow queries** with pg_stat_statements

**Recommended Indexes**:
```sql
-- Already defined in schema
CREATE INDEX idx_pipeline_generations_user_id ON pipeline_generations(user_id);
CREATE INDEX idx_pipeline_generations_variant ON pipeline_generations(variant);
CREATE INDEX idx_pipeline_generations_created_at ON pipeline_generations(created_at);

-- Consider adding composite indexes
CREATE INDEX idx_pipeline_generations_user_created 
  ON pipeline_generations(user_id, created_at DESC);
```

#### Connection Pool Settings
```typescript
// Check current pool settings in db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Adjust based on load
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 5. Redis Caching

#### Cache Strategy
- ✅ **Prompt template caching** (implemented)
- ✅ **Session assignment caching** (implemented)
- ⚠️ **Add result caching** for identical requests (future)
- ⚠️ **Cache disposition preprocessing** (future)

**Potential Improvements**:
```typescript
// Cache complete results for identical dispositions
const cacheKey = `result:${hash(disposition)}:${style}:${platform}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}
```

#### Cache Invalidation
- ⚠️ **Set appropriate TTLs** (currently: 24h for prompts)
- ⚠️ **Implement cache warming** for common requests
- ⚠️ **Monitor cache hit rates**

### 6. Retry Logic Optimization

#### Current Implementation
- ✅ **Exponential backoff** (1s, 2s, 4s)
- ✅ **Retryable error classification**
- ✅ **Max 2 retries**

**Potential Improvements**:
```typescript
// Add jitter to prevent thundering herd
const delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);

// Add circuit breaker for OpenAI API
if (consecutiveFailures > 5) {
  // Skip retries, use fallback immediately
}
```

### 7. Monitoring and Observability

#### Metrics to Track
- ✅ **Step durations** (implemented)
- ✅ **Retry counts** (implemented)
- ✅ **Fallback usage** (implemented)
- ⚠️ **OpenAI API latency** (add detailed tracking)
- ⚠️ **Database query times** (add query logging)
- ⚠️ **Redis cache hit rates** (add metrics)

**Implementation**:
```typescript
// Add detailed timing metrics
const metrics = {
  openai_api_latency: new Histogram(),
  db_query_duration: new Histogram(),
  redis_hit_rate: new Counter(),
};
```

### 8. Load Balancing and Scaling

#### Horizontal Scaling
- ⚠️ **Ensure stateless design** (already stateless)
- ⚠️ **Use Redis for session storage** (already implemented)
- ⚠️ **Configure load balancer** (Render handles this)

#### Rate Limiting
- ⚠️ **Implement per-user rate limits**
- ⚠️ **Add OpenAI API rate limit handling**
- ⚠️ **Queue requests during high load**

**Implementation**:
```typescript
// Add request queue for high load
import PQueue from 'p-queue';

const queue = new PQueue({
  concurrency: 10, // Max concurrent OpenAI requests
  intervalCap: 50, // Max 50 requests per interval
  interval: 60000, // 1 minute
});
```

## Optimization Checklist

### Immediate (Quick Wins)
- [ ] Profile Post-Processor regex patterns
- [ ] Add database query logging
- [ ] Monitor Redis cache hit rates
- [ ] Add OpenAI API latency tracking
- [ ] Review and optimize prompt lengths

### Short-term (1-2 weeks)
- [ ] Implement result caching for identical requests
- [ ] Add circuit breaker for OpenAI API
- [ ] Optimize database connection pool settings
- [ ] Add jitter to retry logic
- [ ] Implement request queueing for high load

### Medium-term (1 month)
- [ ] Consider parallel execution of Step 3
- [ ] Implement cache warming for common requests
- [ ] Add composite database indexes
- [ ] Optimize text span identification
- [ ] Consider streaming analysis results

### Long-term (Future)
- [ ] Implement Aho-Corasick for forbidden phrases
- [ ] Add ML-based caching predictions
- [ ] Consider edge caching for static content
- [ ] Implement advanced load balancing strategies

## Performance Testing Workflow

1. **Baseline**: Run load test before optimization
   ```bash
   npm run test:load
   ```

2. **Profile**: Identify bottlenecks
   ```bash
   npm run test:profile
   ```

3. **Optimize**: Implement targeted improvements

4. **Validate**: Run load test again
   ```bash
   npm run test:load
   ```

5. **Compare**: Analyze before/after metrics

6. **Document**: Update this guide with findings

## Common Performance Issues

### Issue: High Step 1 Duration (>18s)

**Symptoms**:
- Smart Generation consistently takes >18s
- OpenAI API timeouts

**Diagnosis**:
```bash
# Check OpenAI API status
curl https://status.openai.com/api/v2/status.json

# Review prompt length
tsx server/tests/load/analyze-prompt-length.ts
```

**Solutions**:
- Reduce prompt length
- Optimize examples
- Check OpenAI API rate limits
- Consider caching similar requests

### Issue: Low Success Rate (<95%)

**Symptoms**:
- Frequent failures
- High retry counts
- Fallback usage

**Diagnosis**:
```bash
# Check error logs
grep "Pipeline failed" logs/*.log

# Review Sentry errors
# Visit Sentry dashboard
```

**Solutions**:
- Improve error handling
- Adjust retry strategy
- Check OpenAI API reliability
- Review input validation

### Issue: High Database Latency

**Symptoms**:
- Slow overall performance
- Database connection timeouts

**Diagnosis**:
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check connection pool
SELECT count(*) FROM pg_stat_activity;
```

**Solutions**:
- Add missing indexes
- Optimize queries
- Increase connection pool size
- Consider read replicas

## Monitoring Dashboard

### Key Metrics to Display

1. **Pipeline Performance**
   - Average duration (last hour)
   - 95th percentile duration
   - Success rate
   - Throughput (requests/minute)

2. **Step Breakdown**
   - Step 1 average duration
   - Step 2 average duration
   - Step 3 average duration

3. **Reliability**
   - Retry count
   - Fallback count
   - Error rate by type

4. **Infrastructure**
   - OpenAI API latency
   - Database query time
   - Redis cache hit rate
   - Server CPU/memory usage

## Next Steps

1. Run baseline load test
2. Identify top 3 bottlenecks
3. Implement quick wins
4. Re-test and validate improvements
5. Document findings
6. Plan next optimization iteration
