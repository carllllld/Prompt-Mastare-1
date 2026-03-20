/**
 * Performance Profiler for Perfect Swedish Pipeline
 * 
 * This script profiles the pipeline to identify performance bottlenecks
 * by running multiple iterations and collecting detailed timing data.
 * 
 * Run with:
 * tsx server/tests/load/performance-profiler.ts
 */

import { PerfectSwedishOrchestrator } from '../../lib/perfect-swedish-orchestrator';
import type { PipelineRequest } from '../../lib/perfect-swedish-orchestrator';
import { WritingStyle } from '../../lib/text-rules';

interface ProfileResult {
  iteration: number;
  totalDuration: number;
  step1Duration?: number;
  step2Duration?: number;
  step3Duration?: number;
  retryCount: number;
  success: boolean;
  errorType?: string;
  fallbackUsed: boolean;
}

interface ProfileSummary {
  totalIterations: number;
  successfulIterations: number;
  failedIterations: number;
  successRate: number;
  avgTotalDuration: number;
  medianTotalDuration: number;
  p95TotalDuration: number;
  p99TotalDuration: number;
  avgStep1Duration: number;
  avgStep2Duration: number;
  avgStep3Duration: number;
  totalRetries: number;
  fallbackCount: number;
  bottlenecks: string[];
}

// Sample dispositions for testing
const testDispositions = [
  {
    name: 'Lägenhet - Södermalm',
    disposition: {
      property: {
        type: 'lägenhet',
        address: 'Storgatan 12',
        living_area: 75,
        rooms: 3,
        floor: 3,
        build_year: 2010,
        condition: 'Bra',
        layout: 'öppet kök mot vardagsrum',
        materials: {
          kitchen: 'modernt kök med köksö',
          bathroom: 'helkaklat badrum'
        },
        balcony: {
          exists: true,
          type: 'balkong',
          size: '10 kvm',
          direction: 'söder'
        }
      },
      location: {
        address: 'Storgatan 12, Stockholm',
        area: 'Södermalm',
        municipality: 'Stockholm',
        transport: 'tunnelbana 5 min',
        amenities: ['ICA', 'apotek', 'gym'],
        services: ['skola', 'förskola']
      },
      financial: {
        fee: 3500,
        price: 4500000
      }
    }
  },
  {
    name: 'Villa - Värmdö',
    disposition: {
      property: {
        type: 'villa',
        address: 'Ekvägen 5',
        living_area: 146,
        plot_area: 800,
        rooms: 5,
        build_year: 1985,
        condition: 'Renoverad',
        layout: 'traditionell planlösning',
        materials: {
          kitchen: 'renoverat kök 2023',
          bathroom: 'två badrum, ett med bastu'
        },
        outdoor: {
          garden: 'stor trädgård med pool',
          garage: 'dubbelgarage',
          patio: 'stor uteplats'
        }
      },
      location: {
        address: 'Ekvägen 5, Värmdö',
        area: 'Mörtnäs',
        municipality: 'Värmdö',
        transport: 'bil 25 min till Stockholm',
        amenities: ['ICA Kvantum', 'skola', 'förskola'],
        services: ['badplats', 'naturreservat']
      },
      financial: {
        price: 7500000
      }
    }
  }
];

async function profilePipeline(iterations: number = 10): Promise<ProfileResult[]> {
  const orchestrator = new PerfectSwedishOrchestrator();
  const results: ProfileResult[] = [];

  console.log(`\n🔍 Starting performance profiling with ${iterations} iterations...\n`);

  for (let i = 0; i < iterations; i++) {
    // Alternate between test dispositions
    const testCase = testDispositions[i % testDispositions.length];
    
    const request: PipelineRequest = {
      disposition: testCase.disposition,
      style: 'balanced' as WritingStyle,
      platform: 'hemnet',
      targetWordMin: 150,
      targetWordMax: 250,
      userId: `profiler-user-${i}`,
      sessionId: `profiler-session-${i}`,
      forceVariant: 'treatment'
    };

    console.log(`Iteration ${i + 1}/${iterations}: ${testCase.name}`);

    try {
      const result = await orchestrator.execute(request);

      results.push({
        iteration: i + 1,
        totalDuration: result.metrics.totalDuration,
        step1Duration: result.metrics.step1Duration,
        step2Duration: result.metrics.step2Duration,
        step3Duration: result.metrics.step3Duration,
        retryCount: result.metrics.retryCount,
        success: result.metrics.success,
        errorType: result.metrics.errorType,
        fallbackUsed: result.fallbackUsed
      });

      // Log timing breakdown
      console.log(`  ✓ Success in ${result.metrics.totalDuration}ms`);
      console.log(`    - Step 1: ${result.metrics.step1Duration}ms`);
      console.log(`    - Step 2: ${result.metrics.step2Duration}ms`);
      console.log(`    - Step 3: ${result.metrics.step3Duration}ms`);
      if (result.metrics.retryCount > 0) {
        console.log(`    - Retries: ${result.metrics.retryCount}`);
      }
      console.log('');

    } catch (error) {
      console.error(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}\n`);
      
      results.push({
        iteration: i + 1,
        totalDuration: 0,
        retryCount: 0,
        success: false,
        errorType: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: false
      });
    }

    // Small delay between iterations to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

function analyzResults(results: ProfileResult[]): ProfileSummary {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  // Calculate durations (only from successful runs)
  const totalDurations = successful.map(r => r.totalDuration).sort((a, b) => a - b);
  const step1Durations = successful.map(r => r.step1Duration || 0).filter(d => d > 0);
  const step2Durations = successful.map(r => r.step2Duration || 0).filter(d => d > 0);
  const step3Durations = successful.map(r => r.step3Duration || 0).filter(d => d > 0);

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const percentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const index = Math.ceil(arr.length * p) - 1;
    return arr[index];
  };

  const summary: ProfileSummary = {
    totalIterations: results.length,
    successfulIterations: successful.length,
    failedIterations: failed.length,
    successRate: successful.length / results.length,
    avgTotalDuration: avg(totalDurations),
    medianTotalDuration: percentile(totalDurations, 0.5),
    p95TotalDuration: percentile(totalDurations, 0.95),
    p99TotalDuration: percentile(totalDurations, 0.99),
    avgStep1Duration: avg(step1Durations),
    avgStep2Duration: avg(step2Durations),
    avgStep3Duration: avg(step3Durations),
    totalRetries: results.reduce((sum, r) => sum + r.retryCount, 0),
    fallbackCount: results.filter(r => r.fallbackUsed).length,
    bottlenecks: []
  };

  // Identify bottlenecks
  if (summary.avgStep1Duration > 18000) {
    summary.bottlenecks.push(`Step 1 (Smart Generation) is slow: ${Math.round(summary.avgStep1Duration)}ms (target: 15-18s)`);
  }
  if (summary.avgStep2Duration > 1000) {
    summary.bottlenecks.push(`Step 2 (Post-Processing) is slow: ${Math.round(summary.avgStep2Duration)}ms (target: <1s)`);
  }
  if (summary.avgStep3Duration > 7000) {
    summary.bottlenecks.push(`Step 3 (Expert Analysis) is slow: ${Math.round(summary.avgStep3Duration)}ms (target: 5-7s)`);
  }
  if (summary.avgTotalDuration > 25000) {
    summary.bottlenecks.push(`Total pipeline is slow: ${Math.round(summary.avgTotalDuration)}ms (target: <25s)`);
  }
  if (summary.successRate < 0.95) {
    summary.bottlenecks.push(`Success rate is low: ${(summary.successRate * 100).toFixed(1)}% (target: 95%+)`);
  }
  if (summary.totalRetries > results.length * 0.2) {
    summary.bottlenecks.push(`High retry rate: ${summary.totalRetries} retries in ${results.length} iterations`);
  }

  return summary;
}

function printSummary(summary: ProfileSummary) {
  console.log('\n' + '='.repeat(70));
  console.log('PERFORMANCE PROFILE SUMMARY');
  console.log('='.repeat(70) + '\n');

  // Overall metrics
  console.log('📊 Overall Metrics:');
  console.log(`   Total Iterations: ${summary.totalIterations}`);
  console.log(`   Successful: ${summary.successfulIterations} (${(summary.successRate * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${summary.failedIterations}`);
  console.log(`   Fallbacks: ${summary.fallbackCount}`);
  console.log(`   Total Retries: ${summary.totalRetries}\n`);

  // Timing metrics
  console.log('⏱️  Timing Metrics:');
  console.log(`   Average Total: ${Math.round(summary.avgTotalDuration)}ms`);
  console.log(`   Median Total: ${Math.round(summary.medianTotalDuration)}ms`);
  console.log(`   95th Percentile: ${Math.round(summary.p95TotalDuration)}ms`);
  console.log(`   99th Percentile: ${Math.round(summary.p99TotalDuration)}ms\n`);

  // Step breakdown
  console.log('🔧 Step Breakdown:');
  console.log(`   Step 1 (Smart Generation): ${Math.round(summary.avgStep1Duration)}ms (target: 15-18s)`);
  console.log(`   Step 2 (Post-Processing): ${Math.round(summary.avgStep2Duration)}ms (target: <1s)`);
  console.log(`   Step 3 (Expert Analysis): ${Math.round(summary.avgStep3Duration)}ms (target: 5-7s)\n`);

  // Performance targets
  console.log('🎯 Performance Targets:');
  const totalTarget = summary.avgTotalDuration < 25000 ? '✓' : '✗';
  const successTarget = summary.successRate >= 0.95 ? '✓' : '✗';
  const step1Target = summary.avgStep1Duration <= 18000 ? '✓' : '✗';
  const step2Target = summary.avgStep2Duration <= 1000 ? '✓' : '✗';
  const step3Target = summary.avgStep3Duration <= 7000 ? '✓' : '✗';

  console.log(`   ${totalTarget} Total Duration <25s: ${Math.round(summary.avgTotalDuration)}ms`);
  console.log(`   ${successTarget} Success Rate ≥95%: ${(summary.successRate * 100).toFixed(1)}%`);
  console.log(`   ${step1Target} Step 1 ≤18s: ${Math.round(summary.avgStep1Duration)}ms`);
  console.log(`   ${step2Target} Step 2 <1s: ${Math.round(summary.avgStep2Duration)}ms`);
  console.log(`   ${step3Target} Step 3 ≤7s: ${Math.round(summary.avgStep3Duration)}ms\n`);

  // Bottlenecks
  if (summary.bottlenecks.length > 0) {
    console.log('⚠️  Bottlenecks Identified:');
    summary.bottlenecks.forEach(bottleneck => {
      console.log(`   • ${bottleneck}`);
    });
    console.log('');
  } else {
    console.log('✅ No bottlenecks identified - all targets met!\n');
  }

  // Recommendations
  console.log('💡 Optimization Recommendations:');
  if (summary.avgStep1Duration > 18000) {
    console.log('   • Optimize Smart Generation prompt length');
    console.log('   • Review OpenAI API settings (temperature, max_tokens)');
    console.log('   • Consider caching prompt templates in Redis');
  }
  if (summary.avgStep2Duration > 1000) {
    console.log('   • Profile regex patterns in Post-Processor');
    console.log('   • Pre-compile regex patterns at module load');
    console.log('   • Optimize transformation loops');
  }
  if (summary.avgStep3Duration > 7000) {
    console.log('   • Optimize Expert Analysis prompt');
    console.log('   • Review OpenAI API settings');
    console.log('   • Consider reducing analysis depth');
  }
  if (summary.successRate < 0.95) {
    console.log('   • Review error logs for failure patterns');
    console.log('   • Improve retry logic');
    console.log('   • Check OpenAI API rate limits');
  }
  if (summary.totalRetries > summary.totalIterations * 0.2) {
    console.log('   • Investigate root causes of retries');
    console.log('   • Improve error handling');
    console.log('   • Consider adjusting retry strategy');
  }
  if (summary.bottlenecks.length === 0) {
    console.log('   • Performance is excellent!');
    console.log('   • Consider running load tests with more concurrent users');
    console.log('   • Monitor production metrics for real-world performance');
  }
  console.log('');
}

// Main execution
async function main() {
  const iterations = parseInt(process.argv[2] || '10', 10);
  
  console.log('Perfect Swedish Pipeline - Performance Profiler');
  console.log('='.repeat(70));
  console.log(`Iterations: ${iterations}`);
  console.log('Target: <25s total, 95%+ success rate');
  console.log('');

  const results = await profilePipeline(iterations);
  const summary = analyzResults(results);
  printSummary(summary);

  // Exit with error code if targets not met
  const allTargetsMet = 
    summary.avgTotalDuration < 25000 &&
    summary.successRate >= 0.95 &&
    summary.avgStep1Duration <= 18000 &&
    summary.avgStep2Duration <= 1000 &&
    summary.avgStep3Duration <= 7000;

  if (!allTargetsMet) {
    console.log('❌ Performance targets not met. See recommendations above.\n');
    process.exit(1);
  } else {
    console.log('✅ All performance targets met!\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
