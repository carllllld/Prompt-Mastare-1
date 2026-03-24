// Full test of the post-processor with the exact test input
import { DeterministicPostProcessor } from './server/lib/perfect-swedish-post-processor.js';

const processor = new DeterministicPostProcessor();

const longText = 'Storgatan 12 ligger på Södermalm med närhet till tunnelbanan och goda kommunikationer. Köket renoverades 2022 med nya Siemens-vitvaror, induktionshäll och kompositbänk i ljus färg. Balkongen har söderläge och ger härlig kvällssol under sommarhalvåret. Lägenheten har tre rymliga rum och ett helkaklat badrum med golvvärme och tvättmaskin. Vardagsrummet är ljust och luftigt med plats för både stor matgrupp och soffgrupp. Sovrummen har gott om förvaring med inbyggda garderober. Närområdet har matbutiker, restauranger, kaféer och parker inom bekvämt gångavstånd. Kommunikationerna är utmärkta med tunnelbana, bussar och pendeltåg i närheten.';

const request = {
  improvedPrompt: longText,
  headline: 'Välplanerad trea med balkong',
  socialCopy: 'Välplanerad lägenhet med balkong i söderläge.',
  instagramCaption: 'Ljus 3:a med balkong 🏠',
  showingInvitation: 'Välkommen på visning.',
  shortAd: 'Ljus 3:a, 75 kvm, renoverat kök.',
  disposition: {
    address: 'Storgatan 12',
    propertyType: '3 rok',
    livingArea: 75,
    rooms: 3,
  },
  style: 'balanced',
  platform: 'hemnet',
};

console.log('Input text word count:', longText.split(/\s+/).filter(Boolean).length);
console.log('Input text has paragraph breaks:', longText.includes('\n\n'));

const result = await processor.process(request);

console.log('\nResult improvedPrompt word count:', result.improvedPrompt.split(/\s+/).filter(Boolean).length);
console.log('Result has paragraph breaks:', result.improvedPrompt.includes('\n\n'));

const paragraphBreaks = (result.improvedPrompt.match(/\n\n/g) || []).length;
console.log('Paragraph break count:', paragraphBreaks);

console.log('\nTransformations:');
result.transformations.forEach(t => {
  if (t.type === 'paragraph_enforcement') {
    console.log('  -', t.type, ':', t.before, '->', t.after);
  }
});

console.log('\nFirst 300 chars of result:');
console.log(result.improvedPrompt.substring(0, 300));

console.log('\nTest expectation: paragraphBreaks >= 2');
console.log('Test result:', paragraphBreaks >= 2 ? 'PASS' : 'FAIL');
