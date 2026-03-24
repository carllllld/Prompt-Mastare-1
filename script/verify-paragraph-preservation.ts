/**
 * Quick verification script for paragraph break preservation
 * Run with: npx tsx script/verify-paragraph-preservation.ts
 */

import { DeterministicPostProcessor } from '../server/lib/perfect-swedish-post-processor';

const processor = new DeterministicPostProcessor();

async function testParagraphPreservation() {
  console.log('Testing paragraph break preservation...\n');

  // Test 1: Input with existing paragraph breaks
  const inputWithBreaks = 'Storgatan 12 ligger på Södermalm med 5 minuter till tunnelbanan. Köket renoverades 2022 med nya Siemens-vitvaror och kompositbänk.\n\nBalkongen har söderläge och ger kvällssol. Badrummet är helkaklat med golvvärme.\n\nNärområdet har matbutiker, restauranger och parker inom gångavstånd.';

  const result1 = await processor.process({
    improvedPrompt: inputWithBreaks,
    headline: 'Trea med renoverat kök',
    socialCopy: 'Renoverat kök 2022 och balkong i söderläge.',
    instagramCaption: 'Ljus 3:a på Södermalm 🏠',
    showingInvitation: 'Välkommen på visning.',
    shortAd: 'Trea om 75 kvm med renoverat kök och balkong.',
    disposition: { address: 'Storgatan 12', propertyType: '3 rok', livingArea: 75, rooms: 3 },
    style: 'balanced' as const,
    platform: 'hemnet',
  });

  const breaks1 = (result1.improvedPrompt.match(/\n\n/g) || []).length;
  console.log('Test 1: Preserve existing paragraph breaks');
  console.log(`Input breaks: 2`);
  console.log(`Output breaks: ${breaks1}`);
  console.log(`✓ PASS: ${breaks1 >= 2 ? 'Breaks preserved' : 'FAIL - Breaks removed!'}\n`);

  // Test 2: Long text without breaks (should add breaks)
  const longText = 'Storgatan 12 ligger på Södermalm med närhet till tunnelbanan. Köket renoverades 2022 med nya vitvaror och kompositbänk. Balkongen har söderläge och ger kvällssol. Lägenheten har tre rum och ett helkaklat badrum. Vardagsrummet är ljust och rymligt med plats för både matbord och soffa. Sovrummen har gott om förvaring. Närområdet har matbutiker, restauranger och parker inom gångavstånd. Kommunikationerna är utmärkta med tunnelbana och bussar i närheten.';

  const result2 = await processor.process({
    improvedPrompt: longText,
    headline: 'Trea med renoverat kök',
    socialCopy: 'Renoverat kök 2022 och balkong i söderläge.',
    instagramCaption: 'Ljus 3:a på Södermalm 🏠',
    showingInvitation: 'Välkommen på visning.',
    shortAd: 'Trea om 75 kvm med renoverat kök och balkong.',
    disposition: { address: 'Storgatan 12', propertyType: '3 rok', livingArea: 75, rooms: 3 },
    style: 'balanced' as const,
    platform: 'hemnet',
  });

  const breaks2 = (result2.improvedPrompt.match(/\n\n/g) || []).length;
  const wordCount = longText.split(/\s+/).length;
  console.log('Test 2: Add paragraph breaks to long text');
  console.log(`Input word count: ${wordCount}`);
  console.log(`Input breaks: 0`);
  console.log(`Output breaks: ${breaks2}`);
  console.log(`✓ PASS: ${breaks2 >= 2 ? 'Breaks added' : 'FAIL - No breaks added!'}\n`);

  // Summary
  console.log('='.repeat(50));
  if (breaks1 >= 2 && breaks2 >= 2) {
    console.log('✓ ALL TESTS PASSED');
    console.log('Paragraph break preservation is working correctly!');
  } else {
    console.log('✗ TESTS FAILED');
    console.log('Paragraph breaks are not being preserved correctly.');
  }
}

testParagraphPreservation().catch(console.error);
