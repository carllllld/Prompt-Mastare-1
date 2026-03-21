#!/usr/bin/env tsx
/**
 * Test script to verify pipeline fixes work correctly
 * Tests:
 * 1. Analyzer JSON keyword fix
 * 2. Paragraph enforcement fix
 * 3. PROMPT_VERSION bump to 2.6.0
 */

import { SmartGenerationEngine } from '../server/lib/perfect-swedish-generator';
import { DeterministicPostProcessor } from '../server/lib/perfect-swedish-post-processor';
import { ExpertAIAnalyzer } from '../server/lib/perfect-swedish-analyzer';

async function testPipelineFixes() {
  console.log('🧪 Testing Pipeline Fixes v2.6.0\n');

  // Test 1: Check PROMPT_VERSION
  console.log('1️⃣ Checking PROMPT_VERSION...');
  const generator = new SmartGenerationEngine();
  const promptVersion = (generator as any).PROMPT_VERSION;
  if (promptVersion === '2.6.0') {
    console.log('✅ PROMPT_VERSION is 2.6.0 (correct)');
  } else {
    console.log(`❌ PROMPT_VERSION is ${promptVersion} (should be 2.6.0)`);
    process.exit(1);
  }

  // Test 2: Check analyzer prompt has "json" keyword
  console.log('\n2️⃣ Checking analyzer prompt for JSON keyword...');
  const analyzer = new ExpertAIAnalyzer();
  const analyzerPrompt = (analyzer as any).buildAnalysisPrompt({
    improvedPrompt: 'Test text',
    headline: 'Test headline',
    socialCopy: 'Test social',
    disposition: {},
    style: 'balanced',
    platform: 'hemnet'
  });
  
  if (analyzerPrompt.includes('json') || analyzerPrompt.includes('JSON')) {
    console.log('✅ Analyzer prompt contains "json" keyword');
    const match = analyzerPrompt.match(/JSON \(json format\)/);
    if (match) {
      console.log('   Found: "JSON (json format)"');
    }
  } else {
    console.log('❌ Analyzer prompt missing "json" keyword');
    process.exit(1);
  }

  // Test 3: Check paragraph enforcement logic
  console.log('\n3️⃣ Testing paragraph enforcement...');
  const postProcessor = new DeterministicPostProcessor();
  
  // Test with 3 sentences (should now work)
  const testText3Sentences = 'Första meningen. Andra meningen. Tredje meningen.';
  const transformations3: any[] = [];
  const result3 = (postProcessor as any).enforceParagraphBreaks(
    { improvedPrompt: testText3Sentences },
    transformations3
  );
  
  if (transformations3.some(t => t.type === 'paragraph_enforcement')) {
    console.log('✅ Paragraph enforcement works with 3 sentences');
    console.log(`   Result has ${(result3.improvedPrompt.match(/\n\n/g) || []).length} paragraph breaks`);
  } else {
    console.log('❌ Paragraph enforcement did not trigger with 3 sentences');
    process.exit(1);
  }

  // Test with 5 sentences (should definitely work)
  const testText5Sentences = 'Första meningen. Andra meningen. Tredje meningen. Fjärde meningen. Femte meningen.';
  const transformations5: any[] = [];
  const result5 = (postProcessor as any).enforceParagraphBreaks(
    { improvedPrompt: testText5Sentences },
    transformations5
  );
  
  if (transformations5.some(t => t.type === 'paragraph_enforcement')) {
    console.log('✅ Paragraph enforcement works with 5 sentences');
    console.log(`   Result has ${(result5.improvedPrompt.match(/\n\n/g) || []).length} paragraph breaks`);
  } else {
    console.log('❌ Paragraph enforcement did not trigger with 5 sentences');
    process.exit(1);
  }

  // Test with text that already has paragraph breaks (should skip)
  const testTextWithBreaks = 'Första meningen.\n\nAndra meningen.\n\nTredje meningen.\n\nFjärde meningen.';
  const transformationsExisting: any[] = [];
  const resultExisting = (postProcessor as any).enforceParagraphBreaks(
    { improvedPrompt: testTextWithBreaks },
    transformationsExisting
  );
  
  if (!transformationsExisting.some(t => t.type === 'paragraph_enforcement')) {
    console.log('✅ Paragraph enforcement correctly skips text with existing breaks');
  } else {
    console.log('⚠️  Paragraph enforcement ran on text that already had breaks (might be OK)');
  }

  console.log('\n✅ All pipeline fixes verified successfully!');
  console.log('\n📋 Summary:');
  console.log('   - PROMPT_VERSION: 2.6.0 ✓');
  console.log('   - Analyzer JSON keyword: Present ✓');
  console.log('   - Paragraph enforcement: Works with 3+ sentences ✓');
  console.log('\n🚀 Ready to deploy!');
}

testPipelineFixes().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
