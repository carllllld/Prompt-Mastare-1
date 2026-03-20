# Load Testing Quick Start Guide

Quick reference for running load tests on the Perfect Swedish Pipeline.

## Prerequisites

### Install k6

**macOS**:
```bash
brew install k6
```

**Windows**:
```bash
choco install k6
```

**Linux (Debian/Ubuntu)**:
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Quick Commands

### Performance Profiler (Recommended First)

Run sequential tests to identify bottlenecks:

```bash
npm run test:profile
```

**What it does**:
- Runs 10 iterations sequentially
- Measures each step duration
- Identifies bottlenecks
- Provides optimization recommendations

**Duration**: ~3-5 minutes

### Load Test (Full Test)

Run realistic load test with 10-20 concurrent users:

```bash
k6 run server/tests/load/k6-load-test.js
```

**What it does**:
- Simulates 10-20 concurrent brokers
- Ramps up gradually over 11 minutes
- Tests various property types and styles
- Measures success rate and performance

**Duration**: 11 minutes

### Custom Load Test

Run with custom parameters:

```bash
# 15 users for 5 minutes
k6 run --vus 15 --duration 5m server/tests/load/k6-load-test.js

# 20 users for 10 minutes (stress test)
k6 run --vus 20 --duration 10m server/tests/load/k6-load-test.js
```

## Test Against Different Environments

### Local Development

```bash
BASE_URL=http://localhost:5000 k6 run server/tests/load/k6-load-test.js
```

### Staging

```bash
BASE_URL=https://staging.optiprompt.se k6 run server/tests/load/k6-load-test.js
```

### Production (Use with Caution!)

```bash
BASE_URL=https://optiprompt.se k6 run server/tests/load/k6-load-test.js
```

⚠️ **Warning**: Only run production load tests during off-peak hours and with team approval.

## Interpreting Results

### Success Criteria

✅ **PASS** if all of these are true:
- Success rate ≥ 95%
- 95th percentile duration < 25s
- Median duration < 20s
- HTTP error rate < 5%

### Key Metrics

**Pipeline Performance**:
- `pipeline_success_rate`: Should be >95%
- `pipeline_duration_ms (p95)`: Should be <25,000ms
- `pipeline_duration_ms (p50)`: Should be <20,000ms

**Step Breakdown**:
- `step1_smart_generation_ms`: Target 15-18s
- `step2_post_processing_ms`: Target <1s
- `step3_expert_analysis_ms`: Target 5-7s

**Reliability**:
- `fallback_to_old_pipeline`: Should be minimal (<5%)
- `retry_attempts`: Should be low (<20% of requests)

### Example Output

```
Load Test Summary
==================================================

Overall Performance:
  Total Requests: 156
  Success Rate: 96.15%
  Failed Requests: 6

Pipeline Duration:
  Median: 19,234ms
  95th percentile: 24,567ms
  99th percentile: 26,123ms
  Max: 27,890ms

Step 1 (Smart Generation):
  Median: 16,234ms
  95th percentile: 17,890ms

Step 2 (Post-Processing):
  Median: 456ms
  95th percentile: 789ms

Step 3 (Expert Analysis):
  Median: 5,678ms
  95th percentile: 6,890ms

Reliability:
  Fallback Count: 3
  Retry Count: 12

Threshold Results:
  ✓ pipeline_success_rate
  ✓ pipeline_duration_ms
  ✓ http_req_failed
  ✓ http_req_duration
```

## Common Issues and Solutions

### Issue: k6 not found

**Solution**:
```bash
# Install k6 (see Prerequisites above)
brew install k6  # macOS
```

### Issue: Connection refused

**Solution**:
```bash
# Make sure server is running
npm run dev

# Or specify correct BASE_URL
BASE_URL=http://localhost:5000 k6 run server/tests/load/k6-load-test.js
```

### Issue: High failure rate

**Possible causes**:
- OpenAI API rate limits
- Server not running
- Database connection issues
- Network problems

**Diagnosis**:
```bash
# Check server logs
tail -f logs/server.log

# Check OpenAI API status
curl https://status.openai.com/api/v2/status.json

# Run profiler for detailed errors
npm run test:profile
```

### Issue: Slow performance

**Possible causes**:
- OpenAI API latency
- Database slow queries
- Low cache hit rate
- Server resource constraints

**Diagnosis**:
```bash
# Run profiler to identify bottleneck
npm run test:profile

# Check server resources
top  # or htop

# Check database performance
# See OPTIMIZATION_GUIDE.md for SQL queries
```

## Workflow

### 1. Baseline Testing (First Time)

```bash
# Run profiler to establish baseline
npm run test:profile

# Document results in PERFORMANCE_CHARACTERISTICS.md
```

### 2. Regular Testing (Weekly/Monthly)

```bash
# Quick check with profiler
npm run test:profile

# Full load test if needed
k6 run server/tests/load/k6-load-test.js
```

### 3. After Optimization

```bash
# Run profiler before optimization
npm run test:profile > before.txt

# Implement optimization
# ...

# Run profiler after optimization
npm run test:profile > after.txt

# Compare results
diff before.txt after.txt
```

### 4. Before Deployment

```bash
# Run full load test
k6 run server/tests/load/k6-load-test.js

# Verify all thresholds pass
# Review results in k6-results.json
```

## Results Location

**Console**: Real-time output with colors  
**JSON**: `server/tests/load/k6-results.json` (detailed metrics)

## Next Steps

1. ✅ Install k6
2. ✅ Run performance profiler: `npm run test:profile`
3. ✅ Review results and identify bottlenecks
4. ✅ Implement optimizations (see OPTIMIZATION_GUIDE.md)
5. ✅ Run load test: `k6 run server/tests/load/k6-load-test.js`
6. ✅ Document findings in PERFORMANCE_CHARACTERISTICS.md

## Additional Resources

- **Full Documentation**: `server/tests/load/README.md`
- **Optimization Guide**: `server/tests/load/OPTIMIZATION_GUIDE.md`
- **Performance Characteristics**: `.kiro/specs/perfect-swedish-pipeline/PERFORMANCE_CHARACTERISTICS.md`
- **k6 Documentation**: https://k6.io/docs/

## Support

If you encounter issues:
1. Check server logs
2. Review error messages in test output
3. Consult OPTIMIZATION_GUIDE.md for common issues
4. Ask team for help with specific error messages
