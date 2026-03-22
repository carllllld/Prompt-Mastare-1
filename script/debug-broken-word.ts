/**
 * Debug script to understand why "välsköför att" appears in fallback text
 */

import { buildDispositionFromStructuredData } from '../server/routes';
import { buildDeterministicFallbackDescription } from '../server/lib/perfect-swedish-fallback';

const propertyData = {
  propertyType: 'apartment',
  address: 'Vasaplan 3, Umeå',
  livingArea: 38,
  rooms: 1,
  bedrooms: 0,
  buildYear: 1995,
  kitchen: 'kompakt kök med kyl och frys',
  bathroom: 'badrum med dusch',
  monthlyFee: 2200,
  price: 1450000,
  transport: 'stadskärna 2 min gång',
  uniqueSellingPoints: 'välskött, praktiskt',
};

console.log('🔍 Debugging broken word issue\n');
console.log('Input uniqueSellingPoints:', propertyData.uniqueSellingPoints);
console.log('='.repeat(60));

const structured = buildDispositionFromStructuredData(propertyData);
console.log('\nStructured unique_features:', structured.disposition.unique_features);
console.log('='.repeat(60));

const fallback = buildDeterministicFallbackDescription(structured.disposition, 'balanced');
console.log('\nFallback text (raw):');
console.log(fallback);
console.log('='.repeat(60));

// Check if broken word exists
if (fallback.includes('välsköför att')) {
  console.log('\n❌ FOUND: "välsköför att" in fallback text!');
  console.log('Location:', fallback.indexOf('välsköför att'));
} else {
  console.log('\n✅ NO broken word in fallback text');
}

// Check for the correct word
if (fallback.includes('välskött')) {
  console.log('✅ FOUND: "välskött" (correct word)');
} else {
  console.log('❌ NOT FOUND: "välskött" (correct word)');
}
