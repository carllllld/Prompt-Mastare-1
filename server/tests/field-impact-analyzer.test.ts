/**
 * Field Impact Analyzer Tests
 * 
 * Tests for the Field Impact Analyzer module that measures correlation
 * between field completion and text quality.
 */

import { describe, it, expect } from 'vitest';
import { createFieldImpactAnalyzer } from '../lib/field-impact-analyzer';
import type {
  FormSubmission,
  GeneratedText,
  QualityScore,
  FieldImpactMetrics,
} from '../lib/field-impact-analyzer';

describe('Field Impact Analyzer', () => {
  const analyzer = createFieldImpactAnalyzer();

  describe('analyzeFieldImpact', () => {
    it('should return empty array for empty submissions', () => {
      const result = analyzer.analyzeFieldImpact([], [], []);
      expect(result).toEqual([]);
    });

    it('should calculate fill rate correctly', () => {
      const submissions: FormSubmission[] = [
        {
          id: 's1',
          userId: 'u1',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          fieldData: { address: 'Street 1', price: 5000000 },
          chipSelections: {},
        },
        {
          id: 's2',
          userId: 'u2',
          timestamp: new Date(),
          propertyType: 'house',
          platform: 'booli',
          fieldData: { address: 'Street 2' }, // price not filled
          chipSelections: {},
        },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, [], []);

      
      const addressMetric = result.find(m => m.fieldName === 'address');
      const priceMetric = result.find(m => m.fieldName === 'price');
      
      expect(addressMetric?.fillRate).toBe(100); // filled in 2/2 submissions
      expect(priceMetric?.fillRate).toBe(50); // filled in 1/2 submissions
    });

    it('should calculate appearance rate correctly', () => {
      const submissions: FormSubmission[] = [
        {
          id: 's1',
          userId: 'u1',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          fieldData: { address: 'Street 1', price: 5000000 },
          chipSelections: {},
          generatedTextId: 't1',
        },
        {
          id: 's2',
          userId: 'u2',
          timestamp: new Date(),
          propertyType: 'house',
          platform: 'booli',
          fieldData: { address: 'Street 2', price: 6000000 },
          chipSelections: {},
          generatedTextId: 't2',
        },
      ];

      const generatedTexts: GeneratedText[] = [
        {
          id: 't1',
          submissionId: 's1',
          mainText: 'Property at Street 1...',
          headline: 'Great apartment',
          socialPost: 'Check this out',
          qualityScore: 85,
          fieldDataUsed: ['address', 'price'],
        },
        {
          id: 't2',
          submissionId: 's2',
          mainText: 'Property at Street 2...',
          headline: 'Nice house',
          socialPost: 'Amazing',
          qualityScore: 90,
          fieldDataUsed: ['address'], // price not used
        },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, generatedTexts, []);
      
      const addressMetric = result.find(m => m.fieldName === 'address');
      const priceMetric = result.find(m => m.fieldName === 'price');
      
      expect(addressMetric?.appearanceRate).toBe(100); // appears in 2/2 texts
      expect(priceMetric?.appearanceRate).toBe(50); // appears in 1/2 texts
    });

    it('should calculate Pearson correlation correctly', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { kitchen: 'Modern kitchen' }, chipSelections: {}, generatedTextId: 't1' },
        { id: 's2', userId: 'u2', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: {}, chipSelections: {}, generatedTextId: 't2' },
        { id: 's3', userId: 'u3', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { kitchen: 'Renovated' }, chipSelections: {}, generatedTextId: 't3' },
        { id: 's4', userId: 'u4', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: {}, chipSelections: {}, generatedTextId: 't4' },
      ];

      const generatedTexts: GeneratedText[] = [
        { id: 't1', submissionId: 's1', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 90, fieldDataUsed: ['kitchen'] },
        { id: 't2', submissionId: 's2', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 60, fieldDataUsed: [] },
        { id: 't3', submissionId: 's3', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 85, fieldDataUsed: ['kitchen'] },
        { id: 't4', submissionId: 's4', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 55, fieldDataUsed: [] },
      ];

      const qualityScores: QualityScore[] = [
        { textId: 't1', overallScore: 90, brokerRealism: 90, factualAccuracy: 90, readability: 90, forbiddenPhrasesPenalty: 0 },
        { textId: 't2', overallScore: 60, brokerRealism: 60, factualAccuracy: 60, readability: 60, forbiddenPhrasesPenalty: 0 },
        { textId: 't3', overallScore: 85, brokerRealism: 85, factualAccuracy: 85, readability: 85, forbiddenPhrasesPenalty: 0 },
        { textId: 't4', overallScore: 55, brokerRealism: 55, factualAccuracy: 55, readability: 55, forbiddenPhrasesPenalty: 0 },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, generatedTexts, qualityScores);
      const kitchenMetric = result.find(m => m.fieldName === 'kitchen');
      
      expect(kitchenMetric).toBeDefined();
      expect(kitchenMetric?.qualityCorrelation).toBeGreaterThan(0.8); // Strong positive correlation
    });

    it('should calculate composite impact score using weighted formula', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { testField: 'value' }, chipSelections: {}, generatedTextId: 't1' },
      ];

      const generatedTexts: GeneratedText[] = [
        { id: 't1', submissionId: 's1', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 80, fieldDataUsed: ['testField'] },
      ];

      const qualityScores: QualityScore[] = [
        { textId: 't1', overallScore: 80, brokerRealism: 80, factualAccuracy: 80, readability: 80, forbiddenPhrasesPenalty: 0 },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, generatedTexts, qualityScores);
      const metric = result.find(m => m.fieldName === 'testField');
      
      expect(metric).toBeDefined();
      // fillRate=100, appearanceRate=100, qualityCorrelation≈0 (only 1 data point)
      // impactScore = (100 * 0.3) + (100 * 0.4) + (0 * 0.3) = 70
      expect(metric?.impactScore).toBeCloseTo(70, 0);
    });

    it('should categorize fields as high/medium/low impact', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { highField: 'val', medField: 'val', lowField: 'val' }, chipSelections: {}, generatedTextId: 't1' },
        { id: 's2', userId: 'u2', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { highField: 'val', medField: 'val' }, chipSelections: {}, generatedTextId: 't2' },
      ];

      const generatedTexts: GeneratedText[] = [
        { id: 't1', submissionId: 's1', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 90, fieldDataUsed: ['highField', 'medField'] },
        { id: 't2', submissionId: 's2', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 85, fieldDataUsed: ['highField'] },
      ];

      const qualityScores: QualityScore[] = [
        { textId: 't1', overallScore: 90, brokerRealism: 90, factualAccuracy: 90, readability: 90, forbiddenPhrasesPenalty: 0 },
        { textId: 't2', overallScore: 85, brokerRealism: 85, factualAccuracy: 85, readability: 85, forbiddenPhrasesPenalty: 0 },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, generatedTexts, qualityScores);
      
      const highField = result.find(m => m.fieldName === 'highField');
      const medField = result.find(m => m.fieldName === 'medField');
      const lowField = result.find(m => m.fieldName === 'lowField');
      
      // highField: fillRate=100, appearanceRate=100 → high impact
      expect(highField?.category).toBe('high_impact');
      
      // medField: fillRate=100, appearanceRate=50 → medium impact
      expect(medField?.category).toBe('medium_impact');
      
      // lowField: fillRate=50, appearanceRate=0 → low impact
      expect(lowField?.category).toBe('low_impact');
    });

    it('should handle submissions without generated texts', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { address: 'Street 1' }, chipSelections: {} },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, [], []);
      
      expect(result).toHaveLength(1);
      expect(result[0].fieldName).toBe('address');
      expect(result[0].fillRate).toBe(100);
      expect(result[0].appearanceRate).toBe(0); // no texts to appear in
      expect(result[0].qualityCorrelation).toBe(0); // no quality data
    });

    it('should identify high fill low appearance fields', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { unusedField: 'value1' }, chipSelections: {}, generatedTextId: 't1' },
        { id: 's2', userId: 'u2', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { unusedField: 'value2' }, chipSelections: {}, generatedTextId: 't2' },
        { id: 's3', userId: 'u3', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { unusedField: 'value3' }, chipSelections: {}, generatedTextId: 't3' },
      ];

      const generatedTexts: GeneratedText[] = [
        { id: 't1', submissionId: 's1', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 80, fieldDataUsed: [] }, // unusedField not used
        { id: 't2', submissionId: 's2', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 82, fieldDataUsed: [] },
        { id: 't3', submissionId: 's3', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 81, fieldDataUsed: [] },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, generatedTexts, []);
      const metric = result.find(m => m.fieldName === 'unusedField');
      
      expect(metric?.fillRate).toBe(100); // filled in all submissions
      expect(metric?.appearanceRate).toBe(0); // never appears in texts
      expect(metric?.category).toBe('low_impact');
    });
  });

  describe('identifyHighImpactFields', () => {

    it('should identify fields with impact score >70', () => {
      const metrics: FieldImpactMetrics[] = [
        { fieldName: 'highField1', fillRate: 90, appearanceRate: 95, qualityCorrelation: 0.8, impactScore: 85, category: 'high_impact' },
        { fieldName: 'highField2', fillRate: 85, appearanceRate: 90, qualityCorrelation: 0.7, impactScore: 78, category: 'high_impact' },
        { fieldName: 'medField', fillRate: 60, appearanceRate: 65, qualityCorrelation: 0.3, impactScore: 55, category: 'medium_impact' },
        { fieldName: 'lowField', fillRate: 30, appearanceRate: 25, qualityCorrelation: 0.1, impactScore: 25, category: 'low_impact' },
      ];

      const result = analyzer.identifyHighImpactFields(metrics);
      
      expect(result).toHaveLength(2);
      expect(result).toContain('highField1');
      expect(result).toContain('highField2');
      expect(result).not.toContain('medField');
      expect(result).not.toContain('lowField');
    });

    it('should return empty array when no high-impact fields', () => {
      const metrics: FieldImpactMetrics[] = [
        { fieldName: 'field1', fillRate: 50, appearanceRate: 50, qualityCorrelation: 0.2, impactScore: 45, category: 'medium_impact' },
      ];

      const result = analyzer.identifyHighImpactFields(metrics);
      expect(result).toEqual([]);
    });
  });

  describe('identifyLowImpactFields', () => {
    it('should identify fields with impact score <40', () => {
      const metrics: FieldImpactMetrics[] = [
        { fieldName: 'highField', fillRate: 90, appearanceRate: 95, qualityCorrelation: 0.8, impactScore: 85, category: 'high_impact' },
        { fieldName: 'medField', fillRate: 60, appearanceRate: 65, qualityCorrelation: 0.3, impactScore: 55, category: 'medium_impact' },
        { fieldName: 'lowField1', fillRate: 30, appearanceRate: 25, qualityCorrelation: 0.1, impactScore: 25, category: 'low_impact' },
        { fieldName: 'lowField2', fillRate: 20, appearanceRate: 15, qualityCorrelation: 0.0, impactScore: 15, category: 'low_impact' },
      ];

      const result = analyzer.identifyLowImpactFields(metrics);
      
      expect(result).toHaveLength(2);
      expect(result).toContain('lowField1');
      expect(result).toContain('lowField2');
      expect(result).not.toContain('highField');
      expect(result).not.toContain('medField');
    });

    it('should return empty array when no low-impact fields', () => {
      const metrics: FieldImpactMetrics[] = [
        { fieldName: 'field1', fillRate: 70, appearanceRate: 75, qualityCorrelation: 0.5, impactScore: 65, category: 'medium_impact' },
      ];

      const result = analyzer.identifyLowImpactFields(metrics);
      expect(result).toEqual([]);
    });
  });

  describe('validatePriorityAlignment', () => {
    it('should validate that critical fields have high impact scores', () => {
      const priorityFields = ['address', 'livingArea', 'kitchen'];
      const metrics: FieldImpactMetrics[] = [
        { fieldName: 'address', fillRate: 95, appearanceRate: 98, qualityCorrelation: 0.9, impactScore: 88, category: 'high_impact' },
        { fieldName: 'livingArea', fillRate: 90, appearanceRate: 95, qualityCorrelation: 0.85, impactScore: 85, category: 'high_impact' },
        { fieldName: 'kitchen', fillRate: 85, appearanceRate: 90, qualityCorrelation: 0.8, impactScore: 82, category: 'high_impact' },
      ];

      const result = analyzer.validatePriorityAlignment(priorityFields, metrics);
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should flag critical fields with low impact scores', () => {
      const priorityFields = ['address', 'unusedField'];
      const metrics: FieldImpactMetrics[] = [
        { fieldName: 'address', fillRate: 95, appearanceRate: 98, qualityCorrelation: 0.9, impactScore: 88, category: 'high_impact' },
        { fieldName: 'unusedField', fillRate: 80, appearanceRate: 20, qualityCorrelation: 0.1, impactScore: 35, category: 'low_impact' },
      ];

      const result = analyzer.validatePriorityAlignment(priorityFields, metrics);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain('unusedField');
      expect(result.issues[0]).toContain('low impact score');
    });

    it('should warn about priority fields without metrics', () => {
      const priorityFields = ['address', 'missingField'];
      const metrics: FieldImpactMetrics[] = [
        { fieldName: 'address', fillRate: 95, appearanceRate: 98, qualityCorrelation: 0.9, impactScore: 88, category: 'high_impact' },
      ];

      const result = analyzer.validatePriorityAlignment(priorityFields, metrics);
      
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('missingField');
      expect(result.warnings[0]).toContain('no impact metrics');
    });
  });

  describe('Pearson correlation edge cases', () => {
    it('should handle perfect positive correlation', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { field: 'val' }, chipSelections: {}, generatedTextId: 't1' },
        { id: 's2', userId: 'u2', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: {}, chipSelections: {}, generatedTextId: 't2' },
      ];

      const generatedTexts: GeneratedText[] = [
        { id: 't1', submissionId: 's1', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 100, fieldDataUsed: ['field'] },
        { id: 't2', submissionId: 's2', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 50, fieldDataUsed: [] },
      ];

      const qualityScores: QualityScore[] = [
        { textId: 't1', overallScore: 100, brokerRealism: 100, factualAccuracy: 100, readability: 100, forbiddenPhrasesPenalty: 0 },
        { textId: 't2', overallScore: 50, brokerRealism: 50, factualAccuracy: 50, readability: 50, forbiddenPhrasesPenalty: 0 },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, generatedTexts, qualityScores);
      const metric = result.find(m => m.fieldName === 'field');
      
      expect(metric?.qualityCorrelation).toBeCloseTo(1.0, 1);
    });

    it('should handle zero variance (all same values)', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { field: 'val' }, chipSelections: {}, generatedTextId: 't1' },
        { id: 's2', userId: 'u2', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { field: 'val' }, chipSelections: {}, generatedTextId: 't2' },
      ];

      const generatedTexts: GeneratedText[] = [
        { id: 't1', submissionId: 's1', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 80, fieldDataUsed: ['field'] },
        { id: 't2', submissionId: 's2', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 85, fieldDataUsed: ['field'] },
      ];

      const qualityScores: QualityScore[] = [
        { textId: 't1', overallScore: 80, brokerRealism: 80, factualAccuracy: 80, readability: 80, forbiddenPhrasesPenalty: 0 },
        { textId: 't2', overallScore: 85, brokerRealism: 85, factualAccuracy: 85, readability: 85, forbiddenPhrasesPenalty: 0 },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, generatedTexts, qualityScores);
      const metric = result.find(m => m.fieldName === 'field');
      
      // Zero variance in field completion (all filled) → correlation = 0
      expect(metric?.qualityCorrelation).toBe(0);
    });
  });

  describe('Impact score calculation', () => {
    it('should weight appearance rate highest (0.4)', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { field: 'val' }, chipSelections: {}, generatedTextId: 't1' },
      ];

      const generatedTexts: GeneratedText[] = [
        { id: 't1', submissionId: 's1', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 80, fieldDataUsed: ['field'] },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, generatedTexts, []);
      const metric = result.find(m => m.fieldName === 'field');
      
      // fillRate=100, appearanceRate=100, qualityCorrelation=0 (single point)
      // impactScore = (100 * 0.3) + (100 * 0.4) + (0 * 0.3) = 30 + 40 + 0 = 70
      expect(metric?.impactScore).toBeCloseTo(70, 0);
    });

    it('should handle negative correlations as zero impact', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { field: 'val' }, chipSelections: {}, generatedTextId: 't1' },
        { id: 's2', userId: 'u2', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: {}, chipSelections: {}, generatedTextId: 't2' },
      ];

      const generatedTexts: GeneratedText[] = [
        { id: 't1', submissionId: 's1', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 50, fieldDataUsed: ['field'] },
        { id: 't2', submissionId: 's2', mainText: 'text', headline: 'h', socialPost: 's', qualityScore: 90, fieldDataUsed: [] },
      ];

      const qualityScores: QualityScore[] = [
        { textId: 't1', overallScore: 50, brokerRealism: 50, factualAccuracy: 50, readability: 50, forbiddenPhrasesPenalty: 0 },
        { textId: 't2', overallScore: 90, brokerRealism: 90, factualAccuracy: 90, readability: 90, forbiddenPhrasesPenalty: 0 },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, generatedTexts, qualityScores);
      const metric = result.find(m => m.fieldName === 'field');
      
      // Negative correlation (field filled → lower quality)
      expect(metric?.qualityCorrelation).toBeLessThan(0);
      // But impact score should not be negative (negative correlation treated as 0)
      expect(metric?.impactScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Field value type handling', () => {
    it('should handle string fields', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { text: 'value', empty: '', whitespace: '   ' }, chipSelections: {} },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, [], []);
      
      expect(result.find(m => m.fieldName === 'text')?.fillRate).toBe(100);
      expect(result.find(m => m.fieldName === 'empty')?.fillRate).toBe(0);
      expect(result.find(m => m.fieldName === 'whitespace')?.fillRate).toBe(0);
    });

    it('should handle number fields', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { price: 5000000, zero: 0 }, chipSelections: {} },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, [], []);
      
      expect(result.find(m => m.fieldName === 'price')?.fillRate).toBe(100);
      expect(result.find(m => m.fieldName === 'zero')?.fillRate).toBe(100); // 0 is a valid value
    });

    it('should handle boolean fields', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { hasBalcony: true, hasGarden: false }, chipSelections: {} },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, [], []);
      
      expect(result.find(m => m.fieldName === 'hasBalcony')?.fillRate).toBe(100);
      expect(result.find(m => m.fieldName === 'hasGarden')?.fillRate).toBe(100); // false is a valid value
    });

    it('should handle array fields', () => {
      const submissions: FormSubmission[] = [
        { id: 's1', userId: 'u1', timestamp: new Date(), propertyType: 'apartment', platform: 'hemnet', fieldData: { chips: ['a', 'b'], empty: [] }, chipSelections: {} },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, [], []);
      
      expect(result.find(m => m.fieldName === 'chips')?.fillRate).toBe(100);
      expect(result.find(m => m.fieldName === 'empty')?.fillRate).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle realistic form submission data', () => {
      const submissions: FormSubmission[] = [
        {
          id: 's1',
          userId: 'u1',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          fieldData: {
            address: 'Storgatan 1, Stockholm',
            livingArea: 75,
            totalRooms: 3,
            price: 4500000,
            monthlyFee: 3500,
            kitchenDescription: 'Renoverat kök med köksö',
            balconyArea: 8,
          },
          chipSelections: {
            kitchen: ['Renoverat kök', 'Köksö'],
            flooring: ['Ekparkett'],
          },
          generatedTextId: 't1',
        },
        {
          id: 's2',
          userId: 'u2',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          fieldData: {
            address: 'Kungsgatan 5, Göteborg',
            livingArea: 60,
            totalRooms: 2,
            price: 3200000,
            monthlyFee: 2800,
            // No kitchen description
          },
          chipSelections: {
            flooring: ['Originalparkett'],
          },
          generatedTextId: 't2',
        },
      ];

      const generatedTexts: GeneratedText[] = [
        {
          id: 't1',
          submissionId: 's1',
          mainText: 'Välkommen till Storgatan 1...',
          headline: 'Trerummare på Storgatan',
          socialPost: 'Kolla in denna lägenhet!',
          qualityScore: 92,
          fieldDataUsed: ['address', 'livingArea', 'totalRooms', 'price', 'kitchenDescription', 'balconyArea'],
        },
        {
          id: 't2',
          submissionId: 's2',
          mainText: 'Välkommen till Kungsgatan 5...',
          headline: 'Tvårummare på Kungsgatan',
          socialPost: 'Fin lägenhet!',
          qualityScore: 78,
          fieldDataUsed: ['address', 'livingArea', 'totalRooms', 'price'],
        },
      ];

      const qualityScores: QualityScore[] = [
        { textId: 't1', overallScore: 92, brokerRealism: 90, factualAccuracy: 95, readability: 90, forbiddenPhrasesPenalty: 0 },
        { textId: 't2', overallScore: 78, brokerRealism: 75, factualAccuracy: 80, readability: 80, forbiddenPhrasesPenalty: 0 },
      ];

      const result = analyzer.analyzeFieldImpact(submissions, generatedTexts, qualityScores);
      
      expect(result.length).toBeGreaterThan(0);
      
      // Address should have high impact (always filled, always appears)
      const addressMetric = result.find(m => m.fieldName === 'address');
      expect(addressMetric?.fillRate).toBe(100);
      expect(addressMetric?.appearanceRate).toBe(100);
      expect(addressMetric?.category).toBe('high_impact');
      
      // Kitchen description should show medium impact (50% fill, 50% appearance)
      const kitchenMetric = result.find(m => m.fieldName === 'kitchenDescription');
      expect(kitchenMetric?.fillRate).toBe(50);
      expect(kitchenMetric?.appearanceRate).toBe(50);
    });
  });
});
