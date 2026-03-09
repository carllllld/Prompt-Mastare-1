import { describe, it, expect } from 'vitest';
import {
  buildDeterministicFallbackDescription,
  buildDispositionFromStructuredData,
  isStrongPublishableCandidate,
  sanitizeGeneratedMarketingField,
  validateOptimizationResult,
} from '../routes';

describe('AI Pipeline Tests', () => {
  describe('Prompt Optimization', () => {
    it('should build structured pipeline input from property data', () => {
      const result = buildDispositionFromStructuredData({
        propertyType: 'apartment',
        address: 'Testgatan 1, Stockholm',
        livingArea: 75,
        rooms: 3,
        bedrooms: 2,
        buildYear: 2010,
        monthlyFee: 2500,
        price: 3500000,
        balconyDirection: 'söder',
        kitchen: 'kök med vita luckor',
        bathroom: 'helkaklat badrum',
        uniqueSellingPoints: 'balkong i söderläge',
        transport: 'T-bana 4 minuter',
      });

      expect(result.disposition.property.address).toBe('Testgatan 1, Stockholm');
      expect(result.disposition.property.size).toBe(75);
      expect(result.disposition.property.rooms).toBe(3);
      expect(result.tone_analysis.target_audience).toBeTruthy();
      expect(Array.isArray(result.writing_plan.paragraphs)).toBe(true);
    });

    it('should produce a publishable deterministic fallback after sanitizing', () => {
      const structured = buildDispositionFromStructuredData({
        propertyType: 'villa',
        address: 'Villagatan 1, Malmö',
        livingArea: 150,
        rooms: 5,
        bedrooms: 3,
        monthlyFee: 0,
        price: 4850000,
        kitchen: 'modernt kök med köksö',
        bathroom: 'två badrum',
        layout: 'öppen planlösning mellan kök och vardagsrum',
        uniqueSellingPoints: 'trädgård, söderläge',
        amenities: ['skola 400 meter', 'matbutik 500 meter'],
      });

      const fallback = buildDeterministicFallbackDescription(structured.disposition, 'balanced');
      const sanitized = sanitizeGeneratedMarketingField(fallback, undefined, 'balanced', { allowParagraphs: true });

      expect(sanitized).toBeTruthy();
      const violations = validateOptimizationResult({ improvedPrompt: sanitized }, 'hemnet', 120, 500, 'balanced');
      expect(violations.filter((v) => !v.startsWith('För få ord') && !v.startsWith('För många ord') && !v.includes('präglas av'))).toHaveLength(0);
    });
  });

  describe('Rule Violations', () => {
    it('should sanitize forbidden phrases from generated text', () => {
      const cleaned = sanitizeGeneratedMarketingField(
        'Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och här kan du njuta av balkongen.',
        undefined,
        'balanced'
      );

      expect(cleaned).toBeTruthy();
      expect(cleaned?.toLowerCase()).not.toContain('välkommen till');
      expect(cleaned?.toLowerCase()).not.toContain('erbjuder');
      expect(cleaned?.toLowerCase()).not.toContain('här kan du');
    });

    it('should repair embedded "för att" word artifacts before validation', () => {
      const cleaned = sanitizeGeneratedMarketingField(
        'Köket har en sammanhåför attllen utformning med matplats vid fönstret och vardagsrummet får ett naturligt ljusinsläpp.',
        undefined,
        'balanced'
      );

      expect(cleaned).toBeTruthy();
      expect(cleaned).toContain('sammanhållen');
      expect(cleaned).not.toContain('för attllen');

      const violations = validateOptimizationResult({ improvedPrompt: cleaned }, 'hemnet', 1, 500, 'balanced');
      expect(violations.filter((v) => v.includes('för att'))).toHaveLength(0);
    });

    it('should preserve energy class letters and repair mechanical artifact sentences', () => {
      const cleaned = sanitizeGeneratedMarketingField(
        'Fönster har bytts och tilläggsisolering har gjorts. Energiklass är B. Fiber är installerat. Parkering har laddplats för elbil. Kikka ligger nära när det passar med en måltid Buss tar cirka 25 minuter till Slussen.',
        undefined,
        'balanced'
      );

      expect(cleaned).toBeTruthy();
      expect(cleaned).toContain('Bostaden har energiklass B och fiber är installerat.');
      expect(cleaned).toContain('Parkering med laddplats för elbil');
      expect(cleaned).toContain('I samma riktning finns Kikka när det passar att äta ute. Med buss tar det cirka 25 minuter till Slussen');

      const violations = validateOptimizationResult({ improvedPrompt: cleaned }, 'hemnet', 1, 500, 'balanced');
      expect(violations.filter((v) => v.includes('energiklass') || v.includes('Parkering har') || v.includes('meningsgräns') || v.includes('servicefras'))).toHaveLength(0);
    });

    it('should validate AI output quality against the current helper rules', () => {
      const goodOutput = 'Storgatan 12, 3 tr, Linköping. Trea om 76 kvm med balkong i västerläge och kök renoverat 2022.';
      const badOutput = 'Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och en underbar känsla.';

      const goodViolations = validateOptimizationResult({ improvedPrompt: goodOutput }, 'hemnet', 1, 500, 'balanced');
      const badViolations = validateOptimizationResult({ improvedPrompt: badOutput }, 'hemnet', 1, 500, 'balanced');

      expect(goodViolations.filter((v) => !v.startsWith('För få ord') && !v.startsWith('För många ord'))).toHaveLength(0);
      expect(badViolations.length).toBeGreaterThan(0);
    });

    it('should reject a generic Hemnet opening without a strong early detail', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'En trea om 76 kvm. Vardagsrummet har fönster mot gatan. Köket renoverades 2022 med luckor från Ballingslöv. Resecentrum 5 minuter.'
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.some((v) => v.includes('Generisk öppning'))).toBe(true);
    });

    it('should reject a weak Hemnet location ending that reads like a raw place line', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'Storgatan 12, 3 tr, Linköping. Balkong i västerläge ger ett fint extrarum under den varmare delen av året. Köket renoverades 2022 med luckor från Ballingslöv. ICA.'
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.some((v) => v.includes('Svagt lägesslut'))).toBe(true);
    });

    it('should reject a generic or too-thin text as a strong publishable candidate offline', () => {
      const genericThinText = 'En trea om 76 kvm. Kök renoverat 2022. ICA nära.';

      expect(isStrongPublishableCandidate(genericThinText, 'hemnet', 195, 450, 'balanced', 'pro')).toBe(false);
    });

    it('should reject text that is long enough but still reads too generically for the local top-broker gate', () => {
      const longButGenericText = 'Storgatan 12, 3 tr, Linköping. En trea om 76 kvm med gott om plats för vardagens behov. Köket renoverades 2022 och badrummet uppdaterades i samband med detta. Planlösningen är praktisk och vardagsrummet har plats för både soffgrupp och matbord. Sovrummen ligger i den inre delen av bostaden och förvaring finns i flera garderober. Läget ger närhet till service och kommunikationer, vilket gör vardagen smidig. ICA, resecentrum och centrum finns i närheten och området passar många olika köpare. Bostaden håller ett gott skick och ger ett välordnat helhetsintryck utan att sticka ut på något särskilt sätt.';

      expect(isStrongPublishableCandidate(longButGenericText, 'hemnet', 195, 450, 'balanced', 'pro')).toBe(false);
    });
  });

  describe('Structured Data Processing', () => {
    it('should process structured property data correctly', () => {
      const propertyData = {
        propertyType: 'villa',
        address: 'Villagatan 1, Malmö',
        livingArea: 150,
        rooms: 5,
        bedrooms: 3,
        floor: 1,
        buildYear: 1995,
        condition: 'Renoverad',
        energyClass: 'C',
        elevator: false,
        flooring: 'Ekparkett',
        kitchen: 'Modernt kök med ö',
        bathroom: 'Marmorbadrum',
        balconyDirection: 'syd',
        outdoorSize: '20 kvm',
        storage: 'Förråd och garage',
        heating: 'Vattenburen värme',
        parking: 'Dubbelgarage',
        lotArea: 800,
        garden: 'Trädgård med terrass',
        specialFeatures: 'Braskamin',
        uniqueSellingPoints: 'Närhet till skola',
        otherInfo: 'Säljs av mäklare'
      };

      const structured = buildDispositionFromStructuredData(propertyData);

      expect(structured.disposition.property.type).toBe('villa');
      expect(structured.disposition.property.address).toBe('Villagatan 1, Malmö');
      expect(structured.disposition.property.size).toBe(150);
      expect(structured.disposition.property.materials.kitchen).toBe('Modernt kök med ö');
      expect(structured.disposition.location.municipality).toBe('Malmö');
    });

    it('should handle missing optional fields', () => {
      const structured = buildDispositionFromStructuredData({
        propertyType: 'apartment',
        address: 'Lägenhetsvägen 1, Stockholm',
        livingArea: 65,
        rooms: 3,
        floor: 2,
        buildYear: 2018
      });

      expect(structured.disposition.property.type).toBe('lägenhet');
      expect(structured.disposition.property.address).toBe('Lägenhetsvägen 1, Stockholm');
      expect(structured.disposition.property.rooms).toBe(3);
      expect(structured.disposition.property.floor).toBe('2');
    });
  });

  describe('Error Handling', () => {
    it('should return null when sanitizing non-string values', () => {
      expect(sanitizeGeneratedMarketingField(null, undefined, 'balanced')).toBeNull();
      expect(sanitizeGeneratedMarketingField(undefined, undefined, 'balanced')).toBeNull();
    });

    it('should flag disposition-like output as invalid', () => {
      const violations = validateOptimizationResult({
        improvedPrompt: 'OBJEKTDISPOSITION\nAdress: Testgatan 1\nBoarea: 75 kvm\nRum: 3\nAvgift: 2500 kr/mån\nKommunikationer: T-bana'
      }, 'hemnet', 1, 500, 'balanced');

      expect(violations.length).toBeGreaterThan(0);
    });
  });
});
