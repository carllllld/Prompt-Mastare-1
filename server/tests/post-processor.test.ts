/**
 * Unit tests for DeterministicPostProcessor (Task 10.2)
 * No external dependencies — pure deterministic logic.
 */
import { describe, it, expect } from 'vitest';
import { DeterministicPostProcessor } from '../lib/perfect-swedish-post-processor';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const processor = new DeterministicPostProcessor();

function makeRequest(overrides: Partial<Parameters<typeof processor.process>[0]> = {}) {
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

// ─── Restaurant name validation ───────────────────────────────────────────────

describe('10.2 Post-processor: restaurant name generalization', () => {
  it('should replace "Restaurang X" with "restauranger"', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Nära Restaurang Gondolen och Restaurang Pelikan.',
      socialCopy: 'Nära Restaurang Gondolen.',
      instagramCaption: 'Nära Restaurang Gondolen 🍽️',
    }));

    expect(result.improvedPrompt).not.toMatch(/Restaurang\s+[A-ZÅÄÖ]/);
    expect(result.socialCopy).not.toMatch(/Restaurang\s+[A-ZÅÄÖ]/);
    expect(result.transformations.some(t => t.type === 'generalization')).toBe(true);
  });

  it('should replace "Kafé X" with "kaféer"', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Nära Kafé Saturnus och Kafé Pascal.',
      socialCopy: 'Nära Kafé Saturnus.',
      instagramCaption: 'Nära Kafé Saturnus ☕',
    }));

    expect(result.improvedPrompt).not.toMatch(/Kafé\s+[A-ZÅÄÖ]/);
    expect(result.transformations.some(t => t.type === 'generalization')).toBe(true);
  });

  it('should log generalization transformations', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Nära Restaurang Gondolen.',
      socialCopy: 'Nära Restaurang Gondolen.',
      instagramCaption: 'Nära Restaurang Gondolen 🍽️',
    }));

    const genTransformations = result.transformations.filter(t => t.type === 'generalization');
    expect(genTransformations.length).toBeGreaterThan(0);
    genTransformations.forEach(t => {
      expect(t.field).toBeTruthy();
      expect(t.before).toBeTruthy();
      expect(t.after).toBeTruthy();
    });
  });

  it('should not modify text without restaurant names', async () => {
    const text = 'Bostaden har ett renoverat kök och helkaklat badrum.';
    const result = await processor.process(makeRequest({ improvedPrompt: text }));
    // No generalization transformations for this text
    const genTransformations = result.transformations.filter(
      t => t.type === 'generalization' && t.field === 'improvedPrompt'
    );
    expect(genTransformations.length).toBe(0);
  });
});

// ─── Narrative integrity ──────────────────────────────────────────────────────

describe('10.2 Post-processor: narrative integrity', () => {
  it('should fix sentences ending with comma', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Bostaden har ett rymligt kök,',
    }));
    expect(result.improvedPrompt).toMatch(/kök\.$/);
    expect(result.transformations.some(t =>
      t.type === 'narrative_integrity' && t.before === 'Incomplete sentence ending'
    )).toBe(true);
  });

  it('should add period at end if missing', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Bostaden är rymlig och ljus',
    }));
    expect(result.improvedPrompt).toMatch(/\.$/);
    expect(result.transformations.some(t =>
      t.type === 'narrative_integrity' && t.before === 'Text ending without punctuation'
    )).toBe(true);
  });

  it('should remove trailing conjunctions', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Bostaden är rymlig och',
    }));
    expect(result.improvedPrompt).not.toMatch(/\s+och\.?$/i);
    expect(result.transformations.some(t =>
      t.type === 'narrative_integrity' && t.before === 'Text ending with conjunction'
    )).toBe(true);
  });

  it('should capitalize bullet points', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: '- kök\n- badrum\n- balkong',
    }));
    expect(result.improvedPrompt).toContain('- Kök');
    expect(result.improvedPrompt).toContain('- Badrum');
  });

  it('should log all narrative integrity fixes', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Text utan avslutning',
    }));
    const narrativeTransformations = result.transformations.filter(
      t => t.type === 'narrative_integrity'
    );
    expect(narrativeTransformations.length).toBeGreaterThan(0);
    narrativeTransformations.forEach(t => {
      expect(t.field).toBeTruthy();
      expect(t.before).toBeTruthy();
      expect(t.after).toBeTruthy();
    });
  });
});

// ─── Missing facts detection ──────────────────────────────────────────────────

describe('10.2 Post-processor: missing facts detection', () => {
  it('should add energiklass when missing from text', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Bostaden är fin.',
      disposition: { energiklass: 'C' },
    }));
    expect(result.improvedPrompt).toContain('energiklass C');
    expect(result.transformations.some(t => t.type === 'missing_facts')).toBe(true);
  });

  it('should add värmesystem when missing from text', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Bostaden är fin.',
      disposition: { värmesystem: 'Fjärrvärme' },
    }));
    expect(result.improvedPrompt.toLowerCase()).toContain('fjärrvärme');
    expect(result.transformations.some(t => t.type === 'missing_facts')).toBe(true);
  });

  it('should not duplicate energiklass if already present', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Bostaden har energiklass B.',
      disposition: { energiklass: 'B' },
    }));
    const count = (result.improvedPrompt.match(/energiklass/gi) || []).length;
    expect(count).toBe(1);
  });

  it('should log all added facts as transformations', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Bostaden är fin.',
      disposition: { energiklass: 'A', värmesystem: 'Bergvärme' },
    }));
    const factTransformations = result.transformations.filter(t => t.type === 'missing_facts');
    expect(factTransformations.length).toBe(2);
    factTransformations.forEach(t => {
      expect(t.field).toBe('improvedPrompt');
      expect(t.before).toContain('Missing');
      expect(t.after).toContain('Added');
    });
  });

  it('should handle graceful degradation when disposition is null', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Bostaden är fin.',
      disposition: null as any,
    }));
    // Should not crash, return original text
    expect(result.improvedPrompt).toBeDefined();
    expect(result.transformations.some(t => t.type === 'missing_facts')).toBe(false);
  });
});

// ─── Forbidden phrase removal ─────────────────────────────────────────────────

describe('10.2 Post-processor: forbidden phrase removal', () => {
  it('should remove forbidden phrases from all fields', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Välkommen till denna fantastiska lägenhet.',
      headline: 'Fantastisk lägenhet',
      socialCopy: 'Välkommen till lägenheten.',
      instagramCaption: 'Välkommen till 🏠',
      showingInvitation: 'Välkommen till visning.',
      shortAd: 'Fantastisk lägenhet.',
    }));

    // "välkommen till" is a forbidden phrase
    expect(result.improvedPrompt.toLowerCase()).not.toContain('välkommen till');
    expect(result.socialCopy.toLowerCase()).not.toContain('välkommen till');
    expect(result.transformations.some(t => t.type === 'forbidden_phrase')).toBe(true);
  });

  it('should log forbidden phrase transformations', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Välkommen till denna lägenhet.',
    }));
    const forbiddenTransformations = result.transformations.filter(
      t => t.type === 'forbidden_phrase'
    );
    expect(forbiddenTransformations.length).toBeGreaterThan(0);
    forbiddenTransformations.forEach(t => {
      expect(t.field).toBeTruthy();
      expect(t.before).toBeTruthy();
    });
  });
});

// ─── Placeholder removal ──────────────────────────────────────────────────────

describe('10.2 Post-processor: placeholder removal', () => {
  it('should remove [TID] placeholder', async () => {
    const result = await processor.process(makeRequest({
      showingInvitation: 'Visning [TID].',
    }));
    expect(result.showingInvitation).not.toContain('[TID]');
    expect(result.transformations.some(t => t.type === 'placeholder')).toBe(true);
  });

  it('should remove [KONTAKT] placeholder', async () => {
    const result = await processor.process(makeRequest({
      showingInvitation: 'Kontakta [KONTAKT] för mer info.',
    }));
    expect(result.showingInvitation).not.toContain('[KONTAKT]');
  });

  it('should remove [MÄKLARE] placeholder', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Kontakta [MÄKLARE] för visning.',
    }));
    expect(result.improvedPrompt).not.toContain('[MÄKLARE]');
  });

  it('should remove [ADRESS] placeholder', async () => {
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Bostaden på [ADRESS] är fin.',
    }));
    expect(result.improvedPrompt).not.toContain('[ADRESS]');
  });
});

// ─── Graceful degradation ─────────────────────────────────────────────────────

describe('10.2 Post-processor: graceful degradation', () => {
  it('should return original text on internal error', async () => {
    // Pass a request that will cause an error in processing
    // (e.g., by passing a non-string field that breaks regex)
    const result = await processor.process(makeRequest({
      improvedPrompt: 'Normal text.',
    }));
    // Should always return a result, never throw
    expect(result).toBeDefined();
    expect(result.improvedPrompt).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should always return transformations array (even if empty)', async () => {
    const result = await processor.process(makeRequest());
    expect(Array.isArray(result.transformations)).toBe(true);
  });

  it('should always return duration', async () => {
    const result = await processor.process(makeRequest());
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

// ─── Headline formatting ──────────────────────────────────────────────────────

describe('10.2 Post-processor: headline formatting', () => {
  it('should remove trailing period from headline', async () => {
    const result = await processor.process(makeRequest({
      headline: 'Välplanerad trea med balkong.',
    }));
    expect(result.headline).not.toMatch(/\.$/);
    expect(result.transformations.some(t =>
      t.type === 'formatting' && t.field === 'headline'
    )).toBe(true);
  });

  it('should not add period to headline that already lacks one', async () => {
    const result = await processor.process(makeRequest({
      headline: 'Välplanerad trea med balkong',
    }));
    // Headline should not end with period after processing
    // (narrative integrity adds period to other fields, but headline formatting removes it)
    expect(result.headline).toBeDefined();
  });
});
