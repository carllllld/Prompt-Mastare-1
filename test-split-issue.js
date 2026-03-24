// Test the split issue
const text = 'Sentence one. Sentence two. Sentence three.';

console.log('Original:', text);
console.log('\nSplit by /\\.\\s*/:');
const sentences = text.split(/\.\s*/).filter(s => s.trim().length > 0);
sentences.forEach((s, i) => console.log(`  [${i}]:`, JSON.stringify(s)));

console.log('\nRejoined with ". ":');
const rejoined = sentences.join('. ') + '.';
console.log('  Result:', rejoined);

console.log('\nExpected:', text);
console.log('Match?', rejoined === text);
