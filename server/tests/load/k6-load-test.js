/**
 * k6 Load Test for Perfect Swedish Pipeline
 * 
 * This test simulates realistic broker usage patterns with 10-20 concurrent users
 * generating property listings through the new 3-step pipeline.
 * 
 * Performance Targets:
 * - Complete pipeline: <25 seconds
 * - Success rate: 95%+
 * - Concurrent users: 10-20
 * 
 * Run with:
 * k6 run server/tests/load/k6-load-test.js
 * 
 * Or with custom parameters:
 * k6 run --vus 15 --duration 5m server/tests/load/k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const successRate = new Rate('pipeline_success_rate');
const pipelineTime = new Trend('pipeline_duration_ms');
const step1Time = new Trend('step1_smart_generation_ms');
const step2Time = new Trend('step2_post_processing_ms');
const step3Time = new Trend('step3_expert_analysis_ms');
const fallbackCount = new Counter('fallback_to_old_pipeline');
const retryCount = new Counter('retry_attempts');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Ramp up to 5 users
    { duration: '2m', target: 10 },  // Ramp up to 10 users
    { duration: '3m', target: 15 },  // Ramp up to 15 users
    { duration: '2m', target: 20 },  // Peak at 20 users
    { duration: '2m', target: 10 },  // Ramp down to 10 users
    { duration: '1m', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    'pipeline_success_rate': ['rate>0.95'],           // 95%+ success rate
    'pipeline_duration_ms': ['p(95)<25000'],          // 95th percentile <25s
    'pipeline_duration_ms': ['p(50)<20000'],          // Median <20s
    'http_req_failed': ['rate<0.05'],                 // <5% HTTP errors
    'http_req_duration': ['p(95)<30000'],             // 95th percentile <30s
  },
};

// Sample dispositions for realistic testing
const dispositions = [
  // Lägenhet (Apartment)
  {
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
  },
  // Villa
  {
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
  },
  // Bostadsrätt (Condominium)
  {
    property: {
      type: 'bostadsrätt',
      address: 'Vasagatan 22',
      living_area: 52,
      rooms: 2,
      floor: 5,
      build_year: 1920,
      condition: 'Renoverad',
      layout: 'smart planlösning',
      materials: {
        kitchen: 'nyrenoverat kök',
        bathroom: 'modernt badrum'
      },
      features: ['högt i tak', 'originaldetaljer', 'ljusinsläpp']
    },
    location: {
      address: 'Vasagatan 22, Stockholm',
      area: 'Vasastan',
      municipality: 'Stockholm',
      transport: 'tunnelbana 2 min',
      amenities: ['restauranger', 'kaféer', 'butiker'],
      services: ['skola', 'vårdcentral']
    },
    financial: {
      fee: 2800,
      price: 3200000
    }
  },
  // Fritidshus (Vacation home)
  {
    property: {
      type: 'fritidshus',
      address: 'Strandvägen 8',
      living_area: 65,
      plot_area: 1200,
      rooms: 3,
      build_year: 1975,
      condition: 'Bra',
      layout: 'öppen planlösning',
      materials: {
        kitchen: 'enkelt kök',
        bathroom: 'badrum med dusch'
      },
      outdoor: {
        garden: 'naturtomt med sjöutsikt',
        dock: 'egen brygga',
        sauna: 'bastu'
      }
    },
    location: {
      address: 'Strandvägen 8, Norrtälje',
      area: 'Roslagen',
      municipality: 'Norrtälje',
      transport: 'bil 90 min från Stockholm',
      amenities: ['affär 5 km'],
      services: ['badplats', 'båtplats']
    },
    financial: {
      price: 2500000
    }
  }
];

const styles = ['factual', 'balanced', 'selling'];
const platforms = ['hemnet', 'booli', 'facebook'];

// Base URL - update this to match your environment
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  // Select random disposition, style, and platform
  const disposition = dispositions[Math.floor(Math.random() * dispositions.length)];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];

  // Generate unique session ID for this virtual user
  const sessionId = `load-test-${__VU}-${__ITER}`;
  const userId = `load-test-user-${__VU}`;

  // Prepare request payload
  const payload = JSON.stringify({
    disposition,
    style,
    platform,
    targetWordMin: 150,
    targetWordMax: 250,
    userId,
    sessionId,
    forceVariant: 'treatment' // Force new pipeline for load testing
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '35s', // Allow extra time beyond 25s target
  };

  // Record start time
  const startTime = Date.now();

  // Make request to pipeline endpoint
  const response = http.post(`${BASE_URL}/api/optimize-v2`, payload, params);

  // Record total duration
  const duration = Date.now() - startTime;
  pipelineTime.add(duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has improvedPrompt': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.improvedPrompt && body.improvedPrompt.length > 0;
      } catch {
        return false;
      }
    },
    'has headline': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.headline && body.headline.length > 0;
      } catch {
        return false;
      }
    },
    'completed in <25s': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.metrics && body.metrics.totalDuration < 25000;
      } catch {
        return false;
      }
    },
    'no fallback used': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.fallbackUsed;
      } catch {
        return true; // If we can't parse, assume no fallback
      }
    }
  });

  // Record success/failure
  successRate.add(success);

  // Parse response and extract metrics
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      
      // Record step durations
      if (body.metrics) {
        if (body.metrics.step1Duration) {
          step1Time.add(body.metrics.step1Duration);
        }
        if (body.metrics.step2Duration) {
          step2Time.add(body.metrics.step2Duration);
        }
        if (body.metrics.step3Duration) {
          step3Time.add(body.metrics.step3Duration);
        }
        if (body.metrics.retryCount > 0) {
          retryCount.add(body.metrics.retryCount);
        }
      }

      // Track fallback usage
      if (body.fallbackUsed) {
        fallbackCount.add(1);
      }

      // Log slow requests
      if (duration > 25000) {
        console.warn(`Slow request: ${duration}ms for ${disposition.property.type} (${style})`);
      }

      // Log failures
      if (!body.improvedPrompt || body.improvedPrompt.length === 0) {
        console.error(`Empty result for ${disposition.property.type} (${style})`);
      }
    } catch (e) {
      console.error(`Failed to parse response: ${e.message}`);
    }
  } else {
    console.error(`HTTP ${response.status}: ${response.body}`);
  }

  // Realistic think time between requests (30-60 seconds)
  // Brokers don't generate listings continuously
  sleep(Math.random() * 30 + 30);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'server/tests/load/k6-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}Load Test Summary\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;

  // Overall metrics
  summary += `${indent}Overall Performance:\n`;
  summary += `${indent}  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Success Rate: ${(data.metrics.pipeline_success_rate.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}  Failed Requests: ${data.metrics.http_req_failed.values.count}\n\n`;

  // Pipeline timing
  summary += `${indent}Pipeline Duration:\n`;
  summary += `${indent}  Median: ${data.metrics.pipeline_duration_ms.values['p(50)'].toFixed(0)}ms\n`;
  summary += `${indent}  95th percentile: ${data.metrics.pipeline_duration_ms.values['p(95)'].toFixed(0)}ms\n`;
  summary += `${indent}  99th percentile: ${data.metrics.pipeline_duration_ms.values['p(99)'].toFixed(0)}ms\n`;
  summary += `${indent}  Max: ${data.metrics.pipeline_duration_ms.values.max.toFixed(0)}ms\n\n`;

  // Step timing
  if (data.metrics.step1_smart_generation_ms) {
    summary += `${indent}Step 1 (Smart Generation):\n`;
    summary += `${indent}  Median: ${data.metrics.step1_smart_generation_ms.values['p(50)'].toFixed(0)}ms\n`;
    summary += `${indent}  95th percentile: ${data.metrics.step1_smart_generation_ms.values['p(95)'].toFixed(0)}ms\n\n`;
  }

  if (data.metrics.step2_post_processing_ms) {
    summary += `${indent}Step 2 (Post-Processing):\n`;
    summary += `${indent}  Median: ${data.metrics.step2_post_processing_ms.values['p(50)'].toFixed(0)}ms\n`;
    summary += `${indent}  95th percentile: ${data.metrics.step2_post_processing_ms.values['p(95)'].toFixed(0)}ms\n\n`;
  }

  if (data.metrics.step3_expert_analysis_ms) {
    summary += `${indent}Step 3 (Expert Analysis):\n`;
    summary += `${indent}  Median: ${data.metrics.step3_expert_analysis_ms.values['p(50)'].toFixed(0)}ms\n`;
    summary += `${indent}  95th percentile: ${data.metrics.step3_expert_analysis_ms.values['p(95)'].toFixed(0)}ms\n\n`;
  }

  // Reliability metrics
  summary += `${indent}Reliability:\n`;
  summary += `${indent}  Fallback Count: ${data.metrics.fallback_to_old_pipeline.values.count}\n`;
  summary += `${indent}  Retry Count: ${data.metrics.retry_attempts.values.count}\n\n`;

  // Threshold results
  summary += `${indent}Threshold Results:\n`;
  for (const [name, threshold] of Object.entries(data.thresholds)) {
    const passed = threshold.ok ? '✓' : '✗';
    summary += `${indent}  ${passed} ${name}\n`;
  }

  return summary;
}
