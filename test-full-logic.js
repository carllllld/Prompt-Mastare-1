// Test the full paragraph enforcement logic
const text = 'Storgatan 12 ligger på Södermalm med närhet till tunnelbanan och goda kommunikationer. Köket renoverades 2022 med nya Siemens-vitvaror, induktionshäll och kompositbänk i ljus färg. Balkongen har söderläge och ger härlig kvällssol under sommarhalvåret. Lägenheten har tre rymliga rum och ett helkaklat badrum med golvvärme och tvättmaskin. Vardagsrummet är ljust och luftigt med plats för både stor matgrupp och soffgrupp. Sovrummen har gott om förvaring med inbyggda garderober. Närområdet har matbutiker, restauranger, kaféer och parker inom bekvämt gångavstånd. Kommunikationerna är utmärkta med tunnelbana, bussar och pendeltåg i närheten.';

const existingBreaks = (text.match(/\n\n/g) || []).length;
const wordCount = text.split(/\s+/).filter(Boolean).length;

console.log('Existing breaks:', existingBreaks);
console.log('Word count:', wordCount);
console.log('Should enforce?', wordCount >= 80 && existingBreaks < 2);

if (wordCount >= 80 && existingBreaks < 2) {
  const sentences = text.split(/\.\s*/).filter(s => s.trim().length > 0);
  console.log('\nSentence count:', sentences.length);
  console.log('Sentences >= 3?', sentences.length >= 3);
  
  if (sentences.length >= 3) {
    console.log('\nWill create paragraphs...');
    
    // Test the 8-sentence case (sentences.length > 6)
    if (sentences.length > 6) {
      console.log('Using "longer text" logic (3-5 paragraphs)');
      
      // Paragraph 1: First 1-2 sentences
      const p1End = Math.min(2, Math.floor(sentences.length * 0.25));
      console.log('  P1 end:', p1End, '(sentences 0 to', p1End - 1, ')');
      
      // Paragraph 2-3: Middle content
      const midStart = p1End;
      const midEnd = sentences.length - Math.max(2, Math.floor(sentences.length * 0.25));
      console.log('  Mid start:', midStart, ', Mid end:', midEnd);
      
      if (midEnd > midStart) {
        const midSentences = sentences.slice(midStart, midEnd);
        console.log('  Mid sentences count:', midSentences.length);
        
        if (midSentences.length > 3) {
          const midSplit = Math.floor(midSentences.length / 2);
          console.log('  Splitting mid into 2 paragraphs at:', midSplit);
        } else {
          console.log('  Mid stays as 1 paragraph');
        }
      }
      
      // Paragraph 4-5: Final content
      console.log('  Final paragraph: sentences', midEnd, 'to', sentences.length - 1);
    }
  }
}
