// Test actual paragraph building with the test text
const text = 'Storgatan 12 ligger på Södermalm med närhet till tunnelbanan och goda kommunikationer. Köket renoverades 2022 med nya Siemens-vitvaror, induktionshäll och kompositbänk i ljus färg. Balkongen har söderläge och ger härlig kvällssol under sommarhalvåret. Lägenheten har tre rymliga rum och ett helkaklat badrum med golvvärme och tvättmaskin. Vardagsrummet är ljust och luftigt med plats för både stor matgrupp och soffgrupp. Sovrummen har gott om förvaring med inbyggda garderober. Närområdet har matbutiker, restauranger, kaféer och parker inom bekvämt gångavstånd. Kommunikationerna är utmärkta med tunnelbana, bussar och pendeltåg i närheten.';

const sentences = text.split(/\.\s*/).filter(s => s.trim().length > 0);
console.log('Sentence count:', sentences.length);

// Build paragraphs using the "longer text" logic (sentences.length > 6)
const paragraphs = [];

// Paragraph 1: First 1-2 sentences
const p1End = Math.min(2, Math.floor(sentences.length * 0.25));
paragraphs.push(sentences.slice(0, p1End).join('. ') + '.');

// Paragraph 2-3: Middle content
const midStart = p1End;
const midEnd = sentences.length - Math.max(2, Math.floor(sentences.length * 0.25));

if (midEnd > midStart) {
  const midSentences = sentences.slice(midStart, midEnd);
  if (midSentences.length > 3) {
    const midSplit = Math.floor(midSentences.length / 2);
    paragraphs.push(midSentences.slice(0, midSplit).join('. ') + '.');
    paragraphs.push(midSentences.slice(midSplit).join('. ') + '.');
  } else {
    paragraphs.push(midSentences.join('. ') + '.');
  }
}

// Paragraph 4-5: Final content
if (midEnd < sentences.length) {
  paragraphs.push(sentences.slice(midEnd).join('. ') + '.');
}

console.log('\nParagraph count:', paragraphs.length);
paragraphs.forEach((p, i) => {
  console.log(`\nParagraph ${i + 1}:`);
  console.log(p.substring(0, 80) + '...');
});

const newText = paragraphs.join('\n\n');
console.log('\nParagraph breaks in result:', (newText.match(/\n\n/g) || []).length);
console.log('\nFirst 200 chars of result:');
console.log(newText.substring(0, 200));
