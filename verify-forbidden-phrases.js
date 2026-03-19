// Quick verification script for forbidden phrases optimization
import { 
  FORBIDDEN_PHRASES, 
  shouldBlockPhraseForStyle, 
  countEvidenceBackedBlockedPhrases,
  getExemptPhrases 
} from './server/lib/text-rules.js';

console.log('=== FORBIDDEN PHRASES VERIFICATION ===\n');

// 1. Check total count
console.log(`✓ Total forbidden phrases: ${FORBIDDEN_PHRASES.length} (target: 75)`);
if (FORBIDDEN_PHRASES.length !== 75) {
  console.error(`❌ ERROR: Expected 75 phrases, got ${FORBIDDEN_PHRASES.length}`);
}

// 2. Check counts per style
console.log('\n=== BLOCKED PHRASE COUNTS BY STYLE (Hemnet) ===');
const factualCount = countEvidenceBackedBlockedPhrases('factual', 'hemnet');
const balancedCount = countEvidenceBackedBlockedPhrases('balanced', 'hemnet');
const sellingCount = countEvidenceBackedBlockedPhrases('selling', 'hemnet');

console.log(`Factual:  ${factualCount} phrases blocked`);
console.log(`Balanced: ${balancedCount} phrases blocked`);
console.log(`Selling:  ${sellingCount} phrases blocked`);

if (factualCount <= balancedCount || balancedCount <= sellingCount) {
  console.error('❌ ERROR: Expected factual > balanced > selling');
} else {
  console.log('✓ Correct ordering: factual > balanced > selling');
}

// 3. Check platform differences
console.log('\n=== BLOCKED PHRASE COUNTS BY PLATFORM (Balanced style) ===');
const hemnetCount = countEvidenceBackedBlockedPhrases('balanced', 'hemnet');
const booliCount = countEvidenceBackedBlockedPhrases('balanced', 'booli');
const generalCount = countEvidenceBackedBlockedPhrases('balanced', 'general');

console.log(`Hemnet:  ${hemnetCount} phrases blocked`);
console.log(`Booli:   ${booliCount} phrases blocked`);
console.log(`General: ${generalCount} phrases blocked`);

// 4. Test critical phrases always blocked
console.log('\n=== CRITICAL AI PHRASES (Always Blocked) ===');
const criticalPhrases = [
  'välkommen till',
  'erbjuder',
  'för den som',
  'i hjärtat av',
  'missa inte',
  'stadens puls',
];

let criticalErrors = 0;
criticalPhrases.forEach(phrase => {
  const factual = shouldBlockPhraseForStyle(phrase, 'factual');
  const balanced = shouldBlockPhraseForStyle(phrase, 'balanced');
  const selling = shouldBlockPhraseForStyle(phrase, 'selling');
  
  if (factual && balanced && selling) {
    console.log(`✓ "${phrase}" blocked in all styles`);
  } else {
    console.error(`❌ "${phrase}" NOT blocked in all styles (F:${factual}, B:${balanced}, S:${selling})`);
    criticalErrors++;
  }
});

// 5. Test legitimate phrases NOT blocked
console.log('\n=== LEGITIMATE BROKER LANGUAGE (Should NOT Block) ===');
const legitimatePhrases = [
  'kommunikationer',
  'närhet till service',
  'smidig pendling',
  'genomtänkt planlösning',
  'ljus och luftig',
  'hög standard',
];

let legitimateErrors = 0;
legitimatePhrases.forEach(phrase => {
  const balanced = shouldBlockPhraseForStyle(phrase, 'balanced');
  const selling = shouldBlockPhraseForStyle(phrase, 'selling');
  
  if (!balanced && !selling) {
    console.log(`✓ "${phrase}" allowed in balanced/selling`);
  } else {
    console.error(`❌ "${phrase}" incorrectly blocked (B:${balanced}, S:${selling})`);
    legitimateErrors++;
  }
});

// 6. Check exempt sets
console.log('\n=== EXEMPT PHRASE SETS ===');
const factualExempt = getExemptPhrases('factual');
const balancedExempt = getExemptPhrases('balanced');
const sellingExempt = getExemptPhrases('selling');

console.log(`Factual exempt:  ${factualExempt.size} phrases`);
console.log(`Balanced exempt: ${balancedExempt.size} phrases`);
console.log(`Selling exempt:  ${sellingExempt.size} phrases`);

if (factualExempt.size !== 0) {
  console.error('❌ ERROR: Factual should have 0 exempt phrases');
}

// Check that balanced is subset of selling
let subsetError = false;
for (const phrase of balancedExempt) {
  if (!sellingExempt.has(phrase)) {
    console.error(`❌ ERROR: "${phrase}" in balanced but not in selling`);
    subsetError = true;
  }
}
if (!subsetError) {
  console.log('✓ Balanced exempt is subset of selling exempt');
}

// 7. Summary
console.log('\n=== SUMMARY ===');
const totalErrors = criticalErrors + legitimateErrors + (FORBIDDEN_PHRASES.length !== 75 ? 1 : 0);
if (totalErrors === 0) {
  console.log('✅ ALL CHECKS PASSED! Forbidden phrases optimization is working correctly.');
} else {
  console.error(`❌ ${totalErrors} ERROR(S) FOUND! Please review the output above.`);
  process.exit(1);
}
