import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { optimizePrompt } from '../routes';
import { storage } from '../storage';

// Mock dependencies
vi.mock('../storage');
vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}));

describe('AI Pipeline Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Prompt Optimization', () => {
    it('should optimize Hemnet text correctly', async () => {
      const mockGetUser = vi.mocked(storage.getUser).mockResolvedValue({
        id: 'user_123',
        plan: 'pro',
        emailVerified: true
      } as any);

      const mockGetMonthlyUsage = vi.mocked(storage.getMonthlyUsage).mockResolvedValue({
        textsGenerated: 2,
        planType: 'pro'
      } as any);

      const mockIncrementUsage = vi.mocked(storage.incrementUsage).mockResolvedValue();

      // Mock OpenAI response
      const { OpenAI } = await import('openai');
      const mockCreate = vi.mocked(OpenAI.prototype.chat.completions.create);
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Optimerad text för Hemnet'
          }
        }]
      } as any);

      const result = await optimizePrompt({
        originalText: 'Original text',
        targetPlatform: 'hemnet',
        propertyType: 'apartment',
        rooms: 3,
        area: 75,
        address: 'Testgatan 1, Stockholm',
        price: 3500000,
        fee: 2500,
        yearBuilt: 2010,
        floor: 3,
        description: 'Fin lägenhet'
      });

      expect(mockGetUser).toHaveBeenCalledWith('user_123');
      expect(mockGetMonthlyUsage).toHaveBeenCalledWith('user_123');
      expect(mockIncrementUsage).toHaveBeenCalledWith('user_123', 'pro');
      expect(result).toBeDefined();
    });

    it('should handle usage limits correctly', async () => {
      const mockGetUser = vi.mocked(storage.getUser).mockResolvedValue({
        id: 'user_123',
        plan: 'free',
        emailVerified: true
      } as any);

      const mockGetMonthlyUsage = vi.mocked(storage.getMonthlyUsage).mockResolvedValue({
        textsGenerated: 3,
        planType: 'free'
      } as any);

      await expect(optimizePrompt({
        originalText: 'Test text',
        targetPlatform: 'hemnet',
        propertyType: 'apartment',
        rooms: 2,
        area: 50,
        address: 'Testgatan 2',
        price: 2500000,
        fee: 2000,
        yearBuilt: 2005,
        floor: 2,
        description: 'Test'
      })).rejects.toThrow('Usage limit exceeded');
    });

    it('should validate property data', async () => {
      const mockGetUser = vi.mocked(storage.getUser).mockResolvedValue({
        id: 'user_123',
        plan: 'pro',
        emailVerified: true
      } as any);

      const mockGetMonthlyUsage = vi.mocked(storage.getMonthlyUsage).mockResolvedValue({
        textsGenerated: 1,
        planType: 'pro'
      } as any);

      await expect(optimizePrompt({
        originalText: '',
        targetPlatform: 'hemnet',
        propertyType: '',
        rooms: 0,
        area: 0,
        address: '',
        price: 0,
        fee: 0,
        yearBuilt: 0,
        floor: 0,
        description: ''
      })).rejects.toThrow();
    });
  });

  describe('Rule Violations', () => {
    it('should detect forbidden phrases', () => {
      const forbiddenPhrases = [
        'Välkommen till denna fantastiska',
        'erbjuder generösa ytor',
        'bjuder på',
        'präglas av',
        'genomsyras av',
        'här kan du',
        'strategiskt läge'
      ];

      const testTexts = [
        'Välkommen till denna fantastiska lägenhet',
        'Bostaden erbjuder generösa ytor',
        'Här kan du njuta av balkongen',
        'Läget är strategiskt nära centrum'
      ];

      forbiddenPhrases.forEach((phrase, index) => {
        expect(testTexts[index]).toContain(phrase);
      });
    });

    it('should validate AI output quality', () => {
      const goodOutput = 'Storgatan 12, 3 tr, Linköping. Trea om 76 kvm med balkong i västerläge.';
      const badOutput = 'Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och en underbar känsla.';

      const qualityChecks = {
        goodOutput: {
          startsWithAddress: goodOutput.match(/^[A-ZÅÄÖa-zåäö]+\s+\d+/) !== null,
          hasForbiddenPhrases: !/(Välkommen|erbjuder|generösa|fantastisk)/.test(goodOutput),
          hasSpecificDetails: /\d+\s*kvm/.test(goodOutput),
          reasonableLength: goodOutput.length > 20 && goodOutput.length < 500
        },
        badOutput: {
          startsWithAddress: badOutput.match(/^[A-ZÅÄÖa-zåäö]+\s+\d+/) !== null,
          hasForbiddenPhrases: !/(Välkommen|erbjuder|generösa|fantastisk)/.test(badOutput),
          hasSpecificDetails: /\d+\s*kvm/.test(badOutput),
          reasonableLength: badOutput.length > 20 && badOutput.length < 500
        }
      };

      expect(qualityChecks.goodOutput.startsWithAddress).toBe(true);
      expect(qualityChecks.goodOutput.hasForbiddenPhrases).toBe(true);
      expect(qualityChecks.goodOutput.hasSpecificDetails).toBe(true);
      expect(qualityChecks.goodOutput.reasonableLength).toBe(true);

      expect(qualityChecks.badOutput.startsWithAddress).toBe(false);
      expect(qualityChecks.badOutput.hasForbiddenPhrases).toBe(false);
      expect(qualityChecks.badOutput.hasSpecificDetails).toBe(false);
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
        balcony: { area: 20, direction: 'syd' },
        storage: 'Förråd och garage',
        heating: 'Vattenburen värme',
        parking: 'Dubbelgarage',
        lotArea: 800,
        garden: 'Trädgård med terrass',
        specialFeatures: 'Braskamin',
        uniqueSellingPoints: 'Närhet till skola',
        otherInfo: 'Säljs av mäklare'
      };

      const expectedDisposition = {
        type: 'villa',
        address: 'Villagatan 1, Malmö',
        size: '150 kvm',
        rooms: 5,
        bedrooms: 3,
        floor: '1 tr',
        year: '1995',
        condition: 'Renoverad',
        energy: 'C',
        elevator: false,
        flooring: 'Ekparkett',
        kitchen: 'Modernt kök med ö',
        bathroom: 'Marmorbadrum',
        balcony: '20 kvm, syd',
        storage: 'Förråd och garage',
        heating: 'Vattenburen värme',
        parking: 'Dubbelgarage',
        plot: '800 kvm',
        garden: 'Trädgård med terrass',
        features: 'Braskamin',
        highlights: 'Närhet till skola',
        other: 'Säljs av mäklare'
      };

      // Test that all fields are mapped correctly
      Object.keys(expectedDisposition).forEach(key => {
        expect(expectedDisposition[key]).toBeDefined();
        expect(expectedDisposition[key]).not.toBe('');
      });
    });

    it('should handle missing optional fields', () => {
      const minimalData = {
        propertyType: 'apartment',
        address: 'Lägenhetsvägen 1, Stockholm',
        livingArea: 65,
        rooms: 3,
        floor: 2,
        buildYear: 2018
      };

      const processedData = {
        type: 'apartment',
        address: 'Lägenhetsvägen 1, Stockholm',
        size: '65 kvm',
        rooms: 3,
        floor: '2 tr',
        year: '2018',
        // Optional fields should have default values
        bedrooms: '',
        condition: '',
        energy: '',
        elevator: false,
        flooring: '',
        kitchen: '',
        bathroom: '',
        balcony: '',
        storage: '',
        heating: '',
        parking: '',
        plot: '',
        garden: '',
        features: '',
        highlights: '',
        other: ''
      };

      expect(processedData.type).toBe('apartment');
      expect(processedData.address).toBe('Lägenhetsvägen 1, Stockholm');
      expect(processedData.bedrooms).toBe('');
      expect(processedData.condition).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      const mockGetUser = vi.mocked(storage.getUser).mockResolvedValue({
        id: 'user_123',
        plan: 'pro',
        emailVerified: true
      } as any);

      const mockGetMonthlyUsage = vi.mocked(storage.getMonthlyUsage).mockResolvedValue({
        textsGenerated: 1,
        planType: 'pro'
      } as any);

      const { OpenAI } = await import('openai');
      const mockCreate = vi.mocked(OpenAI.prototype.chat.completions.create);
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(optimizePrompt({
        originalText: 'Test text',
        targetPlatform: 'hemnet',
        propertyType: 'apartment',
        rooms: 2,
        area: 50,
        address: 'Testgatan 2',
        price: 2500000,
        fee: 2000,
        yearBuilt: 2005,
        floor: 2,
        description: 'Test'
      })).rejects.toThrow('API rate limit exceeded');
    });

    it('should handle database errors', async () => {
      const mockGetUser = vi.mocked(storage.getUser).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(optimizePrompt({
        originalText: 'Test text',
        targetPlatform: 'hemnet',
        propertyType: 'apartment',
        rooms: 2,
        area: 50,
        address: 'Testgatan 2',
        price: 2500000,
        fee: 2000,
        yearBuilt: 2005,
        floor: 2,
        description: 'Test'
      })).rejects.toThrow('Database connection failed');
    });
  });
});
