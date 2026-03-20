import { describe, it, expect } from 'vitest';
import { findRuleViolations, checkWordCount, validateOptimizationResult } from '../lib/text-validation';
import { shouldBlockPhraseForStyle, countEvidenceBackedBlockedPhrases } from '../lib/text-rules';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeResult(overrides: Record<string, string> = {}) {
  return {
    improvedPrompt: overrides.improvedPrompt ?? 'Storgatan 12 är en välplanerad trea om 75 kvm med balkong i söderläge. Lägenheten har renoverat kök och helkaklat badrum. Föreningen är stabil med låg avgift. Kommunikationer nås enkelt med smidig pendling till city. Bra läge med närhet till service och grönområden.',
    headline: overrides.headline ?? 'Välplanerad trea med balkong',
    socialCopy: overrides.socialCopy ?? 'Fin lägenhet med balkong i söderläge.',
    instagramCaption: overrides.instagramCaption ?? 'Ny lägenhet ute! 🏡',
    showingInvitation: overrides.showingInvitation ?? 'Välkommen på visning.',
    shortAd: overrides.shortAd ?? 'Trea med balkong.',
    ...overrides,
  };
}

// ─── Legitimate broker phrases ───────────────────────────────────────────────

describe('Validation: legitimate broker phrases NOT blocked', () => {
  const legitimatePhrases = [
    'kommunikationer',
    'smidig pendling',
    'närhet till service',
    'genomtänkt planlösning',
    'ljus och luftig',
    'hög standard',
    'i mycket gott skick',
    'gott om utrymme',
    'ligger centralt i',
    'det finns även',
    'det finns också',
  ];

  legitimatePhrases.forEach(phrase => {
    it(`should NOT block "${phrase}" in balanced style`, () => {
      expect(shouldBlockPhraseForStyle(phrase, 'balanced')).toBe(false);
    });

    it(`should NOT block "${phrase}" in selling style`, () => {
      expect(shouldBlockPhraseForStyle(phrase, 'selling')).toBe(false);
    });
  });

  it('should not flag legitimate broker text as forbidden', () => {
    const text = 'Lägenheten har genomtänkt planlösning med ljus och luftig känsla. Kommunikationer nås med smidig pendling till city. Närhet till service och hög standard i föreningen.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    const forbidden = violations.filter(v => v.startsWith('Förbjuden fras:'));
    expect(forbidden.length).toBe(0);
  });
});

// ─── Real AI clichés ARE flagged ─────────────────────────────────────────────

describe('Validation: real AI clichés ARE flagged', () => {
  const aiCliches = [
    'välkommen till',
    'erbjuder',
    'för den som',
    'i hjärtat av',
    'missa inte',
    'stadens puls',
    'präglas av',
    'genomsyras av',
  ];

  aiCliches.forEach(phrase => {
    it(`should block AI cliché "${phrase}" in all styles`, () => {
      expect(shouldBlockPhraseForStyle(phrase, 'factual')).toBe(true);
      expect(shouldBlockPhraseForStyle(phrase, 'balanced')).toBe(true);
      expect(shouldBlockPhraseForStyle(phrase, 'selling')).toBe(true);
    });
  });

  it('should flag AI clichés in text', () => {
    const text = 'Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor i hjärtat av staden.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    const forbidden = violations.filter(v => v.startsWith('Förbjuden fras:'));
    expect(forbidden.length).toBeGreaterThan(0);
  });
});

// ─── Context-aware limits ────────────────────────────────────────────────────

describe('Validation: context-aware repetition limits', () => {
  it('should allow "det finns" up to 3 times', () => {
    const text = 'Det finns ett kök. Det finns ett badrum. Det finns en balkong. Lägenheten är fin.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.includes('"Det finns"'))).toBe(false);
  });

  it('should flag "det finns" more than 3 times', () => {
    const text = 'Det finns ett kök. Det finns ett badrum. Det finns en balkong. Det finns en terrass.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.includes('"Det finns"'))).toBe(true);
  });

  it('should allow "den har" up to 4 times', () => {
    const text = 'Den har ett kök. Den har ett badrum. Den har en balkong. Den har en terrass. Lägenheten är fin.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.includes('"Den har"'))).toBe(false);
  });

  it('should flag "den har" more than 4 times', () => {
    const text = 'Den har ett kök. Den har ett badrum. Den har en balkong. Den har en terrass. Den har ett förråd.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.includes('"Den har"'))).toBe(true);
  });

  it('should allow "vilket" up to 3 times', () => {
    const text = 'Köket är renoverat, vilket ger en modern känsla. Badrummet är helkaklat, vilket är praktiskt. Balkongen vetter söderut, vilket ger sol. Lägenheten är fin.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.includes('"vilket"'))).toBe(false);
  });

  it('should flag "vilket" more than 3 times', () => {
    const text = 'Köket är renoverat, vilket ger en modern känsla. Badrummet är helkaklat, vilket är praktiskt. Balkongen vetter söderut, vilket ger sol. Föreningen är stabil, vilket är bra.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.includes('"vilket"'))).toBe(true);
  });

  it('should allow "ligger [avstånd]" up to 3 times', () => {
    const text = 'Skolan ligger 200m bort. Affären ligger 300m bort. Tunnelbanan ligger 400m bort. Lägenheten är fin.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.includes('"ligger [avstånd]"'))).toBe(false);
  });

  it('should flag "ligger [avstånd]" more than 3 times', () => {
    const text = 'Skolan ligger 200m bort. Affären ligger 300m bort. Tunnelbanan ligger 400m bort. Parken ligger 500m bort.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.includes('"ligger [avstånd]"'))).toBe(true);
  });
});

// ─── Monoton meningsstart ────────────────────────────────────────────────────

describe('Validation: monoton meningsstart', () => {
  it('should flag monoton start after 5 repetitions in 10+ sentence text', () => {
    const sentences = Array(10).fill('Lägenheten är fin.').join(' ');
    const violations = findRuleViolations(sentences, 'hemnet', 'balanced');
    expect(violations.some(v => v.startsWith('Monoton meningsstart:'))).toBe(true);
  });

  it('should NOT flag monoton start in short texts (< 10 sentences)', () => {
    const text = 'Lägenheten är fin. Lägenheten har balkong. Lägenheten är renoverad. Lägenheten har hög standard. Lägenheten är välplanerad.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.startsWith('Monoton meningsstart:'))).toBe(false);
  });

  it('should exempt "brf" from monoton check', () => {
    const sentences = Array(12).fill('BRF Storgatan har låg avgift.').join(' ');
    const violations = findRuleViolations(sentences, 'hemnet', 'balanced');
    // "brf" is in exempt list
    expect(violations.some(v => v.includes('"brf"'))).toBe(false);
  });

  it('should exempt "avgift" from monoton check', () => {
    const sentences = Array(12).fill('Avgiften är låg.').join(' ');
    const violations = findRuleViolations(sentences, 'hemnet', 'balanced');
    expect(violations.some(v => v.includes('"avgift"'))).toBe(false);
  });
});

// ─── Factual style drift ─────────────────────────────────────────────────────

describe('Validation: factual style drift detection', () => {
  it('should flag value-laden adjectives in factual style', () => {
    const text = 'Lägenheten är charmig och elegant med fantastisk utsikt.';
    const violations = findRuleViolations(text, 'hemnet', 'factual');
    expect(violations.some(v => v.includes('Factual-stil'))).toBe(true);
  });

  it('should NOT flag value-laden adjectives in balanced style', () => {
    const text = 'Lägenheten är charmig och elegant.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.includes('Factual-stil'))).toBe(false);
  });
});

// ─── CTA endings ─────────────────────────────────────────────────────────────

describe('Validation: CTA endings', () => {
  it('should flag CTA endings', () => {
    const text = 'Lägenheten är fin. Kontakta oss för mer information.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.startsWith('CTA-slut:'))).toBe(true);
  });

  it('should flag emotional Hemnet endings', () => {
    const text = 'Lägenheten är fin. Välkommen hem till ditt drömboende.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    expect(violations.some(v => v.startsWith('Emotionellt Hemnet-slut:'))).toBe(true);
  });
});

// ─── validateOptimizationResult ──────────────────────────────────────────────

describe('validateOptimizationResult', () => {
  it('should return no violations for clean broker text', () => {
    const result = makeResult();
    const violations = validateOptimizationResult(result, 'hemnet', 180, 500, 'balanced');
    // Filter out word count violations since our test text is short
    const nonWordCount = violations.filter(v => !v.includes('ord'));
    expect(nonWordCount.length).toBe(0);
  });

  it('should flag disposition-like output', () => {
    const result = makeResult({
      improvedPrompt: '=== GRUNDINFORMATION ===\nTyp: Lägenhet\nAdress: Storgatan 12\n=== YTOR ===\nBoarea: 75 kvm\nAntal rum: 3',
    });
    const violations = validateOptimizationResult(result, 'hemnet');
    expect(violations.some(v => v.includes('objektdisposition'))).toBe(true);
  });

  it('should flag mixed outdoor terminology', () => {
    const result = makeResult({
      improvedPrompt: 'Lägenheten har en balkong och en terrass och en altan med uteplats. Det är en fin bostad med bra läge och goda kommunikationer. Föreningen är stabil med låg avgift och bra ekonomi. Köket är renoverat och badrummet är helkaklat med modern inredning.',
    });
    const violations = validateOptimizationResult(result, 'hemnet');
    expect(violations.some(v => v.includes('uteplatsterminologi'))).toBe(true);
  });

  it('should be idempotent — same input gives same violations', () => {
    const result = makeResult();
    const v1 = validateOptimizationResult(result, 'hemnet', 180, 500, 'balanced');
    const v2 = validateOptimizationResult(result, 'hemnet', 180, 500, 'balanced');
    expect(v1).toEqual(v2);
  });
});

// ─── checkWordCount ───────────────────────────────────────────────────────────

describe('checkWordCount', () => {
  it('should flag text below minimum', () => {
    const violations = checkWordCount('Kort text.', 'hemnet', 180, 500);
    expect(violations.some(v => v.includes('För få ord'))).toBe(true);
  });

  it('should flag text above maximum', () => {
    const longText = Array(600).fill('ord').join(' ');
    const violations = checkWordCount(longText, 'hemnet', 180, 500);
    expect(violations.some(v => v.includes('För många ord'))).toBe(true);
  });

  it('should pass text within range', () => {
    const text = Array(250).fill('ord').join(' ');
    const violations = checkWordCount(text, 'hemnet', 180, 500);
    expect(violations.length).toBe(0);
  });
});

// ─── countEvidenceBackedBlockedPhrases ───────────────────────────────────────

describe('countEvidenceBackedBlockedPhrases', () => {
  it('factual blocks more than selling', () => {
    const factual = countEvidenceBackedBlockedPhrases('factual', 'hemnet');
    const selling = countEvidenceBackedBlockedPhrases('selling', 'hemnet');
    expect(factual).toBeGreaterThan(selling);
  });

  it('returns consistent results for same inputs', () => {
    const a = countEvidenceBackedBlockedPhrases('balanced', 'hemnet');
    const b = countEvidenceBackedBlockedPhrases('balanced', 'hemnet');
    expect(a).toBe(b);
  });
});
