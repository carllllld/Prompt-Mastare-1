import { describe, it, expect } from 'vitest';
import { DeterministicPostProcessor } from '../lib/perfect-swedish-post-processor';

describe('Missing Facts Detection', () => {
  const postProcessor = new DeterministicPostProcessor();

  describe('Energiklass Detection', () => {
    it('should detect missing energiklass and add it', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet med moderna bekvämligheter.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: {
          energiklass: 'C'
        },
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      expect(result.improvedPrompt).toContain('energiklass C');
      expect(result.transformations.some(t => t.type === 'missing_facts')).toBe(true);
      expect(result.transformations.some(t => t.after.includes('energiklass C'))).toBe(true);
    });

    it('should not add energiklass if already mentioned', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet med energiklass B.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: {
          energiklass: 'B'
        },
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      // Should not add duplicate
      const energiklassCount = (result.improvedPrompt.match(/energiklass/gi) || []).length;
      expect(energiklassCount).toBe(1);
      expect(result.transformations.some(t => t.type === 'missing_facts' && t.before === 'Missing energiklass')).toBe(false);
    });

    it('should not add energiklass if not in disposition', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet med moderna bekvämligheter.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: {},
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      expect(result.improvedPrompt).not.toContain('energiklass');
      expect(result.transformations.some(t => t.type === 'missing_facts' && t.before === 'Missing energiklass')).toBe(false);
    });
  });

  describe('Värmesystem Detection', () => {
    it('should detect missing värmesystem and add it', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet med moderna bekvämligheter.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: {
          värmesystem: 'Fjärrvärme'
        },
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      expect(result.improvedPrompt).toContain('fjärrvärme');
      expect(result.transformations.some(t => t.type === 'missing_facts')).toBe(true);
      expect(result.transformations.some(t => t.after.includes('värmesystem Fjärrvärme'))).toBe(true);
    });

    it('should not add värmesystem if heating is mentioned', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet med fjärrvärme.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: {
          värmesystem: 'Fjärrvärme'
        },
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      // Should not add duplicate
      const värmeCount = (result.improvedPrompt.match(/värme/gi) || []).length;
      expect(värmeCount).toBe(1);
      expect(result.transformations.some(t => t.type === 'missing_facts' && t.before === 'Missing värmesystem')).toBe(false);
    });

    it('should detect värmesystem from property.värmesystem path', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet med moderna bekvämligheter.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: {
          property: {
            värmesystem: 'Bergvärme'
          }
        },
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      expect(result.improvedPrompt).toContain('bergvärme');
      expect(result.transformations.some(t => t.type === 'missing_facts')).toBe(true);
    });
  });

  describe('Combined Facts', () => {
    it('should add both energiklass and värmesystem if missing', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet med moderna bekvämligheter.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: {
          energiklass: 'B',
          värmesystem: 'Fjärrvärme'
        },
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      expect(result.improvedPrompt).toContain('energiklass B');
      expect(result.improvedPrompt).toContain('fjärrvärme');
      
      const missingFactsTransformations = result.transformations.filter(t => t.type === 'missing_facts');
      expect(missingFactsTransformations.length).toBe(2);
    });

    it('should add facts in natural Swedish language', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: {
          energiklass: 'A',
          värmesystem: 'Vattenburen värme'
        },
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      // Check natural language format
      expect(result.improvedPrompt).toMatch(/Bostaden har energiklass A\./);
      expect(result.improvedPrompt).toMatch(/Uppvärmning sker med vattenburen värme\./);
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle missing disposition gracefully', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: null,
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      // Should not crash, just return original text
      expect(result.improvedPrompt).toBe('Detta är en fin lägenhet.');
      expect(result.transformations.some(t => t.type === 'missing_facts')).toBe(false);
    });

    it('should handle undefined disposition fields gracefully', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: {
          property: {}
        },
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      // Should not crash
      expect(result.improvedPrompt).toBe('Detta är en fin lägenhet.');
      expect(result.transformations.some(t => t.type === 'missing_facts')).toBe(false);
    });
  });

  describe('Logging', () => {
    it('should log all added facts as transformations', async () => {
      const request = {
        improvedPrompt: 'Detta är en fin lägenhet.',
        headline: 'Fin lägenhet',
        socialCopy: 'Kolla in denna lägenhet',
        instagramCaption: 'Ny lägenhet',
        showingInvitation: 'Välkommen på visning',
        shortAd: 'Lägenhet till salu',
        disposition: {
          energiklass: 'C',
          värmesystem: 'Fjärrvärme'
        },
        style: 'balanced' as const,
        platform: 'hemnet'
      };

      const result = await postProcessor.process(request);

      const missingFactsTransformations = result.transformations.filter(t => t.type === 'missing_facts');
      
      expect(missingFactsTransformations.length).toBe(2);
      expect(missingFactsTransformations[0].field).toBe('improvedPrompt');
      expect(missingFactsTransformations[0].before).toContain('Missing');
      expect(missingFactsTransformations[0].after).toContain('Added');
      expect(missingFactsTransformations[1].field).toBe('improvedPrompt');
      expect(missingFactsTransformations[1].before).toContain('Missing');
      expect(missingFactsTransformations[1].after).toContain('Added');
    });
  });
});
