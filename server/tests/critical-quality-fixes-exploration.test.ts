/**
 * Bug Condition Exploration Tests for Critical Quality Fixes
 * 
 * **CRITICAL**: These tests are EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bugs exist. DO NOT fix the tests or code when they fail.
 * 
 * These tests encode the expected behavior - they will validate the fix when they pass.
 * 
 * **Validates: Requirements 1.1-1.10 (Bug Conditions)**
 * **Property 1: Bug Condition - Critical Quality Errors Detection**
 */

import { describe, it, expect } from 'vitest';
import { DeterministicPostProcessor } from '../lib/perfect-swedish-post-processor';
import { SmartGenerationEngine } from '../lib/perfect-swedish-generator';
import { findRuleViolations } from '../lib/text-validation';

// ─── Test Helpers ────────────────────────────────────────────────────────────

const processor = new DeterministicPostProcessor();
const generator = new SmartGenerationEngine();

function makePostProcessRequest(overrides: Partial<Parameters<typeof processor.process>[0]> = {}) {
  return {
    improvedPrompt: 'Storgatan 12 är en välplanerad trea om 75 kvm.',
    headline: 'Välplanerad trea med balkong',
    socialCopy: 'Välplanerad lägenhet med balkong.',
    instagramCaption: 'Ljus 3:a 🏠',
    showingInvitation: 'Välkommen på visning.',
    shortAd: 'Ljus 3:a, 75 kvm.',
    disposition: {},
    style: 'balanced' as const,
    platform: 'hemnet',
    ...overrides,
  };
}

// ─── Bug Condition 1: Grammar Errors ─────────────────────────────────────────

describe('Bug Condition 1: Grammar Errors (Requirements 1.1-1.3)', () => {
  
  it('1.1 should detect and fix double punctuation (..) in text', async () => {
    // CONCRETE FAILING CASE: Double punctuation that should be cleaned up
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Lägenheten ligger vid Slussen.. Köket är renoverat.',
      socialCopy: 'Fin lägenhet vid Slussen..',
      headline: 'Lägenhet vid Slussen..',
    }));

    // EXPECTED BEHAVIOR: No double punctuation should exist after processing
    expect(result.improvedPrompt).not.toMatch(/\.\.+/);
    expect(result.socialCopy).not.toMatch(/\.\.+/);
    expect(result.headline).not.toMatch(/\.\.+/);
    
    // Should log transformation
    expect(result.transformations.some(t => 
      t.type === 'formatting' || t.type === 'narrative_integrity'
    )).toBe(true);
  });

  it('1.2 should detect and fix space before punctuation in text', async () => {
    // CONCRETE FAILING CASE: Space before punctuation
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Välkommen på visning . Köket är renoverat .',
      socialCopy: 'Fin lägenhet med balkong .',
      showingInvitation: 'Visning kl 18 .',
    }));

    // EXPECTED BEHAVIOR: No space before punctuation
    expect(result.improvedPrompt).not.toMatch(/\s+\./);
    expect(result.socialCopy).not.toMatch(/\s+\./);
    expect(result.showingInvitation).not.toMatch(/\s+\./);
    
    // Should log transformation
    expect(result.transformations.some(t => 
      t.type === 'formatting' || t.type === 'narrative_integrity'
    )).toBe(true);
  });

  it('1.3 should detect broken sentences with missing punctuation between clauses', () => {
    // CONCRETE FAILING CASE: Missing punctuation between clauses
    const text = 'Nya fönster och tjärpappstak är två tydliga plus prioriterar långsiktigt underhåll.';
    
    // EXPECTED BEHAVIOR: Validation should detect this as a broken sentence
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    
    // This should be flagged as a narrative integrity issue or broken sentence
    // The text is clearly broken - missing punctuation between "plus" and "prioriterar"
    const hasBrokenSentenceDetection = violations.some(v => 
      v.includes('Avhuggen') || 
      v.includes('mening') || 
      v.includes('Trasig') ||
      v.includes('Saknad meningsgräns')
    );
    
    expect(hasBrokenSentenceDetection).toBe(true);
  });
});

// ─── Bug Condition 2: Emoji Violations ───────────────────────────────────────

describe('Bug Condition 2: Emoji Violations (Requirements 1.4-1.5)', () => {
  
  it('1.4 should remove emojis from Hemnet socialCopy field', async () => {
    // CONCRETE FAILING CASE: Emojis in Hemnet socialCopy (forbidden)
    const result = await processor.process(makePostProcessRequest({
      socialCopy: 'Ljus lägenhet med balkong 🌞 och renoverat kök 🛁',
      platform: 'hemnet',
    }));

    // EXPECTED BEHAVIOR: No emojis in Hemnet socialCopy
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;
    expect(result.socialCopy).not.toMatch(emojiPattern);
    
    // Should log transformation
    expect(result.transformations.some(t => t.type === 'formatting')).toBe(true);
  });

  it('1.4 should remove emojis from Hemnet headline field', async () => {
    // CONCRETE FAILING CASE: Emojis in Hemnet headline (forbidden)
    const result = await processor.process(makePostProcessRequest({
      headline: 'Ljus trea med balkong 🌞',
      platform: 'hemnet',
    }));

    // EXPECTED BEHAVIOR: No emojis in Hemnet headline
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;
    expect(result.headline).not.toMatch(emojiPattern);
  });

  it('1.4 should remove emojis from Hemnet showingInvitation field', async () => {
    // CONCRETE FAILING CASE: Emojis in Hemnet showingInvitation (forbidden)
    const result = await processor.process(makePostProcessRequest({
      showingInvitation: 'Välkommen på visning 🏡',
      platform: 'hemnet',
    }));

    // EXPECTED BEHAVIOR: No emojis in Hemnet showingInvitation
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;
    expect(result.showingInvitation).not.toMatch(emojiPattern);
  });

  it('1.4 should remove emojis from Hemnet shortAd field', async () => {
    // CONCRETE FAILING CASE: Emojis in Hemnet shortAd (forbidden)
    const result = await processor.process(makePostProcessRequest({
      shortAd: 'Trea med balkong 🌞 och renoverat kök',
      platform: 'hemnet',
    }));

    // EXPECTED BEHAVIOR: No emojis in Hemnet shortAd
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;
    expect(result.shortAd).not.toMatch(emojiPattern);
  });

  it('1.5 should limit Instagram caption to max 2 emojis', async () => {
    // CONCRETE FAILING CASE: More than 2 emojis in Instagram caption
    const result = await processor.process(makePostProcessRequest({
      instagramCaption: 'Ljus lägenhet 🌞🛁🏡✨ med balkong',
      platform: 'hemnet',
    }));

    // EXPECTED BEHAVIOR: Max 2 emojis in Instagram caption
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;
    const emojis = result.instagramCaption.match(emojiPattern) || [];
    expect(emojis.length).toBeLessThanOrEqual(2);
    
    // Should log transformation if emojis were removed
    if (emojis.length < 4) {
      expect(result.transformations.some(t => t.type === 'formatting')).toBe(true);
    }
  });
});

// ─── Bug Condition 3: Specific Business Names ────────────────────────────────

describe('Bug Condition 3: Specific Business Names (Requirements 1.6-1.7)', () => {
  
  it('1.6 should replace specific restaurant name "Kikka" with generic term', async () => {
    // CONCRETE FAILING CASE: Specific restaurant name in text
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Närområdet har Kikka och andra matställen.',
      socialCopy: 'Nära Kikka och shopping.',
    }));

    // EXPECTED BEHAVIOR: No specific restaurant name "Kikka"
    expect(result.improvedPrompt.toLowerCase()).not.toContain('kikka');
    expect(result.socialCopy.toLowerCase()).not.toContain('kikka');
    
    // Should use generic term instead
    expect(result.improvedPrompt.toLowerCase()).toMatch(/restaurang|matställ|kafé/);
  });

  it('1.6 should replace "COME 2 EAT" with generic term', async () => {
    // CONCRETE FAILING CASE: Specific restaurant name
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'COME 2 EAT ligger runt hörnet.',
    }));

    // EXPECTED BEHAVIOR: No specific restaurant name
    expect(result.improvedPrompt).not.toMatch(/come 2 eat/i);
    expect(result.improvedPrompt.toLowerCase()).toMatch(/restaurang|matställ/);
  });

  it('1.6 should replace "ChopChop Asian Express" with generic term', async () => {
    // CONCRETE FAILING CASE: Specific restaurant name
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'ChopChop Asian Express finns i närområdet.',
    }));

    // EXPECTED BEHAVIOR: No specific restaurant name
    expect(result.improvedPrompt).not.toMatch(/chopchop asian express/i);
    expect(result.improvedPrompt.toLowerCase()).toMatch(/restaurang|matställ/);
  });

  it('1.7 should generalize "Restaurang X" pattern to "restauranger"', async () => {
    // CONCRETE FAILING CASE: Specific restaurant names with pattern
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Restaurang Gondolen och Restaurang Pelikan finns i området.',
      socialCopy: 'Nära Restaurang Gondolen.',
    }));

    // EXPECTED BEHAVIOR: Generic term "restauranger" instead of specific names
    expect(result.improvedPrompt).not.toMatch(/Restaurang\s+[A-ZÅÄÖ][a-zåäö]+/);
    expect(result.socialCopy).not.toMatch(/Restaurang\s+[A-ZÅÄÖ][a-zåäö]+/);
    expect(result.improvedPrompt.toLowerCase()).toContain('restaurang');
  });

  it('1.7 should generalize "Kafé X" pattern to "kaféer"', async () => {
    // CONCRETE FAILING CASE: Specific café names
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Kafé Saturnus och Kafé Pascal ligger nära.',
    }));

    // EXPECTED BEHAVIOR: Generic term "kaféer" instead of specific names
    expect(result.improvedPrompt).not.toMatch(/Kafé\s+[A-ZÅÄÖ][a-zåäö]+/);
    expect(result.improvedPrompt.toLowerCase()).toMatch(/kafé/);
  });
});

// ─── Bug Condition 4: Mechanical Text Style ──────────────────────────────────

describe('Bug Condition 4: Mechanical Text Style (Requirements 1.8-1.9)', () => {
  
  it('1.8 should detect mechanical bullet-point style "X (type). Y (type)."', () => {
    // CONCRETE FAILING CASE: Mechanical listing style
    const text = 'Willys Värmdö (matbutik). Kikka (restaurang). ChopChop (asiatisk mat).';
    
    // EXPECTED BEHAVIOR: Validation should detect mechanical style
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    
    const hasMechanicalDetection = violations.some(v => 
      v.includes('Mekanisk') || 
      v.includes('restaurangnamn') ||
      v.includes('uppräkning')
    );
    
    expect(hasMechanicalDetection).toBe(true);
  });

  it('1.9 should detect bullet points in prose text', () => {
    // CONCRETE FAILING CASE: Bullet points in main text
    const text = 'Lägenheten har:\n- Renoverat kök\n- Helkaklat badrum\n- Balkong i söderläge';
    
    // EXPECTED BEHAVIOR: Validation should detect bullet points
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    
    // Bullet points should be detected as mechanical style
    const hasBulletDetection = violations.length > 0;
    expect(hasBulletDetection).toBe(true);
  });
});

// ─── Bug Condition 5: Unverifiable Claims ────────────────────────────────────

describe('Bug Condition 5: Unverifiable Claims (Requirements 1.10)', () => {
  
  it('1.10 should detect "nyskick" claim without renovation evidence', () => {
    // CONCRETE FAILING CASE: Unverifiable condition claim
    const text = 'Bostaden är i genomgående nyskick med moderna detaljer.';
    const disposition = {
      // No renovation data, no inspection reports
      buildYear: 1985,
      condition: 'Bra',
    };
    
    // EXPECTED BEHAVIOR: Should be flagged as unverifiable claim
    // This is a validation concern - the text makes a strong claim without evidence
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    
    // "nyskick" without evidence should be detected
    // Note: This may require enhancement to text-validation.ts
    const hasUnverifiableClaimDetection = violations.some(v => 
      v.includes('nyskick') || 
      v.includes('toppskick') ||
      v.includes('perfekt skick')
    );
    
    // If not detected yet, this test will fail and document the bug
    expect(hasUnverifiableClaimDetection).toBe(true);
  });

  it('1.10 should allow "nyskick" claim WITH renovation evidence', () => {
    // CONCRETE PASSING CASE: Verifiable condition claim
    const text = 'Bostaden är i genomgående nyskick efter totalrenovering 2023.';
    const disposition = {
      buildYear: 1985,
      condition: 'Nyskick',
      renovationYear: 2023,
      kitchenRenovation: 2023,
      bathroomRenovation: 2023,
    };
    
    // EXPECTED BEHAVIOR: Should NOT be flagged when evidence exists
    const violations = findRuleViolations(text, 'hemnet', 'balanced');
    
    // With renovation evidence, "nyskick" is acceptable
    const hasUnverifiableClaimDetection = violations.some(v => 
      v.includes('nyskick') && v.includes('utan')
    );
    
    expect(hasUnverifiableClaimDetection).toBe(false);
  });
});

// ─── Integration: Complete Pipeline Test ─────────────────────────────────────

describe('Integration: Complete Quality Pipeline', () => {
  
  it('should handle text with multiple quality issues', async () => {
    // CONCRETE FAILING CASE: Multiple bugs in one text
    const result = await processor.process(makePostProcessRequest({
      improvedPrompt: 'Lägenheten ligger vid Slussen.. Nära Kikka (restaurang) och COME 2 EAT (matställe) . Bostaden är i nyskick .',
      socialCopy: 'Fin lägenhet vid Slussen.. 🌞🛁',
      instagramCaption: 'Ny lägenhet 🌞🛁🏡✨🌿',
      headline: 'Lägenhet vid Slussen..',
      platform: 'hemnet',
    }));

    // EXPECTED BEHAVIOR: All issues should be fixed
    
    // 1. No double punctuation
    expect(result.improvedPrompt).not.toMatch(/\.\.+/);
    expect(result.socialCopy).not.toMatch(/\.\.+/);
    expect(result.headline).not.toMatch(/\.\.+/);
    
    // 2. No space before punctuation
    expect(result.improvedPrompt).not.toMatch(/\s+\./);
    
    // 3. No specific restaurant names
    expect(result.improvedPrompt.toLowerCase()).not.toContain('kikka');
    expect(result.improvedPrompt).not.toMatch(/come 2 eat/i);
    
    // 4. No emojis in Hemnet socialCopy
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;
    expect(result.socialCopy).not.toMatch(emojiPattern);
    
    // 5. Max 2 emojis in Instagram
    const instagramEmojis = result.instagramCaption.match(emojiPattern) || [];
    expect(instagramEmojis.length).toBeLessThanOrEqual(2);
    
    // Should have logged multiple transformations
    expect(result.transformations.length).toBeGreaterThan(0);
  });
});
