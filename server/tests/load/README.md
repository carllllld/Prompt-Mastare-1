# Load Testing for Perfect Swedish Pipeline

This directory contains k6 load testing scripts for the Perfect Swedish Pipeline.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Load Tests

### Basic Load Test

Run the standard load test with 10-20 concurrent users:

```bash
k6 run server/tests/load/k6-load-test.js
```

### Analyze Results

After running a load test, analyze the results:

```bash
npm run test:load:analyze
```

This will provide:
- Performance summary with pass/fail indicators
- Step-by-step timing breakdown
- Reliability metrics (fallbacks, retries)
- Actionable recommendations
- Next steps

### Custom Configuration

Run with custom virtual users and duration:

```bash
# 15 users for 5 minutes
k6 run --vus 15 --duration 5m server/tests/load/k6-load-test.js

# 20 users for 10 minutes
k6 run --vus 20 --duration 10m server/tests/load/k6-load-test.js
```

### Against Different Environments

```bash
# Local development
BASE_URL=http://localhost:5000 k6 run server/tests/load/k6-load-test.js

# Staging
BASE_URL=https://staging.optiprompt.se k6 run server/tests/load/k6-load-test.js

# Production (use with caution!)
BASE_URL=https://optiprompt.se k6 run server/tests/load/k6-load-test.js
```

## Test Scenarios

The load test simulates realistic broker usage:

1. **Ramp-up Phase** (1 min): 0 → 5 users
2. **Growth Phase** (2 min): 5 → 10 users
3. **Peak Phase** (3 min): 10 → 15 users
4. **Stress Phase** (2 min): 15 → 20 users
5. **Cool-down Phase** (2 min): 20 → 10 users
6. **Ramp-down Phase** (1 min): 10 → 0 users

Total duration: **11 minutes**

## Performance Targets

- **Success Rate**: 95%+ (threshold: `rate>0.95`)
- **Total Duration**: <25 seconds (95th percentile)
- **Median Duration**: <20 seconds
- **HTTP Errors**: <5%

## Metrics Tracked

### Pipeline Metrics
- `pipeline_success_rate`: Overall success rate
- `pipeline_duration_ms`: Total pipeline execution time
- `step1_smart_generation_ms`: Smart Generation step timing
- `step2_post_processing_ms`: Post-Processing step timing
- `step3_expert_analysis_ms`: Expert Analysis step timing

### Reliability Metrics
- `fallback_to_old_pipeline`: Count of fallbacks to old 7-step pipeline
- `retry_attempts`: Count of retry attempts

### HTTP Metrics (built-in)
- `http_req_duration`: HTTP request duration
- `http_req_failed`: Failed HTTP requests
- `http_reqs`: Total HTTP requests

## Test Data

The load test uses 4 realistic property dispositions:

1. **Lägenhet** (Apartment): 75 sqm, 3 rooms, Södermalm
2. **Villa**: 146 sqm, 5 rooms, Värmdö with pool
3. **Bostadsrätt** (Condominium): 52 sqm, 2 rooms, Vasastan
4. **Fritidshus** (Vacation home): 65 sqm, 3 rooms, Roslagen

Each request randomly selects:
- One of the 4 dispositions
- One of 3 styles: `factual`, `balanced`, `selling`
- One of 3 platforms: `hemnet`, `booli`, `facebook`

## Results

Results are saved to:
- **Console**: Real-time summary with colors
- **JSON**: `server/tests/load/k6-results.json` (detailed metrics)

## Interpreting Results

### Success Criteria

✅ **PASS** if:
- Success rate ≥ 95%
- 95th percentile duration < 25s
- Median duration < 20s
- HTTP error rate < 5%

❌ **FAIL** if any threshold is not met

### Common Issues

**High Duration (>25s)**
- Check OpenAI API latency
- Review database query performance
- Check Redis cache hit rate
- Monitor server CPU/memory

**Low Success Rate (<95%)**
- Check error logs for failure patterns
- Review retry logic effectiveness
- Check OpenAI API rate limits
- Monitor database connection pool

**High Fallback Count**
- Indicates new pipeline instability
- Review error patterns in logs
- Check OpenAI API reliability
- Consider adjusting retry strategy

## Performance Optimization

After running load tests, use the results to identify bottlenecks:

1. **Step 1 (Smart Generation)** - Target: 15-18s
   - Optimize prompt length
   - Review OpenAI API settings
   - Consider caching prompt templates

2. **Step 2 (Post-Processing)** - Target: <1s
   - Profile regex patterns
   - Optimize transformation loops
   - Consider pre-compiling patterns

3. **Step 3 (Expert Analysis)** - Target: 5-7s
   - Optimize analysis prompt
   - Review OpenAI API settings
   - Consider parallel execution

## Continuous Monitoring

For production monitoring, integrate with:
- **Sentry**: Error tracking and performance monitoring
- **Grafana**: Real-time dashboards
- **PostgreSQL**: Query performance analysis
- **Redis**: Cache hit rate monitoring

## Next Steps

1. Run baseline load test before optimization
2. Identify bottlenecks from results
3. Implement optimizations
4. Run load test again to validate improvements
5. Document performance characteristics
6. Set up continuous load testing in CI/CD
