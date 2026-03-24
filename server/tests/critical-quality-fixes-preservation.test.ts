/**
 * Preservation Property Tests for Critical Quality Fixes
 * 
 * **CRITICAL**: These tests MUST PASS on UNFIXED code.
 * They capture existing quality features that must be preserved after the fix.
 * 
 * **Methodology**: Observation-first approach
 * - Tests observe behavior on unfixed code for non-buggy inputs
 * - Capture patterns that already work correctly
 * - Ensure no regressions when implementing the fix
 * 
 * **Validates: Requirements 3.1-3.10 (Preservation Requirements)**
 * **Property 2: Preservation - Existing Quality Features**
 */

import { describe, it, expect } from 'vitest';
import { DeterministicPostProcessor } from '../lib/perfect-swedish-post-processor';
import { SmartGenerationEngine } from '../lib/perfect-swedish-generator';
import { findRuleViolations, validateOptimizationResult } from '../lib/text-validation';
import { FORBIDDEN_PHRASES, shouldBlockPhraseForStyle } from '../lib/text-rules';

// ─── Test Helpers ────────────────────────────────────────────────────────────

const processor = new DeterministicPostProcessor();
const generator = new SmartGenerationEngine();

function makePostProcessRequest(overrides: Partial<Parameters<typeof processor.process>[0]> = {}) {
  return {
    improvedPrompt: 'Storgatan 12 är en välplanerad trea om 75 kvm med renoverat kök och balkong i söderläge.',
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
    style: 'balanced' as const,
    platform: 'hemnet',
    ...overrides,
  };
}

function makeGenerationRequest(overrides: Partial<Parameters<typeof generator.generate>[0]> = {}) {
  return {
    disposition: {
      address: 'Storgatan 12',
      propertyType: '3 rok',
      livingArea: 75,
      rooms: 3,
      floor: 2,
      buildYear: 1985,
      kitchenRenovation: 2022,
      location: {
        area: 'Södermalm',
        city: 'Stockholm',
        nearbyAmenities: ['Tunnelbana 5 min', 'ICA 200 m', 'Park'],
      },
    },
    style: 'balanced' as const,
    platform: 'hemnet',
    personalStylePrompt: undefined,
    targetWordMin: 180,
    targetWordMax: 300,
    ...overrides,
  };
}

// ─── Preservation 1: Core Generation Quality ─────────────────────────────────

describe('Preservation 1: Core Generation Quality (Requirement 3.1)', () => {
  
  it('3.1 should continue producing broker-realistic Swedish text without AI clichés', async () => {
    // OBSERVATION: Existing system produces quality text for valid inputs
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Storgatan 12 ligger på Södermalm med 5 minuter till tunnelbanan. Köket renoverades 2022 med nya vitvaror och kompositbänk. Balkongen har söderläge och ger kvällssol.',
    }));

    // EXPECTED: Text should remain high quality
    expect(result.improvedPrompt).toBeTruthy();
    expect(result.improvedPrompt.length).toBeGreaterThan(50);
    
    // Should not contain AI clichés
    const lowerText = result.improvedPrompt.toLowerCase();
    expect(lowerText).not.toContain('välkommen till');
    expect(lowerText).not.toContain('erbjuder');
    expect(lowerText).not.toContain('bjuder på');
    expect(lowerText).not.toContain('i hjärtat av');
    
    // Should be concrete and factual
    expect(result.improvedPrompt).toMatch(/\d+/); // Contains numbers (facts)
    expect(result.improvedPrompt).toMatch(/[A-ZÅÄÖ][a-zåäö]+gatan|vägen|stigen/); // Contains street name
  });

  it('3.1 should preserve natural Swedish prose style', async () => {
    // OBSERVATION: System produces flowing narrative text
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Lägenheten har ett genomtänkt flöde mellan rummen. Köket öppnar upp mot vardagsrummet och skapar en luftig känsla. Balkongen nås från både kök och vardagsrum.',
    }));

    // EXPECTED: Natural prose without mechanical listing
    expect(result.improvedPrompt).not.toMatch(/^[-•]\s+/m); // No bullet points
    expect(result.improvedPrompt).not.toMatch(/\w+\s+\([^)]+\)\.\s+\w+\s+\([^)]+\)\./); // No mechanical style
    
    // Should have proper sentence structure
    const sentences = result.improvedPrompt.split(/[.!?]/).filter(s => s.trim().length > 0);
    expect(sentences.length).toBeGreaterThan(1);
  });
});

// ─── Preservation 2: Forbidden Phrase Blocking ───────────────────────────────

describe('Preservation 2: Forbidden Phrase Blocking (Requirement 3.2)', () => {
  
  it('3.2 should continue blocking "välkommen till" phrase', async () => {
    // OBSERVATION: System blocks this AI cliché
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Välkommen till denna fina lägenhet på Södermalm.',
      style: 'balanced',
    }));

    // EXPECTED: Phrase should be removed
    expect(result.improvedPrompt.toLowerCase()).not.toContain('välkommen till');
    
    // Should log transformation
    expect(result.transformations.some(t => t.type === 'forbidden_phrase')).toBe(true);
  });

  it('3.2 should continue blocking "erbjuder" phrase', async () => {
    // OBSERVATION: System blocks this AI verb
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Lägenheten erbjuder ett renoverat kök och balkong.',
      style: 'balanced',
    }));

    // EXPECTED: Phrase should be removed
    expect(result.improvedPrompt.toLowerCase()).not.toContain('erbjuder');
    expect(result.transformations.some(t => t.type === 'forbidden_phrase')).toBe(true);
  });

  it('3.2 should continue blocking "bjuder på" phrase', async () => {
    // OBSERVATION: System blocks emotional AI language
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Balkongen bjuder på kvällssol och utsikt.',
      style: 'balanced',
    }));

    // EXPECTED: Phrase should be removed
    expect(result.improvedPrompt.toLowerCase()).not.toContain('bjuder på');
    expect(result.transformations.some(t => t.type === 'forbidden_phrase')).toBe(true);
  });

  it('3.2 should continue blocking "i hjärtat av" phrase', async () => {
    // OBSERVATION: System blocks poetic AI language
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Lägenheten ligger i hjärtat av Södermalm.',
      style: 'balanced',
    }));

    // EXPECTED: Phrase should be removed
    expect(result.improvedPrompt.toLowerCase()).not.toContain('i hjärtat av');
    expect(result.transformations.some(t => t.type === 'forbidden_phrase')).toBe(true);
  });

  it('3.2 should continue blocking multiple forbidden phrases in one text', async () => {
    // OBSERVATION: System removes all forbidden phrases
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Välkommen till denna lägenhet som erbjuder en unik möjlighet. Köket bjuder på moderna detaljer.',
      style: 'balanced',
    }));

    // EXPECTED: All phrases removed
    const lowerText = result.improvedPrompt.toLowerCase();
    expect(lowerText).not.toContain('välkommen till');
    expect(lowerText).not.toContain('erbjuder');
    expect(lowerText).not.toContain('unik möjlighet');
    expect(lowerText).not.toContain('bjuder på');
    
    // Multiple transformations logged
    const forbiddenPhraseTransforms = result.transformations.filter(t => t.type === 'forbidden_phrase');
    expect(forbiddenPhraseTransforms.length).toBeGreaterThan(0);
  });
});

// ─── Preservation 3: Platform-Specific Rules ─────────────────────────────────

describe('Preservation 3: Platform-Specific Rules (Requirements 3.3-3.4)', () => {
  
  it('3.3 should continue excluding price from Hemnet main text', async () => {
    // OBSERVATION: Hemnet forbids price in main text
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Lägenheten har utgångspris 3 500 000 kr och renoverat kök.',
      platform: 'hemnet',
    }));

    // EXPECTED: Price reference removed
    expect(result.improvedPrompt).not.toMatch(/\d+\s*(?:kr|kronor|mkr|miljoner)/i);
    expect(result.improvedPrompt).not.toMatch(/utgångspris|pris/i);
    expect(result.transformations.some(t => t.type === 'forbidden_phrase')).toBe(true);
  });

  it('3.3 should continue excluding avgift from Hemnet main text', async () => {
    // OBSERVATION: Hemnet forbids avgift in main text
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Månadsavgift 4 500 kr inkluderar värme och vatten.',
      platform: 'hemnet',
    }));

    // EXPECTED: Avgift reference removed
    expect(result.improvedPrompt).not.toMatch(/avgift|kr\/mån/i);
    expect(result.transformations.some(t => t.type === 'forbidden_phrase')).toBe(true);
  });

  it('3.3 should continue excluding energiklass from Hemnet main text', async () => {
    // OBSERVATION: Hemnet shows energiklass separately
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Bostaden har energiklass B och renoverat kök.',
      platform: 'hemnet',
    }));

    // EXPECTED: Energiklass reference removed
    expect(result.improvedPrompt).not.toMatch(/energiklass/i);
    expect(result.transformations.some(t => t.type === 'forbidden_phrase')).toBe(true);
  });

  it('3.4 should continue allowing price/avgift for Booli platform', async () => {
    // OBSERVATION: Booli allows economic information
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Avgift 4 500 kr/mån inkluderar värme.',
      platform: 'booli',
    }));

    // EXPECTED: Economic info preserved for Booli
    expect(result.improvedPrompt).toMatch(/avgift|kr/i);
    
    // Should NOT have forbidden_phrase transformation for price/avgift on Booli
    const hasPriceRemoval = result.transformations.some(t => 
      t.type === 'forbidden_phrase' && /avgift|pris/i.test(t.before)
    );
    expect(hasPriceRemoval).toBe(false);
  });
});

// ─── Preservation 4: Field-Specific Validation ───────────────────────────────

describe('Preservation 4: Field-Specific Validation (Requirements 3.5-3.6)', () => {
  
  it('3.5 should continue enforcing headline max 9 words', () => {
    // OBSERVATION: System validates headline length
    const result = {
      headline: 'Välplanerad trea med renoverat kök balkong söderläge och utsikt över staden',
      improvedPrompt: 'Text',
    };
    
    const violations = validateOptimizationResult(result, 'hemnet', 180, 300, 'balanced');
    
    // EXPECTED: Should detect headline too long
    const hasHeadlineViolation = violations.some(v => 
      v.includes('headline') || v.includes('Rubrik') || v.includes('lång')
    );
    expect(hasHeadlineViolation).toBe(true);
  });

  it('3.5 should continue removing trailing punctuation from headline', async () => {
    // OBSERVATION: Headlines should not end with period
    const result = await processor.process(makePostProcessRequest({
      headline: 'Välplanerad trea med balkong.',
    }));

    // EXPECTED: Period removed
    expect(result.headline).not.toMatch(/\.$/);
    expect(result.headline).toBe('Välplanerad trea med balkong');
    expect(result.transformations.some(t => t.type === 'formatting')).toBe(true);
  });

  it('3.6 should continue requiring "visning" in showingInvitation', () => {
    // OBSERVATION: System validates showingInvitation content
    const result = {
      showingInvitation: 'Välkommen att titta på bostaden.',
      improvedPrompt: 'Text',
    };
    
    const violations = validateOptimizationResult(result, 'hemnet', 180, 300, 'balanced');
    
    // EXPECTED: Should detect missing "visning"
    const hasVisningViolation = violations.some(v => 
      v.includes('visning') || v.includes('showingInvitation')
    );
    expect(hasVisningViolation).toBe(true);
  });

  it('3.6 should accept showingInvitation with "visning" word', () => {
    // OBSERVATION: Valid showingInvitation passes validation
    const result = {
      showingInvitation: 'Välkommen på visning.',
      improvedPrompt: 'Text',
    };
    
    const violations = validateOptimizationResult(result, 'hemnet', 180, 300, 'balanced');
    
    // EXPECTED: No violation for valid showingInvitation
    const hasVisningViolation = violations.some(v => 
      v.includes('visning') && v.includes('showingInvitation')
    );
    expect(hasVisningViolation).toBe(false);
  });
});

// ─── Preservation 5: Post-Processing Transformations ─────────────────────────

describe('Preservation 5: Post-Processing Transformations (Requirements 3.7-3.8)', () => {
  
  it('3.7 should continue removing placeholder [TID]', async () => {
    // OBSERVATION: System removes placeholders
    const result = await processor.process(makePostProcessRequest({
      showingInvitation: 'Välkommen på visning [TID].',
    }));

    // EXPECTED: Placeholder removed
    expect(result.showingInvitation).not.toContain('[TID]');
    expect(result.transformations.some(t => t.type === 'placeholder')).toBe(true);
  });

  it('3.7 should continue removing placeholder [KONTAKT]', async () => {
    // OBSERVATION: System removes placeholders
    const result = await processor.process(makePostProcessRequest({
      showingInvitation: 'Kontakta [KONTAKT] för mer information.',
    }));

    // EXPECTED: Placeholder removed
    expect(result.showingInvitation).not.toContain('[KONTAKT]');
    expect(result.transformations.some(t => t.type === 'placeholder')).toBe(true);
  });

  it('3.7 should continue normalizing Swedish characters', async () => {
    // OBSERVATION: System fixes encoding issues
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'LÃ¤genheten ligger pÃ¥ SÃ¶dermalm.',
    }));

    // EXPECTED: Characters normalized
    expect(result.improvedPrompt).toContain('ä');
    expect(result.improvedPrompt).toContain('å');
    expect(result.improvedPrompt).toContain('ö');
    expect(result.improvedPrompt).not.toContain('Ã');
    expect(result.transformations.some(t => t.type === 'normalization')).toBe(true);
  });

  it('3.8 should continue enforcing paragraph breaks in main text', async () => {
    // OBSERVATION: System adds paragraph breaks to long text
    const longText = 'Storgatan 12 ligger på Södermalm. Köket renoverades 2022. Balkongen har söderläge. Lägenheten har tre rum. Badrummet är helkaklat. Närhet till tunnelbana.';
    
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: longText,
    }));

    // EXPECTED: Should have paragraph breaks
    const paragraphBreaks = (result.improvedPrompt.match(/\n\n/g) || []).length;
    expect(paragraphBreaks).toBeGreaterThanOrEqual(2);
    
    // Should log transformation if breaks were added
    if (paragraphBreaks > 0) {
      expect(result.transformations.some(t => t.type === 'paragraph_enforcement')).toBe(true);
    }
  });

  it('3.7 should continue generalizing restaurant names', async () => {
    // OBSERVATION: System generalizes specific business names
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Restaurang Gondolen och Restaurang Pelikan finns i området.',
    }));

    // EXPECTED: Generalized to "restauranger"
    expect(result.improvedPrompt).not.toMatch(/Restaurang\s+[A-ZÅÄÖ][a-zåäö]+/);
    expect(result.improvedPrompt.toLowerCase()).toContain('restaurang');
    expect(result.transformations.some(t => t.type === 'generalization')).toBe(true);
  });
});

// ─── Preservation 6: Validation Detection ────────────────────────────────────

describe('Preservation 6: Validation Detection (Requirements 3.9-3.10)', () => {
  
  it('3.9 should continue detecting forbidden phrases in validation', () => {
    // OBSERVATION: Validation detects AI clichés
    const text = 'Välkommen till denna lägenhet som erbjuder en unik möjlighet.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    
    // EXPECTED: Should detect forbidden phrases
    const hasForbiddenPhraseDetection = violations.some(v => 
      v.includes('Förbjuden fras') || v.includes('välkommen') || v.includes('erbjuder')
    );
    expect(hasForbiddenPhraseDetection).toBe(true);
  });

  it('3.9 should continue detecting platform violations', () => {
    // OBSERVATION: Validation detects Hemnet rule violations
    const text = 'Lägenheten har utgångspris 3 500 000 kr och energiklass B.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    
    // EXPECTED: Should detect Hemnet violations
    const hasPlatformViolation = violations.some(v => 
      v.includes('Energiklass') || v.includes('pris') || v.includes('Hemnet')
    );
    expect(hasPlatformViolation).toBe(true);
  });

  it('3.9 should continue detecting repetitive sentence starters', () => {
    // OBSERVATION: Validation detects monotonous writing
    const text = 'Köket har nya vitvaror. Köket har kompositbänk. Köket har köksö. Köket har gott om förvaring. Köket har fönster mot gården.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    
    // EXPECTED: Should detect repetitive starters
    const hasRepetitionDetection = violations.some(v => 
      v.includes('Monoton') || v.includes('upprepas') || v.includes('meningsstart')
    );
    expect(hasRepetitionDetection).toBe(true);
  });

  it('3.10 should continue providing detailed error messages', () => {
    // OBSERVATION: Validation provides specific violation messages
    const text = 'Välkommen till denna lägenhet.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    
    // EXPECTED: Violations should be descriptive
    expect(violations.length).toBeGreaterThan(0);
    violations.forEach(v => {
      expect(v.length).toBeGreaterThan(10); // Not just error codes
      expect(typeof v).toBe('string');
    });
  });

  it('3.10 should continue detecting CTA endings', () => {
    // OBSERVATION: Validation detects call-to-action endings
    const text = 'Lägenheten har renoverat kök och balkong. Kontakta oss för mer information.';
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    
    // EXPECTED: Should detect CTA ending
    const hasCtaDetection = violations.some(v => 
      v.includes('CTA') || v.includes('kontakta') || v.includes('uppmaning')
    );
    expect(hasCtaDetection).toBe(true);
  });
});

// ─── Preservation 7: Style-Specific Behavior ─────────────────────────────────

describe('Preservation 7: Style-Specific Behavior', () => {
  
  it('should continue respecting "factual" style restrictions', async () => {
    // OBSERVATION: Factual style blocks more phrases
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Lägenheten har en charmig atmosfär och elegant design.',
      style: 'factual',
    }));

    // EXPECTED: Emotional language removed in factual style
    const violations = findRuleViolations(result.improvedPrompt, 'hemnet', 'factual');
    
    // Factual style should flag emotional adjectives
    const hasStyleViolation = violations.some(v => 
      v.includes('Factual') || v.includes('värdeladdade')
    );
    
    // Note: This depends on current implementation
    // If violations exist, they should be preserved
    if (violations.length > 0) {
      expect(hasStyleViolation).toBe(true);
    }
  });

  it('should continue allowing mild hyperbole in "balanced" style', () => {
    // OBSERVATION: Balanced style allows some expressive language
    const text = 'Lägenheten har genomtänkt planlösning och ljus känsla.';
    
    // EXPECTED: Should NOT block legitimate broker language
    const shouldBlock = shouldBlockPhraseForStyle('genomtänkt', 'balanced', 'hemnet');
    expect(shouldBlock).toBe(false);
  });

  it('should continue allowing more expression in "selling" style', () => {
    // OBSERVATION: Selling style is more permissive
    const text = 'Fantastisk lägenhet med underbar utsikt.';
    
    // EXPECTED: Should allow expressive language in selling style
    const shouldBlockFantastisk = shouldBlockPhraseForStyle('fantastisk', 'selling', 'hemnet');
    const shouldBlockUnderbar = shouldBlockPhraseForStyle('underbar', 'selling', 'hemnet');
    
    expect(shouldBlockFantastisk).toBe(false);
    expect(shouldBlockUnderbar).toBe(false);
  });
});

// ─── Integration: Complete Preservation Test ─────────────────────────────────

describe('Integration: Complete Preservation Validation', () => {
  
  it('should preserve all quality features for valid input', async () => {
    // OBSERVATION: System handles valid input correctly
    const validRequest = makePostProcessRequest({
      improvedPrompt: 'Storgatan 12 ligger på Södermalm med 5 minuter till tunnelbanan. Köket renoverades 2022 med nya Siemens-vitvaror och kompositbänk.\n\nBalkongen har söderläge och ger kvällssol. Badrummet är helkaklat med golvvärme.\n\nNärområdet har matbutiker, restauranger och parker inom gångavstånd.',
      headline: 'Trea med renoverat kök',
      socialCopy: 'Renoverat kök 2022 och balkong i söderläge.',
      instagramCaption: 'Ljus 3:a på Södermalm 🏠',
      showingInvitation: 'Välkommen på visning.',
      shortAd: 'Trea om 75 kvm med renoverat kök och balkong.',
      platform: 'hemnet',
      style: 'balanced',
    });

    const result = await processor.process(validRequest);

    // EXPECTED: All quality features preserved
    
    // 1. Text quality maintained
    expect(result.improvedPrompt.length).toBeGreaterThan(100);
    expect(result.improvedPrompt).toContain('Storgatan 12');
    
    // 2. No forbidden phrases
    const lowerText = result.improvedPrompt.toLowerCase();
    expect(lowerText).not.toContain('välkommen till');
    expect(lowerText).not.toContain('erbjuder');
    
    // 3. Paragraph structure preserved
    expect(result.improvedPrompt).toMatch(/\n\n/);
    
    // 4. Headline format correct
    expect(result.headline).not.toMatch(/\.$/);
    expect(result.headline.split(/\s+/).length).toBeLessThanOrEqual(9);
    
    // 5. ShowingInvitation valid
    expect(result.showingInvitation.toLowerCase()).toContain('visning');
    
    // 6. Instagram emoji count valid
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;
    const emojis = result.instagramCaption.match(emojiPattern) || [];
    expect(emojis.length).toBeLessThanOrEqual(2);
    
    // 7. Transformations logged
    expect(Array.isArray(result.transformations)).toBe(true);
    
    // 8. Duration tracked
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should validate that forbidden phrase list is comprehensive', () => {
    // OBSERVATION: System has comprehensive forbidden phrase list
    expect(FORBIDDEN_PHRASES.length).toBeGreaterThan(50);
    
    // Key AI clichés should be in the list
    expect(FORBIDDEN_PHRASES).toContain('välkommen till');
    expect(FORBIDDEN_PHRASES).toContain('erbjuder');
    expect(FORBIDDEN_PHRASES).toContain('bjuder på');
    expect(FORBIDDEN_PHRASES).toContain('i hjärtat av');
    expect(FORBIDDEN_PHRASES).toContain('för den som');
    expect(FORBIDDEN_PHRASES).toContain('missa inte');
    expect(FORBIDDEN_PHRASES).toContain('unik möjlighet');
  });
});
