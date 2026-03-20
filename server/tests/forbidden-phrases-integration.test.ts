import { describe, it, expect } from 'vitest';
import { 
  FORBIDDEN_PHRASES, 
  shouldBlockPhraseForStyle, 
  countEvidenceBackedBlockedPhrases,
  getExemptPhrases 
} from '../lib/text-rules';
import { findRuleViolations } from '../lib/text-validation';

describe('Forbidden Phrases Integration Tests', () => {
  it('should have exactly 66 forbidden phrases after optimization', () => {
    expect(FORBIDDEN_PHRASES.length).toBe(66);
  });

  describe('Style-based blocking', () => {
    it('factual style should block most phrases', () => {
      const factualCount = countEvidenceBackedBlockedPhrases('factual', 'hemnet');
      expect(factualCount).toBeGreaterThan(60); // Most phrases blocked in factual
    });

    it('balanced style should block moderate amount', () => {
      const balancedCount = countEvidenceBackedBlockedPhrases('balanced', 'hemnet');
      expect(balancedCount).toBeGreaterThan(40);
      expect(balancedCount).toBeLessThan(70);
    });

    it('selling style should block fewer phrases', () => {
      const sellingCount = countEvidenceBackedBlockedPhrases('selling', 'hemnet');
      expect(sellingCount).toBeGreaterThan(30);
      expect(sellingCount).toBeLessThan(60);
    });
  });

  describe('Platform-based blocking', () => {
    it('hemnet should be strictest', () => {
      const hemnetCount = countEvidenceBackedBlockedPhrases('balanced', 'hemnet');
      const booliCount = countEvidenceBackedBlockedPhrases('balanced', 'booli');
      expect(hemnetCount).toBeGreaterThanOrEqual(booliCount);
    });
  });

  describe('Critical AI phrases always blocked', () => {
    const criticalPhrases = [
      'välkommen till',
      'erbjuder',
      'för den som',
      'i hjärtat av',
      'missa inte',
      'stadens puls',
    ];

    criticalPhrases.forEach(phrase => {
      it(`should always block "${phrase}" in all styles`, () => {
        expect(shouldBlockPhraseForStyle(phrase, 'factual')).toBe(true);
        expect(shouldBlockPhraseForStyle(phrase, 'balanced')).toBe(true);
        expect(shouldBlockPhraseForStyle(phrase, 'selling')).toBe(true);
      });
    });
  });

  describe('Legitimate broker language NOT blocked', () => {
    const legitimatePhrases = [
      'kommunikationer',
      'närhet till service',
      'smidig pendling',
      'genomtänkt planlösning',
      'ljus och luftig',
      'hög standard',
    ];

    legitimatePhrases.forEach(phrase => {
      it(`should NOT block legitimate phrase "${phrase}" in balanced/selling`, () => {
        expect(shouldBlockPhraseForStyle(phrase, 'balanced')).toBe(false);
        expect(shouldBlockPhraseForStyle(phrase, 'selling')).toBe(false);
      });
    });
  });

  describe('Text validation integration', () => {
    it('should detect AI clichés in text', () => {
      const badText = 'Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor i hjärtat av staden.';
      const violations = findRuleViolations(badText, 'hemnet', 'balanced');
      
      const forbiddenViolations = violations.filter(v => v.startsWith('Förbjuden fras:'));
      expect(forbiddenViolations.length).toBeGreaterThan(0);
    });

    it('should NOT flag legitimate broker language', () => {
      const goodText = 'Lägenheten har genomtänkt planlösning med ljus och luftig känsla. Kommunikationer nås med smidig pendling till city. Närhet till service och hög standard i föreningen.';
      const violations = findRuleViolations(goodText, 'hemnet', 'balanced');
      
      const forbiddenViolations = violations.filter(v => v.startsWith('Förbjuden fras:'));
      expect(forbiddenViolations.length).toBe(0);
    });

    it('should handle mixed text correctly', () => {
      const mixedText = 'Lägenheten har genomtänkt planlösning. Välkommen till detta drömboende som erbjuder allt du behöver.';
      const violations = findRuleViolations(mixedText, 'hemnet', 'balanced');
      
      const forbiddenViolations = violations.filter(v => v.startsWith('Förbjuden fras:'));
      // Should catch "välkommen till", "drömboende", "erbjuder" but NOT "genomtänkt planlösning"
      expect(forbiddenViolations.length).toBeGreaterThanOrEqual(3);
      expect(forbiddenViolations.some(v => v.includes('genomtänkt planlösning'))).toBe(false);
    });
  });

  describe('Exempt phrases consistency', () => {
    it('balanced exempt phrases should be subset of selling exempt', () => {
      const balancedExempt = getExemptPhrases('balanced');
      const sellingExempt = getExemptPhrases('selling');
      
      for (const phrase of balancedExempt) {
        expect(sellingExempt.has(phrase)).toBe(true);
      }
    });

    it('factual should have no exempt phrases', () => {
      const factualExempt = getExemptPhrases('factual');
      expect(factualExempt.size).toBe(0);
    });
  });

  describe('Removed phrases should NOT be blocked', () => {
    // These were removed from FORBIDDEN_PHRASES (legitimate broker language)
    const removedPhrases = [
      'sällsynt tillfälle',
      'finner du',
      'utmärkt möjlighet',
      'stor potential',
      'lockar till',
      'inspirerar till',
      'andas modernitet',
      'andas stil',
      'ger ett intryck av',
      'ger ett lyxigt intryck',
      'bidrar till en',
      'förstärker känslan',
      'skapar en',
      'skapar en miljö',
      'skapar en avkopplande',
      'vilket gör det enkelt',
      'vilket gör det smidigt',
      'vilket gör det lätt',
      'vilket ger en',
      'vilket ger ytterligare',
      'vilket säkerställer',
      'den matlagningsintresserade',
      'hjärtat i hemmet',
      'trivsam atmosfär',
      'härlig atmosfär',
      'mysig atmosfär',
      'inbjudande atmosfär',
      'luftig atmosfär',
      'luftig och',
      'rofyllt',
      'rofylld',
      'trygg boendemiljö',
      'trygg boendeekonomi',
      'tryggt boende',
      'sociala sammanhang',
      'sociala tillställningar',
      'socialt umgänge',
      'extra komfort',
      'maximal komfort',
      'underlättar vardagen',
      'bekvämlighet i vardagen',
      'god natts sömn',
      'löser sig',
      'fixar sig',
      'ordnar sig',
      'eftertraktat boendealternativ',
      'generösa ytor',
      'generös takhöjd',
      'generöst tilltaget',
      'generöst med',
      'ger en rymlig',
      'ger en härlig',
      'ger en luftig',
      'härlig plats för',
      'plats för avkoppling',
      'gör steget mellan',
      'steget mellan',
      'möjlighet att påverka',
      'den södervända placeringen ger',
      'är ett bra val',
      'är ett bra val för',
      'är en perfekt plats',
      'utmärkt val',
      'lek och avkoppling',
      'faciliteter',
      'nyrenoverade faciliteter',
      'förvaringsmöjligheter inkluderar',
      'odlingsmöjligheter',
      'boendmöjligheter',
      'utemöjligheter',
      'lagringsmöjligheter',
      'rekreationsmöjligheter',
      'fritidsmöjligheter',
      'aktivitetsmöjligheter',
      'umgängesmöjligheter',
      'utvecklingsmöjligheter',
      'utbyggnadsmöjligheter',
      'allt detta gör',
      'det bästa av',
      'stilrent och modernt',
      'stilren och modern',
      'modernt och stilrent',
      'elegant och tidlös',
      'tidlös och elegant',
      'mysigt och ombonat',
      'charmigt och välplanerat',
      'praktiskt och snyggt',
      'fräscht och modernt',
      'livskvalitet',
      'stor möjlighet',
      'noggrant utvalt',
      'noggrant utvalda',
      'omsorgsfullt',
      'exklusivt',
      'lyxigt',
      'imponerande',
      'magnifikt',
      'praktfullt',
      'det kan konstateras',
      'det bör nämnas',
      'det ska tilläggas',
      'som en bonus',
      'en extra fördel',
      'en stor fördel',
      'en klar fördel',
      'eftertraktat område',
      'omtyckt område',
      'barnvänligt område',
      'natursköna omgivningar',
      'grön oas',
      'en pärla',
      'stark efterfrågan',
      'goda arbetsytor',
      'stor charm',
      'med sin charm',
      'med mycket charm',
      'präglad av',
      'strategiskt placerad',
      'strategiskt läge',
      'gör det enkelt att',
      'gör det möjligt att',
      'ett område för familjer',
    ];

    removedPhrases.forEach(phrase => {
      it(`should NOT include removed phrase "${phrase}" in FORBIDDEN_PHRASES`, () => {
        expect(FORBIDDEN_PHRASES.includes(phrase)).toBe(false);
      });
    });
  });

  describe('Count consistency across styles and platforms', () => {
    it('should return consistent counts for same style/platform', () => {
      const count1 = countEvidenceBackedBlockedPhrases('balanced', 'hemnet');
      const count2 = countEvidenceBackedBlockedPhrases('balanced', 'hemnet');
      expect(count1).toBe(count2);
    });

    it('should have different counts for different styles', () => {
      const factual = countEvidenceBackedBlockedPhrases('factual', 'hemnet');
      const balanced = countEvidenceBackedBlockedPhrases('balanced', 'hemnet');
      const selling = countEvidenceBackedBlockedPhrases('selling', 'hemnet');
      
      expect(factual).not.toBe(balanced);
      expect(balanced).not.toBe(selling);
      expect(factual).toBeGreaterThan(selling); // Factual blocks most
    });
  });
});
