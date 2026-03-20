/**
 * k6 Results Analyzer
 * 
 * Analyzes k6 load test results and provides insights
 * 
 * Run with:
 * tsx server/tests/load/analyze-results.ts [path-to-k6-results.json]
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface K6Metric {
  type: string;
  contains: string;
  values: {
    count?: number;
    rate?: number;
    avg?: number;
    min?: number;
    med?: number;
    max?: number;
    'p(90)'?: number;
    'p(95)'?: number;
    'p(99)'?: number;
  };
}

interface K6Results {
  metrics: Record<string, K6Metric>;
  root_group: {
    checks: Array<{
      name: string;
      passes: number;
      fails: number;
    }>;
  };
}

function analyzeResults(resultsPath: string) {
  console.log('\n📊 k6 Load Test Results Analysis\n');
  console.log('='.repeat(70) + '\n');

  // Read results file
  let results: K6Results;
  try {
    const content = readFileSync(resultsPath, 'utf-8');
    results = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to read results file: ${resultsPath}`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Extract key metrics
  const metrics = results.metrics;

  // Overall performance
  console.log('📈 Overall Performance:\n');
  
  const httpReqs = metrics.http_reqs?.values.count || 0;
  const httpReqFailed = metrics.http_req_failed?.values.rate || 0;
  const successRate = metrics.pipeline_success_rate?.values.rate || 0;
  
  console.log(`   Total Requests: ${httpReqs}`);
  console.log(`   Success Rate: ${(successRate * 100).toFixed(2)}% ${successRate >= 0.95 ? '✓' : '✗'}`);
  console.log(`   HTTP Error Rate: ${(httpReqFailed * 100).toFixed(2)}% ${httpReqFailed < 0.05 ? '✓' : '✗'}`);
  console.log('');

  // Pipeline timing
  console.log('⏱️  Pipeline Duration:\n');
  
  const pipelineDuration = metrics.pipeline_duration_ms?.values;
  if (pipelineDuration) {
    const p50 = pipelineDuration['p(50)'] || pipelineDuration.med || 0;
    const p95 = pipelineDuration['p(95)'] || 0;
    const p99 = pipelineDuration['p(99)'] || 0;
    const avg = pipelineDuration.avg || 0;
    const max = pipelineDuration.max || 0;

    console.log(`   Average: ${Math.round(avg)}ms`);
    console.log(`   Median (p50): ${Math.round(p50)}ms ${p50 < 20000 ? '✓' : '✗'}`);
    console.log(`   95th percentile: ${Math.round(p95)}ms ${p95 < 25000 ? '✓' : '✗'}`);
    console.log(`   99th percentile: ${Math.round(p99)}ms`);
    console.log(`   Max: ${Math.round(max)}ms`);
  } else {
    console.log('   ⚠️  No pipeline duration metrics found');
  }
  console.log('');

  // Step breakdown
  console.log('🔧 Step Breakdown:\n');
  
  const step1 = metrics.step1_smart_generation_ms?.values;
  const step2 = metrics.step2_post_processing_ms?.values;
  const step3 = metrics.step3_expert_analysis_ms?.values;

  if (step1) {
    const p50 = step1['p(50)'] || step1.med || 0;
    const p95 = step1['p(95)'] || 0;
    console.log(`   Step 1 (Smart Generation):`);
    console.log(`     Median: ${Math.round(p50)}ms`);
    console.log(`     95th percentile: ${Math.round(p95)}ms ${p95 <= 18000 ? '✓' : '✗'}`);
  }

  if (step2) {
    const p50 = step2['p(50)'] || step2.med || 0;
    const p95 = step2['p(95)'] || 0;
    console.log(`   Step 2 (Post-Processing):`);
    console.log(`     Median: ${Math.round(p50)}ms`);
    console.log(`     95th percentile: ${Math.round(p95)}ms ${p95 <= 1000 ? '✓' : '✗'}`);
  }

  if (step3) {
    const p50 = step3['p(50)'] || step3.med || 0;
    const p95 = step3['p(95)'] || 0;
    console.log(`   Step 3 (Expert Analysis):`);
    console.log(`     Median: ${Math.round(p50)}ms`);
    console.log(`     95th percentile: ${Math.round(p95)}ms ${p95 <= 7000 ? '✓' : '✗'}`);
  }

  if (!step1 && !step2 && !step3) {
    console.log('   ⚠️  No step breakdown metrics found');
  }
  console.log('');

  // Reliability
  console.log('🛡️  Reliability:\n');
  
  const fallbackCount = metrics.fallback_to_old_pipeline?.values.count || 0;
  const retryCount = metrics.retry_attempts?.values.count || 0;
  const fallbackRate = httpReqs > 0 ? (fallbackCount / httpReqs) * 100 : 0;
  const retryRate = httpReqs > 0 ? (retryCount / httpReqs) * 100 : 0;

  console.log(`   Fallback Count: ${fallbackCount} (${fallbackRate.toFixed(1)}%) ${fallbackRate < 10 ? '✓' : '✗'}`);
  console.log(`   Retry Count: ${retryCount} (${retryRate.toFixed(1)}%) ${retryRate < 20 ? '✓' : '✗'}`);
  console.log('');

  // HTTP metrics
  console.log('🌐 HTTP Metrics:\n');
  
  const httpReqDuration = metrics.http_req_duration?.values;
  if (httpReqDuration) {
    const p95 = httpReqDuration['p(95)'] || 0;
    const avg = httpReqDuration.avg || 0;
    console.log(`   Average Duration: ${Math.round(avg)}ms`);
    console.log(`   95th percentile: ${Math.round(p95)}ms ${p95 < 30000 ? '✓' : '✗'}`);
  }
  console.log('');

  // Check results
  if (results.root_group?.checks) {
    console.log('✅ Check Results:\n');
    results.root_group.checks.forEach(check => {
      const total = check.passes + check.fails;
      const passRate = total > 0 ? (check.passes / total) * 100 : 0;
      const status = check.fails === 0 ? '✓' : '✗';
      console.log(`   ${status} ${check.name}: ${check.passes}/${total} (${passRate.toFixed(1)}%)`);
    });
    console.log('');
  }

  // Summary
  console.log('📋 Summary:\n');
  
  const allTargetsMet = 
    successRate >= 0.95 &&
    httpReqFailed < 0.05 &&
    (pipelineDuration?.['p(95)'] || Infinity) < 25000 &&
    (pipelineDuration?.['p(50)'] || pipelineDuration?.med || Infinity) < 20000;

  if (allTargetsMet) {
    console.log('   ✅ All performance targets met!');
    console.log('   ✅ Success rate ≥95%');
    console.log('   ✅ 95th percentile duration <25s');
    console.log('   ✅ Median duration <20s');
    console.log('   ✅ HTTP error rate <5%');
  } else {
    console.log('   ⚠️  Some performance targets not met:');
    if (successRate < 0.95) {
      console.log(`   ✗ Success rate: ${(successRate * 100).toFixed(2)}% (target: ≥95%)`);
    }
    if ((pipelineDuration?.['p(95)'] || 0) >= 25000) {
      console.log(`   ✗ 95th percentile: ${Math.round(pipelineDuration?.['p(95)'] || 0)}ms (target: <25s)`);
    }
    if ((pipelineDuration?.['p(50)'] || pipelineDuration?.med || 0) >= 20000) {
      console.log(`   ✗ Median: ${Math.round(pipelineDuration?.['p(50)'] || pipelineDuration?.med || 0)}ms (target: <20s)`);
    }
    if (httpReqFailed >= 0.05) {
      console.log(`   ✗ HTTP error rate: ${(httpReqFailed * 100).toFixed(2)}% (target: <5%)`);
    }
  }
  console.log('');

  // Recommendations
  console.log('💡 Recommendations:\n');
  
  const recommendations: string[] = [];

  if (successRate < 0.95) {
    recommendations.push('Investigate failure causes - check error logs and Sentry');
    recommendations.push('Review retry logic and error handling');
  }

  if ((pipelineDuration?.['p(95)'] || 0) >= 25000) {
    recommendations.push('Pipeline is slow - run profiler to identify bottlenecks');
    recommendations.push('Check OpenAI API latency and database query performance');
  }

  if ((step1?.['p(95)'] || 0) > 18000) {
    recommendations.push('Step 1 (Smart Generation) is slow - optimize prompt length');
    recommendations.push('Review OpenAI API settings and consider caching');
  }

  if ((step2?.['p(95)'] || 0) > 1000) {
    recommendations.push('Step 2 (Post-Processing) is slow - profile regex patterns');
    recommendations.push('Consider pre-compiling patterns and optimizing loops');
  }

  if ((step3?.['p(95)'] || 0) > 7000) {
    recommendations.push('Step 3 (Expert Analysis) is slow - optimize analysis prompt');
    recommendations.push('Consider reducing feedback item count or making analysis optional');
  }

  if (fallbackRate >= 10) {
    recommendations.push('High fallback rate - investigate pipeline stability');
    recommendations.push('Check OpenAI API reliability and error patterns');
  }

  if (retryRate >= 20) {
    recommendations.push('High retry rate - review error classification');
    recommendations.push('Consider adjusting retry strategy or implementing circuit breaker');
  }

  if (recommendations.length === 0) {
    console.log('   ✅ Performance is excellent! No immediate optimizations needed.');
    console.log('   💡 Consider running tests with higher load to find limits');
    console.log('   💡 Set up continuous monitoring for production');
  } else {
    recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  }
  console.log('');

  // Next steps
  console.log('🚀 Next Steps:\n');
  console.log('   1. Review detailed metrics in k6-results.json');
  console.log('   2. Run profiler for step-by-step analysis: npm run test:profile');
  console.log('   3. Check server logs for error patterns');
  console.log('   4. Implement priority optimizations from OPTIMIZATION_GUIDE.md');
  console.log('   5. Re-run load test to validate improvements');
  console.log('');

  console.log('='.repeat(70) + '\n');

  // Exit with appropriate code
  process.exit(allTargetsMet ? 0 : 1);
}

// Main execution
const resultsPath = process.argv[2] || 'server/tests/load/k6-results.json';
const fullPath = resolve(process.cwd(), resultsPath);

console.log(`Analyzing results from: ${fullPath}`);

analyzeResults(fullPath);
