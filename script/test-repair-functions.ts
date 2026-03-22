#!/usr/bin/env tsx
/**
 * Test Script: Validate if Repair Functions Are Still Needed with GPT-5.2
 * 
 * Purpose: Generate 100 texts with GPT-5.2 and check if corrupted words still occur
 * 
 * Corrupted word patterns we're testing for:
 * - "köketför att" (should be "köket")
 * - "vardagsrummetför att" (should be "vardagsrummet")
 * - "välsköför att" (should be "välskött")
 * - Other fused words with "för att"
 * 
 * If GPT-5.2 doesn't produce these artifacts, we can remove:
 * - repairEmbeddedForAttArtifacts()
 * - hasCorruptedWordArtifacts()
 * - repairMechanicalBrokerArtifacts()
 */

import { SmartGenerationEngine } from '../server/lib/perfect-swedish-generator';
import type { WritingStyle } from '../shared/schema';

interface TestResult {
  iteration: number;
  text: string;
  hasCorruption: boolean;
  corruptedWords: string[];
  style: WritingStyle;
  platform: string;
}

// Patterns from hasCorruptedWordArtifacts()
const CORRUPTION_PATTERNS = [
  /\bköketför att\b/gi,
  /\bvardagsrummetför att\b/gi,
  /\bsovrumetför att\b/gi,
  /\bbadrummetför att\b/gi,
  /\bhallenför att\b/gi,
  /\bsödterass\b/gi,
  /\bvälsköför att\b/gi,
  /\banvändningssäför att\b/gi,
  // General pattern for any word fused with "för att"
  /\b([A-Za-zÅÄÖåäö]{3,})för att([A-Za-zÅÄÖåäö]{2,})\b/g,
];

function detectCorruption(text: string): { hasCorruption: boolean; corruptedWords: string[] } {
  const corruptedWords: string[] = [];
  
  for (const pattern of CORRUPTION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      corruptedWords.push(...matches);
    }
  }
  
  return {
    hasCorruption: corruptedWords.length > 0,
    corruptedWords: [...new Set(corruptedWords)] // Remove duplicates
  };
}

// Sample test data
const TEST_DISPOSITIONS = [
  {
    name: "Small apartment Umeå",
    propertyType: "lägenhet",
    rooms: 2,
    area: 55,
    location: "Umeå centrum",
    features: ["välskött", "praktiskt"],
    renovations: ["kök 2020"],
  },
  {
    name: "Villa Södermalm",
    propertyType: "villa",
    rooms: 5,
    area: 120,
    location: "Södermalm",
    features: ["rymligt", "ljust", "modernt"],
    renovations: ["badrum 2021", "kök 2022"],
  },
  {
    name: "Radhus Göteborg",
    propertyType: "radhus",
    rooms: 4,
    area: 95,
    location: "Göteborg",
    features: ["familjevänligt", "trädgård"],
    renovations: [],
  },
];

const STYLES: WritingStyle[] = ["balanced", "factual", "engaging"];
const PLATFORMS = ["hemnet", "booli", "egen-sida"];

async function runTest(): Promise<void> {
  console.log("🔍 Testing if GPT-5.2 produces corrupted words...\n");
  console.log("Target: 100 generations");
  console.log("Checking for patterns like: 'köketför att', 'välsköför att', etc.\n");
  
  const generator = new SmartGenerationEngine();
  const results: TestResult[] = [];
  let totalCorruptions = 0;
  
  // Generate 100 texts
  for (let i = 0; i < 100; i++) {
    const disposition = TEST_DISPOSITIONS[i % TEST_DISPOSITIONS.length];
    const style = STYLES[i % STYLES.length];
    const platform = PLATFORMS[i % PLATFORMS.length];
    
    try {
      const result = await generator.generate({
        disposition: JSON.stringify(disposition),
        style,
        platform,
        targetWordMin: 150,
        targetWordMax: 250,
      });
      
      const corruption = detectCorruption(result.improvedPrompt);
      
      if (corruption.hasCorruption) {
        totalCorruptions++;
        console.log(`❌ Iteration ${i + 1}: CORRUPTION FOUND`);
        console.log(`   Style: ${style}, Platform: ${platform}`);
        console.log(`   Corrupted words: ${corruption.corruptedWords.join(", ")}`);
        console.log(`   Text preview: ${result.improvedPrompt.substring(0, 100)}...\n`);
      } else {
        console.log(`✅ Iteration ${i + 1}: Clean (${style}, ${platform})`);
      }
      
      results.push({
        iteration: i + 1,
        text: result.improvedPrompt,
        hasCorruption: corruption.hasCorruption,
        corruptedWords: corruption.corruptedWords,
        style,
        platform,
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Iteration ${i + 1}: ERROR - ${error}`);
    }
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total generations: ${results.length}`);
  console.log(`Corruptions found: ${totalCorruptions}`);
  console.log(`Corruption rate: ${((totalCorruptions / results.length) * 100).toFixed(2)}%`);
  
  if (totalCorruptions === 0) {
    console.log("\n✅ SUCCESS: No corrupted words found!");
    console.log("\n🎯 RECOMMENDATION: REMOVE repair functions");
    console.log("   - repairEmbeddedForAttArtifacts()");
    console.log("   - hasCorruptedWordArtifacts()");
    console.log("   - repairMechanicalBrokerArtifacts()");
    console.log("\n   GPT-5.2 does not produce these artifacts.");
  } else {
    console.log("\n⚠️  CAUTION: Corrupted words still found");
    console.log("\n🎯 RECOMMENDATION: KEEP repair functions");
    console.log("   GPT-5.2 still produces corrupted words in some cases.");
    console.log("\n   Corrupted words found:");
    const allCorrupted = results
      .filter(r => r.hasCorruption)
      .flatMap(r => r.corruptedWords);
    const uniqueCorrupted = [...new Set(allCorrupted)];
    uniqueCorrupted.forEach(word => console.log(`   - "${word}"`));
  }
  
  console.log("\n" + "=".repeat(60));
}

// Run the test
runTest().catch(console.error);
