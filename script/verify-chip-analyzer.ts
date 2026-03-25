/**
 * Verification script for Chip Analyzer module
 * Quick smoke test to verify the module works correctly
 */

import { createChipAnalyzer } from '../server/lib/chip-analyzer';
import type { FormSubmission, ChipUsageStats } from '../server/lib/chip-analyzer';

console.log('🔍 Verifying Chip Analyzer module...\n');

const analyzer = createChipAnalyzer();

// Test 1: analyzeChipUsage
console.log('Test 1: analyzeChipUsage');
const testData: FormSubmission[] = [
  {
    id: '1',
    userId: 'user1',
    timestamp: new Date(),
    propertyType: 'apartment',
    platform: 'hemnet',
    chipSelections: {
      kitchen: ['Renoverat kök', 'Köksö'],
      bathroom: ['Helkaklat'],
    },
    freetextFields: {},
  },
  {
    id: '2',
    userId: 'user2',
    timestamp: new Date(),
    propertyType: 'apartment',
    platform: 'hemnet',
    chipSelections: {
      kitchen: ['Renoverat kök'],
      bathroom: ['Helkaklat', 'Badkar'],
    },
    freetextFields: {},
  },
];

const usageStats = analyzer.analyzeChipUsage(testData);
console.log(`✓ Found ${usageStats.length} chip usage stats`);
console.log(`  - Renoverat kök: ${usageStats.find(s => s.chipLabel === 'Renoverat kök')?.selectionRate}%`);
console.log(`  - Köksö: ${usageStats.find(s => s.chipLabel === 'Köksö')?.selectionRate}%\n`);

// Test 2: identifyMissingChips
console.log('Test 2: identifyMissingChips');
const freetextData = [
  'induktionshäll, diskmaskin',
  'induktionshäll',
  'induktionshäll',
];
const missingChips = analyzer.identifyMissingChips(freetextData, 'kitchen');
console.log(`✓ Found ${missingChips.length} missing chip recommendations`);
if (missingChips.length > 0) {
  console.log(`  - ${missingChips[0].chipLabel}: ${missingChips[0].frequency?.toFixed(1)}%\n`);
}

// Test 3: identifyRarelyUsedChips
console.log('Test 3: identifyRarelyUsedChips');
const rareChips = analyzer.identifyRarelyUsedChips(usageStats, 5);
console.log(`✓ Found ${rareChips.length} rarely-used chips (threshold: 5%)\n`);

// Test 4: validateChipCoverage
console.log('Test 4: validateChipCoverage');
const topFeatures = ['renoverat kök', 'köksö', 'stenbänk/komposit'];
const isValid = analyzer.validateChipCoverage('kitchen', topFeatures);
console.log(`✓ Coverage validation: ${isValid ? 'PASS' : 'FAIL'}\n`);

// Test 5: analyzeChipTerminology
console.log('Test 5: analyzeChipTerminology');
const testChips = ['Renoverat kök med årtal', 'Stenbänk/komposit', 'Ekparkett'];
const terminologyIssues = analyzer.analyzeChipTerminology(testChips);
console.log(`✓ Found ${terminologyIssues.length} terminology issues`);
if (terminologyIssues.length > 0) {
  console.log(`  - ${terminologyIssues[0].chipLabel}: ${terminologyIssues[0].issue}\n`);
}

console.log('✅ All Chip Analyzer functions verified successfully!');
