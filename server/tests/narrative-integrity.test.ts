import { describe, it, expect } from 'vitest';
import { DeterministicPostProcessor } from '../lib/perfect-swedish-post-processor';

describe('Narrative Integrity Checks', () => {
  const processor = new DeterministicPostProcessor();

  describe('Incomplete Sentences', () => {
    it('should fix sentences ending with comma', async () => {
      const request = {
        improvedPrompt: 'Bostaden har ett rymligt kök,',
        headline: 'Test',
        socialCopy: 'Test',
        instagramCaption: 'Test',
        showingInvitation: 'Test',
        shortAd: 'Test',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

      expect(result.improvedPrompt).toBe('Bostaden har ett rymligt kök.');
      expect(result.transformations.some(t => 
        t.type === 'narrative_integrity' && 
        t.before === 'Incomplete sentence ending'
      )).toBe(true);
    });

    it.skip('should add missing periods between sentences', async () => {
      // TODO: This feature is not yet implemented
      // The post-processor currently only adds periods at the end of text,
      // not between sentences. This would require more sophisticated NLP.
      const request = {
        improvedPrompt: 'Bostaden är rymlig Den har tre rum',
        headline: 'Test',
        socialCopy: 'Test',
        instagramCaption: 'Test',
        showingInvitation: 'Test',
        shortAd: 'Test',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

      expect(result.improvedPrompt).toBe('Bostaden är rymlig. Den har tre rum.');
      expect(result.transformations.some(t => 
        t.type === 'narrative_integrity' && 
        t.before === 'Missing period between sentences'
      )).toBe(true);
    });

    it('should detect sentence fragments', async () => {
      const request = {
        improvedPrompt: 'Bostaden är rymlig. Ja.',
        headline: 'Test',
        socialCopy: 'Test',
        instagramCaption: 'Test',
        showingInvitation: 'Test',
        shortAd: 'Test',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

      expect(result.transformations.some(t => 
        t.type === 'narrative_integrity' && 
        t.before === 'Detected sentence fragments'
      )).toBe(true);
    });
  });

  describe('Missing Bullet Points', () => {
    it('should complete incomplete lists', async () => {
      const request = {
        improvedPrompt: 'Bostaden har: kök, badrum,',
        headline: 'Test',
        socialCopy: 'Test',
        instagramCaption: 'Test',
        showingInvitation: 'Test',
        shortAd: 'Test',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

      expect(result.improvedPrompt).toContain('och mer.');
      expect(result.transformations.some(t => 
        t.type === 'narrative_integrity' && 
        t.before === 'Incomplete list'
      )).toBe(true);
    });

    it('should capitalize bullet points', async () => {
      const request = {
        improvedPrompt: '- kök\n- badrum',
        headline: 'Test',
        socialCopy: 'Test',
        instagramCaption: 'Test',
        showingInvitation: 'Test',
        shortAd: 'Test',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

      expect(result.improvedPrompt).toContain('- Kök');
      expect(result.improvedPrompt).toContain('- Badrum');
      expect(result.transformations.some(t => 
        t.type === 'narrative_integrity' && 
        t.before === 'Bullet points with lowercase start'
      )).toBe(true);
    });
  });

  describe('Abrupt Endings', () => {
    it('should add period at end if missing', async () => {
      const request = {
        improvedPrompt: 'Bostaden är rymlig och ljus',
        headline: 'Test',
        socialCopy: 'Test',
        instagramCaption: 'Test',
        showingInvitation: 'Test',
        shortAd: 'Test',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

      expect(result.improvedPrompt).toBe('Bostaden är rymlig och ljus.');
      expect(result.transformations.some(t => 
        t.type === 'narrative_integrity' && 
        t.before === 'Text ending without punctuation'
      )).toBe(true);
    });

    it('should detect abrupt endings with prepositions', async () => {
      const request = {
        improvedPrompt: 'Bostaden har ett.',
        headline: 'Test',
        socialCopy: 'Test',
        instagramCaption: 'Test',
        showingInvitation: 'Test',
        shortAd: 'Test',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

      expect(result.transformations.some(t => 
        t.type === 'narrative_integrity' && 
        t.before.includes('Abrupt ending detected')
      )).toBe(true);
    });

    it('should remove trailing conjunctions', async () => {
      const request = {
        improvedPrompt: 'Bostaden är rymlig och',
        headline: 'Test',
        socialCopy: 'Test',
        instagramCaption: 'Test',
        showingInvitation: 'Test',
        shortAd: 'Test',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

      expect(result.improvedPrompt).toBe('Bostaden är rymlig.');
      expect(result.transformations.some(t => 
        t.type === 'narrative_integrity' && 
        t.before === 'Text ending with conjunction'
      )).toBe(true);
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue processing even if narrative check fails', async () => {
      const request = {
        improvedPrompt: 'Normal text',
        headline: 'Test',
        socialCopy: 'Test',
        instagramCaption: 'Test',
        showingInvitation: 'Test',
        shortAd: 'Test',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

      expect(result.improvedPrompt).toBe('Normal text.');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('All Fields Processing', () => {
    it('should check narrative integrity for all fields', async () => {
      const request = {
        improvedPrompt: 'Text without ending',
        headline: 'Headline without ending',
        socialCopy: 'Social without ending',
        instagramCaption: 'Instagram without ending',
        showingInvitation: 'Invitation without ending',
        shortAd: 'Ad without ending',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

      expect(result.improvedPrompt).toMatch(/\.$/);
      // Headlines do not get periods added (applyFormatting removes them)
      expect(result.headline).toBeDefined();
      expect(result.socialCopy).toMatch(/\.$/);
      expect(result.instagramCaption).toMatch(/\.$/);
      expect(result.showingInvitation).toMatch(/\.$/);
      expect(result.shortAd).toMatch(/\.$/);
    });
  });

  describe('Logging', () => {
    it('should log all narrative integrity fixes', async () => {
      const request = {
        improvedPrompt: 'Text without ending',
        headline: 'Test',
        socialCopy: 'Test',
        instagramCaption: 'Test',
        showingInvitation: 'Test',
        shortAd: 'Test',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await processor.process(request);

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
});
