// Quick test to verify paragraph break fix
const text = 'Storgatan 12 ligger på Södermalm med närhet till tunnelbanan och goda kommunikationer. Köket renoverades 2022 med nya Siemens-vitvaror, induktionshäll och kompositbänk i ljus färg. Balkongen har söderläge och ger härlig kvällssol under sommarhalvåret. Lägenheten har tre rymliga rum och ett helkaklat badrum med golvvärme och tvättmaskin. Vardagsrummet är ljust och luftigt med plats för både stor matgrupp och soffgrupp. Sovrummen har gott om förvaring med inbyggda garderober. Närområdet har matbutiker, restauranger, kaféer och parker inom bekvämt gångavstånd. Kommunikationerna är utmärkta med tunnelbana, bussar och pendeltåg i närheten.';

console.log('Original text ends with:', text.slice(-20));
console.log('Word count:', text.split(/\s+/).filter(Boolean).length);

// Old split (with space required)
const oldSentences = text.split(/\.\s+/).filter(s => s.trim().length > 0);
console.log('\nOld split (/.\\s+/):');
console.log('  Sentence count:', oldSentences.length);
console.log('  Last sentence:', oldSentences[oldSentences.length - 1]);

// New split (space optional)
const newSentences = text.split(/\.\s*/).filter(s => s.trim().length > 0);
console.log('\nNew split (/.\\s*/):');
console.log('  Sentence count:', newSentences.length);
console.log('  Last sentence:', newSentences[newSentences.length - 1]);
