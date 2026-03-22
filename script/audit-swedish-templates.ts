#!/usr/bin/env tsx
/**
 * Script: Audit Swedish Templates for Grammatical Correctness
 * 
 * Purpose: Test all deterministic templates to ensure they generate
 * grammatically correct Swedish.
 * 
 * Background: v2.9.5 bug showed that templates can generate incorrect Swedish:
 * - "Detaljer som välskött, praktiskt bidrar till helhetsintrycket."
 * - This is grammatically incorrect (adjectives used as nouns)
 * 
 * This script tests all templates with various inputs to catch similar issues.
 */

interface TemplateTest {
  name: string;
  template: () => string;
  expectedPattern?: RegExp;
  shouldNotContain?: string[];
  description: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  output: string;
  issues: string[];
}

// Import the functions we're testing
import { buildDeterministicFallbackDescription } from '../server/routes';

// Known grammatical issues to check for
const GRAMMATICAL_ISSUES = [
  {
    pattern: /\bDetaljer som [^,]+, [^,]+ bidrar\b/gi,
    issue: "Adjectives used incorrectly after 'Detaljer som' (should be nouns or proper sentence structure)"
  },
  {
    pattern: /\b([A-ZÅÄÖ][a-zåäö]+)för att([a-zåäö]+)\b/g,
    issue: "Fused words with 'för att' (e.g., 'köketför att')"
  },
  {
    pattern: /\b(är|har|finns)\s+(är|har|finns)\b/gi,
    issue: "Repeated verbs"
  },
  {
    pattern: /\.\s*\./g,
    issue: "Double periods"
  },
  {
    pattern: /\s{2,}/g,
    issue: "Multiple spaces"
  },
  {
    pattern: /\b(och|samt)\s+(och|samt)\b/gi,
    issue: "Repeated conjunctions"
  },
];

// Test cases for buildDeterministicFallbackDescription
const FALLBACK_TESTS: Array<{
  name: string;
  disposition: any;
  style: 'balanced' | 'factual' | 'engaging';
  description: string;
}> = [
  {
    name: "Small apartment with adjective features",
    disposition: {
      propertyType: "lägenhet",
      rooms: 2,
      area: 55,
      uniqueSellingPoints: "välskött, praktiskt",
      location: "Umeå centrum",
    },
    style: "balanced",
    description: "Test case from v2.9.5 bug - adjectives should be handled correctly"
  },
  {
    name: "Villa with noun features",
    disposition: {
      propertyType: "villa",
      rooms: 5,
      area: 120,
      uniqueSellingPoints: "trädgård, garage, pool",
      location: "Södermalm",
    },
    style: "balanced",
    description: "Nouns should work correctly"
  },
  {
    name: "Empty features",
    disposition: {
      propertyType: "radhus",
      rooms: 4,
      area: 95,
      uniqueSellingPoints: "",
      location: "Göteborg",
    },
    style: "factual",
    description: "Should handle empty features gracefully"
  },
  {
    name: "Mixed features (adjectives and nouns)",
    disposition: {
      propertyType: "lägenhet",
      rooms: 3,
      area: 75,
      uniqueSellingPoints: "rymligt, balkong, ljust, förråd",
      location: "Stockholm",
    },
    style: "engaging",
    description: "Mixed adjectives and nouns"
  },
];

function checkGrammar(text: string): string[] {
  const issues: string[] = [];
  
  for (const check of GRAMMATICAL_ISSUES) {
    if (check.pattern.test(text)) {
      issues.push(check.issue);
    }
  }
  
  return issues;
}

function testFallbackTemplate(
  name: string,
  disposition: any,
  style: 'balanced' | 'factual' | 'engaging',
  description: string
): TestResult {
  try {
    const output = buildDeterministicFallbackDescription(disposition, style);
    const issues = checkGrammar(output);
    
    return {
      name,
      passed: issues.length === 0,
      output,
      issues,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      output: "",
      issues: [`Exception thrown: ${error}`],
    };
  }
}

async function runAudit(): Promise<void> {
  console.log("🔍 Auditing Swedish Templates for Grammatical Correctness\n");
  console.log("=" .repeat(60));
  
  const results: TestResult[] = [];
  
  // Test fallback templates
  console.log("\n📝 Testing buildDeterministicFallbackDescription()...\n");
  
  for (const test of FALLBACK_TESTS) {
    const result = testFallbackTemplate(test.name, test.disposition, test.style, test.description);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${result.name}`);
      console.log(`   Output: ${result.output.substring(0, 100)}...`);
    } else {
      console.log(`❌ ${result.name}`);
      console.log(`   Output: ${result.output.substring(0, 100)}...`);
      console.log(`   Issues:`);
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    console.log();
  }
  
  // Summary
  console.log("=" .repeat(60));
  console.log("📊 AUDIT SUMMARY");
  console.log("=" .repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((passed / results.length) * 100).toFixed(2)}%`);
  
  if (failed > 0) {
    console.log("\n⚠️  ISSUES FOUND:");
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`\n${r.name}:`);
        r.issues.forEach(issue => console.log(`  - ${issue}`));
      });
    
    console.log("\n🎯 RECOMMENDATION: Fix template issues before deploying");
  } else {
    console.log("\n✅ All templates generate grammatically correct Swedish!");
  }
  
  console.log("\n" + "=" .repeat(60));
}

// Run the audit
runAudit().catch(console.error);
