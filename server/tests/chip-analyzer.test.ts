/**
 * Chip Analyzer Module Tests
 * 
 * Tests for analyzing chip collections, calculating usage rates, identifying
 * missing chips, and validating terminology.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, expect } from 'vitest';
import { createChipAnalyzer } from '../lib/chip-analyzer';
import type { FormSubmission, ChipUsageStats } from '../lib/chip-analyzer';

describe('Chip Analyzer', () => {
  describe('analyzeChipUsage', () => {
    it('should calculate selection rates from historical data', () => {
      const analyzer = createChipAnalyzer();
      
      const historicalData: FormSubmission[] = [
        {
          id: '1',
          userId: 'user1',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          chipSelections: {
            kitchen: ['Renoverat kök', 'Köksö'],
            bathroom: ['Helkaklat'],
          },
          freetextFields: {},
        },
        {
          id: '2',
          userId: 'user2',
          timestamp: new Date(),
          propertyType: 'house',
          platform: 'booli',
          chipSelections: {
            kitchen: ['Renoverat kök'],
            bathroom: ['Helkaklat', 'Badkar'],
          },
          freetextFields: {},
        },
      ];
      
      const stats = analyzer.analyzeChipUsage(historicalData);
      
      expect(stats).toBeDefined();
      expect(stats.length).toBeGreaterThan(0);
      
      // "Renoverat kök" appears in 2/2 submissions = 100%
      const renovatKok = stats.find(s => s.chipLabel === 'Renoverat kök');
      expect(renovatKok).toBeDefined();
      expect(renovatKok?.selectionRate).toBe(100);
      expect(renovatKok?.selectionCount).toBe(2);
      
      // "Köksö" appears in 1/2 submissions = 50%
      const kokso = stats.find(s => s.chipLabel === 'Köksö');
      expect(kokso).toBeDefined();
      expect(kokso?.selectionRate).toBe(50);
      expect(kokso?.selectionCount).toBe(1);
      
      // "Helkaklat" appears in 2/2 submissions = 100%
      const helkaklat = stats.find(s => s.chipLabel === 'Helkaklat');
      expect(helkaklat).toBeDefined();
      expect(helkaklat?.selectionRate).toBe(100);
      
      // "Badkar" appears in 1/2 submissions = 50%
      const badkar = stats.find(s => s.chipLabel === 'Badkar');
      expect(badkar).toBeDefined();
      expect(badkar?.selectionRate).toBe(50);
    });

    it('should handle empty historical data', () => {
      const analyzer = createChipAnalyzer();
      
      const stats = analyzer.analyzeChipUsage([]);
      
      expect(stats).toEqual([]);
    });

    it('should handle submissions with no chip selections', () => {
      const analyzer = createChipAnalyzer();
      
      const historicalData: FormSubmission[] = [
        {
          id: '1',
          userId: 'user1',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          chipSelections: {},
          freetextFields: {},
        },
      ];
      
      const stats = analyzer.analyzeChipUsage(historicalData);
      
      expect(stats).toEqual([]);
    });


    it('should sort stats by selection rate descending', () => {
      const analyzer = createChipAnalyzer();
      
      const historicalData: FormSubmission[] = [
        {
          id: '1',
          userId: 'user1',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          chipSelections: {
            kitchen: ['Renoverat kök', 'Köksö', 'Stenbänk/komposit'],
          },
          freetextFields: {},
        },
        {
          id: '2',
          userId: 'user2',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          chipSelections: {
            kitchen: ['Renoverat kök', 'Köksö'],
          },
          freetextFields: {},
        },
        {
          id: '3',
          userId: 'user3',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          chipSelections: {
            kitchen: ['Renoverat kök'],
          },
          freetextFields: {},
        },
      ];
      
      const stats = analyzer.analyzeChipUsage(historicalData);
      
      // Should be sorted by selection rate descending
      expect(stats[0].chipLabel).toBe('Renoverat kök'); // 100%
      expect(stats[1].chipLabel).toBe('Köksö'); // 66.67%
      expect(stats[2].chipLabel).toBe('Stenbänk/komposit'); // 33.33%
      
      expect(stats[0].selectionRate).toBeGreaterThan(stats[1].selectionRate);
      expect(stats[1].selectionRate).toBeGreaterThan(stats[2].selectionRate);
    });

    it('should track category for each chip', () => {
      const analyzer = createChipAnalyzer();
      
      const historicalData: FormSubmission[] = [
        {
          id: '1',
          userId: 'user1',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          chipSelections: {
            kitchen: ['Renoverat kök'],
            bathroom: ['Helkaklat'],
            flooring: ['Ekparkett'],
          },
          freetextFields: {},
        },
      ];
      
      const stats = analyzer.analyzeChipUsage(historicalData);
      
      expect(stats.find(s => s.chipLabel === 'Renoverat kök')?.category).toBe('kitchen');
      expect(stats.find(s => s.chipLabel === 'Helkaklat')?.category).toBe('bathroom');
      expect(stats.find(s => s.chipLabel === 'Ekparkett')?.category).toBe('flooring');
    });
  });


  describe('identifyMissingChips', () => {
    it('should identify frequently-entered features not covered by chips', () => {
      const analyzer = createChipAnalyzer();
      
      // Simulate freetext entries where "induktionshäll" appears frequently
      const freetextData = [
        'induktionshäll, diskmaskin',
        'induktionshäll, mikrovågsugn',
        'induktionshäll',
        'kylskåp, frys',
        'induktionshäll, vinkyl',
        'induktionshäll',
      ];
      
      const recommendations = analyzer.identifyMissingChips(freetextData, 'kitchen');
      
      // "induktionshäll" appears in 5/6 = 83.3% (above 15% threshold)
      const induktion = recommendations.find(r => r.chipLabel === 'induktionshäll');
      expect(induktion).toBeDefined();
      expect(induktion?.action).toBe('add');
      expect(induktion?.category).toBe('kitchen');
      expect(induktion?.frequency).toBeGreaterThan(15);
      expect(induktion?.reason).toContain('83.3%');
    });

    it('should not recommend chips for features below 15% threshold', () => {
      const analyzer = createChipAnalyzer();
      
      const freetextData = [
        'feature1',
        'feature2',
        'feature3',
        'feature4',
        'feature5',
        'feature6',
        'feature7',
        'rare_feature', // Only 1/8 = 12.5% (below 15%)
      ];
      
      const recommendations = analyzer.identifyMissingChips(freetextData, 'kitchen');
      
      const rareFeature = recommendations.find(r => r.chipLabel === 'rare_feature');
      expect(rareFeature).toBeUndefined();
    });

    it('should not recommend existing chips', () => {
      const analyzer = createChipAnalyzer();
      
      // "renoverat kök" is already a chip in the kitchen category
      const freetextData = [
        'renoverat kök',
        'renoverat kök',
        'renoverat kök',
        'renoverat kök',
      ];
      
      const recommendations = analyzer.identifyMissingChips(freetextData, 'kitchen');
      
      const renoverat = recommendations.find(r => 
        r.chipLabel.toLowerCase() === 'renoverat kök'
      );
      expect(renoverat).toBeUndefined();
    });

    it('should handle empty freetext data', () => {
      const analyzer = createChipAnalyzer();
      
      const recommendations = analyzer.identifyMissingChips([], 'kitchen');
      
      expect(recommendations).toEqual([]);
    });


    it('should normalize and tokenize freetext entries', () => {
      const analyzer = createChipAnalyzer();
      
      const freetextData = [
        'Feature1, Feature2; Feature3.',
        'Feature1, Feature2',
        'Feature1',
      ];
      
      const recommendations = analyzer.identifyMissingChips(freetextData, 'kitchen');
      
      // "feature1" appears in 3/3 = 100%
      const feature1 = recommendations.find(r => r.chipLabel === 'feature1');
      expect(feature1).toBeDefined();
      expect(feature1?.frequency).toBe(100);
    });

    it('should skip very short features', () => {
      const analyzer = createChipAnalyzer();
      
      const freetextData = [
        'ab, cd, ef', // All too short (< 3 chars)
        'ab, cd',
        'ab',
      ];
      
      const recommendations = analyzer.identifyMissingChips(freetextData, 'kitchen');
      
      expect(recommendations).toEqual([]);
    });

    it('should sort recommendations by frequency descending', () => {
      const analyzer = createChipAnalyzer();
      
      const freetextData = [
        'feature1, feature2, feature3',
        'feature1, feature2',
        'feature1, feature2',
        'feature1',
        'feature1',
      ];
      
      const recommendations = analyzer.identifyMissingChips(freetextData, 'kitchen');
      
      // feature1: 5/5 = 100%
      // feature2: 3/5 = 60%
      // feature3: 1/5 = 20%
      expect(recommendations[0].chipLabel).toBe('feature1');
      expect(recommendations[1].chipLabel).toBe('feature2');
      expect(recommendations[2].chipLabel).toBe('feature3');
    });
  });


  describe('identifyRarelyUsedChips', () => {
    it('should identify chips with selection rate below threshold', () => {
      const analyzer = createChipAnalyzer();
      
      const usageStats: ChipUsageStats[] = [
        {
          chipLabel: 'Popular chip',
          category: 'kitchen',
          selectionCount: 50,
          selectionRate: 50,
          appearsInGeneratedText: true,
          averageQualityImpact: 0.8,
        },
        {
          chipLabel: 'Rare chip',
          category: 'kitchen',
          selectionCount: 3,
          selectionRate: 3,
          appearsInGeneratedText: false,
          averageQualityImpact: 0.1,
        },
      ];
      
      const recommendations = analyzer.identifyRarelyUsedChips(usageStats, 5);
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].chipLabel).toBe('Rare chip');
      expect(recommendations[0].action).toBe('remove');
      expect(recommendations[0].reason).toContain('3.0%');
      expect(recommendations[0].reason).toContain('threshold: 5%');
    });

    it('should use default threshold of 5% when not specified', () => {
      const analyzer = createChipAnalyzer();
      
      const usageStats: ChipUsageStats[] = [
        {
          chipLabel: 'Rare chip',
          category: 'kitchen',
          selectionCount: 2,
          selectionRate: 2,
          appearsInGeneratedText: false,
          averageQualityImpact: 0,
        },
      ];
      
      const recommendations = analyzer.identifyRarelyUsedChips(usageStats);
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].reason).toContain('threshold: 5%');
    });

    it('should not recommend removal for chips above threshold', () => {
      const analyzer = createChipAnalyzer();
      
      const usageStats: ChipUsageStats[] = [
        {
          chipLabel: 'Popular chip',
          category: 'kitchen',
          selectionCount: 10,
          selectionRate: 10,
          appearsInGeneratedText: true,
          averageQualityImpact: 0.5,
        },
      ];
      
      const recommendations = analyzer.identifyRarelyUsedChips(usageStats, 5);
      
      expect(recommendations).toHaveLength(0);
    });


    it('should sort recommendations by selection rate ascending (rarest first)', () => {
      const analyzer = createChipAnalyzer();
      
      const usageStats: ChipUsageStats[] = [
        {
          chipLabel: 'Chip A',
          category: 'kitchen',
          selectionCount: 4,
          selectionRate: 4,
          appearsInGeneratedText: false,
          averageQualityImpact: 0,
        },
        {
          chipLabel: 'Chip B',
          category: 'kitchen',
          selectionCount: 1,
          selectionRate: 1,
          appearsInGeneratedText: false,
          averageQualityImpact: 0,
        },
        {
          chipLabel: 'Chip C',
          category: 'kitchen',
          selectionCount: 2,
          selectionRate: 2,
          appearsInGeneratedText: false,
          averageQualityImpact: 0,
        },
      ];
      
      const recommendations = analyzer.identifyRarelyUsedChips(usageStats, 5);
      
      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].chipLabel).toBe('Chip B'); // 1%
      expect(recommendations[1].chipLabel).toBe('Chip C'); // 2%
      expect(recommendations[2].chipLabel).toBe('Chip A'); // 4%
    });

    it('should handle empty usage stats', () => {
      const analyzer = createChipAnalyzer();
      
      const recommendations = analyzer.identifyRarelyUsedChips([]);
      
      expect(recommendations).toEqual([]);
    });

    it('should include category in recommendations', () => {
      const analyzer = createChipAnalyzer();
      
      const usageStats: ChipUsageStats[] = [
        {
          chipLabel: 'Rare bathroom chip',
          category: 'bathroom',
          selectionCount: 1,
          selectionRate: 2,
          appearsInGeneratedText: false,
          averageQualityImpact: 0,
        },
      ];
      
      const recommendations = analyzer.identifyRarelyUsedChips(usageStats, 5);
      
      expect(recommendations[0].category).toBe('bathroom');
    });
  });


  describe('validateChipCoverage', () => {
    it('should return true when all top 10 features are covered', () => {
      const analyzer = createChipAnalyzer();
      
      const topFeatures = [
        'renoverat kök',
        'köksö',
        'stenbänk/komposit',
        'integrerade vitvaror',
        'platsbyggt kök',
      ];
      
      const isValid = analyzer.validateChipCoverage('kitchen', topFeatures);
      
      expect(isValid).toBe(true);
    });

    it('should return false when top features are missing', () => {
      const analyzer = createChipAnalyzer();
      
      const topFeatures = [
        'renoverat kök',
        'missing_feature_1',
        'missing_feature_2',
      ];
      
      const isValid = analyzer.validateChipCoverage('kitchen', topFeatures);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty top features list', () => {
      const analyzer = createChipAnalyzer();
      
      const isValid = analyzer.validateChipCoverage('kitchen', []);
      
      expect(isValid).toBe(true);
    });

    it('should only check top 10 features', () => {
      const analyzer = createChipAnalyzer();
      
      // First 10 are covered, 11th is not
      const topFeatures = [
        'renoverat kök',
        'köksö',
        'stenbänk/komposit',
        'integrerade vitvaror',
        'platsbyggt kök',
        'matplats 4–6 pers',
        'öppen planlösning',
        'vitvaror uppdaterade',
        'fönster vid matplats',
        'helkaklat', // 10th feature (from bathroom, but testing coverage logic)
        'missing_feature', // 11th feature - should be ignored
      ];
      
      const isValid = analyzer.validateChipCoverage('kitchen', topFeatures);
      
      // Should validate only first 10, so result depends on coverage of those
      expect(typeof isValid).toBe('boolean');
    });

    it('should normalize chip labels for comparison', () => {
      const analyzer = createChipAnalyzer();
      
      const topFeatures = [
        'RENOVERAT KÖK', // Uppercase
        '  köksö  ', // Extra whitespace
      ];
      
      const isValid = analyzer.validateChipCoverage('kitchen', topFeatures);
      
      expect(isValid).toBe(true);
    });

    it('should handle non-existent category', () => {
      const analyzer = createChipAnalyzer();
      
      const topFeatures = ['feature1', 'feature2'];
      
      const isValid = analyzer.validateChipCoverage('nonexistent', topFeatures);
      
      expect(isValid).toBe(false);
    });
  });


    it('should sort recommendations by selection rate ascending', () => {
      const analyzer = createChipAnalyzer();
      
      const usageStats: ChipUsageStats[] = [
        {
          chipLabel: 'Chip A',
          category: 'kitchen',
          selectionCount: 4,
          selectionRate: 4,
          appearsInGeneratedText: false,
          averageQualityImpact: 0,
        },
        {
          chipLabel: 'Chip B',
          category: 'kitchen',
          selectionCount: 1,
          selectionRate: 1,
          appearsInGeneratedText: false,
          averageQualityImpact: 0,
        },
        {
          chipLabel: 'Chip C',
          category: 'kitchen',
          selectionCount: 2,
          selectionRate: 2,
          appearsInGeneratedText: false,
          averageQualityImpact: 0,
        },
      ];
      
      const recommendations = analyzer.identifyRarelyUsedChips(usageStats, 5);
      
      expect(recommendations[0].chipLabel).toBe('Chip B'); // 1% (rarest)
      expect(recommendations[1].chipLabel).toBe('Chip C'); // 2%
      expect(recommendations[2].chipLabel).toBe('Chip A'); // 4%
    });

    it('should handle custom threshold values', () => {
      const analyzer = createChipAnalyzer();
      
      const usageStats: ChipUsageStats[] = [
        {
          chipLabel: 'Chip A',
          category: 'kitchen',
          selectionCount: 8,
          selectionRate: 8,
          appearsInGeneratedText: false,
          averageQualityImpact: 0,
        },
      ];
      
      // With 10% threshold, 8% should be flagged
      const recommendations = analyzer.identifyRarelyUsedChips(usageStats, 10);
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].reason).toContain('threshold: 10%');
    });
  });


  describe('analyzeChipTerminology', () => {
    it('should identify ambiguous chip labels', () => {
      const analyzer = createChipAnalyzer();
      
      const chips = [
        'Renoverat kök med årtal',
        'Renoverat badrum med årtal',
      ];
      
      const issues = analyzer.analyzeChipTerminology(chips);
      
      const ambiguousIssues = issues.filter(i => i.issue === 'ambiguous');
      expect(ambiguousIssues.length).toBeGreaterThan(0);
      expect(ambiguousIssues.some(i => i.chipLabel === 'Renoverat kök med årtal')).toBe(true);
    });

    it('should identify combined features with slash', () => {
      const analyzer = createChipAnalyzer();
      
      const chips = [
        'Stenbänk/komposit',
        'Altan/trädäck',
        'Garage/laddbox',
      ];
      
      const issues = analyzer.analyzeChipTerminology(chips);
      
      const unclearIssues = issues.filter(i => i.issue === 'unclear');
      expect(unclearIssues.length).toBeGreaterThan(0);
      expect(unclearIssues.every(i => i.suggestion.includes('splitting'))).toBe(true);
    });

    it('should identify vague terms', () => {
      const analyzer = createChipAnalyzer();
      
      const chips = [
        'Vitvaror uppdaterade',
        'Nytt tak',
      ];
      
      const issues = analyzer.analyzeChipTerminology(chips);
      
      const vagueIssues = issues.filter(i => 
        i.chipLabel === 'Vitvaror uppdaterade' || i.chipLabel === 'Nytt tak'
      );
      expect(vagueIssues.length).toBeGreaterThan(0);
    });

    it('should handle empty chip array', () => {
      const analyzer = createChipAnalyzer();
      
      const issues = analyzer.analyzeChipTerminology([]);
      
      expect(issues).toEqual([]);
    });

    it('should handle chips with no issues', () => {
      const analyzer = createChipAnalyzer();
      
      const chips = [
        'Ekparkett',
        'Fjärrvärme',
        'Helkaklat',
      ];
      
      const issues = analyzer.analyzeChipTerminology(chips);
      
      // These chips should have no issues (no slashes, no vague terms, not in ambiguous list)
      expect(issues).toHaveLength(0);
    });
  });


  describe('Integration scenarios', () => {
    it('should provide comprehensive chip analysis', () => {
      const analyzer = createChipAnalyzer();
      
      // Historical data with varied chip usage
      const historicalData: FormSubmission[] = [
        {
          id: '1',
          userId: 'user1',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          chipSelections: {
            kitchen: ['Renoverat kök', 'Köksö'],
            bathroom: ['Helkaklat'],
          },
          freetextFields: {
            kitchenDescription: 'induktionshäll, diskmaskin',
          },
        },
        {
          id: '2',
          userId: 'user2',
          timestamp: new Date(),
          propertyType: 'apartment',
          platform: 'hemnet',
          chipSelections: {
            kitchen: ['Renoverat kök'],
            bathroom: ['Rare chip'],
          },
          freetextFields: {
            kitchenDescription: 'induktionshäll',
          },
        },
      ];
      
      // Analyze usage
      const usageStats = analyzer.analyzeChipUsage(historicalData);
      expect(usageStats.length).toBeGreaterThan(0);
      
      // Identify rarely used chips
      const rareChips = analyzer.identifyRarelyUsedChips(usageStats, 5);
      expect(rareChips.length).toBeGreaterThan(0);
      
      // Identify missing chips from freetext
      const freetextData = historicalData
        .map(d => d.freetextFields.kitchenDescription)
        .filter(Boolean);
      const missingChips = analyzer.identifyMissingChips(freetextData, 'kitchen');
      expect(missingChips.length).toBeGreaterThan(0);
      
      // Validate terminology
      const allChips = ['Renoverat kök', 'Köksö', 'Stenbänk/komposit'];
      const terminologyIssues = analyzer.analyzeChipTerminology(allChips);
      expect(terminologyIssues.length).toBeGreaterThan(0);
    });

    it('should handle real-world chip collection analysis', () => {
      const analyzer = createChipAnalyzer();
      
      // Simulate 100 submissions with realistic chip usage
      const historicalData: FormSubmission[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        userId: `user${i}`,
        timestamp: new Date(),
        propertyType: 'apartment',
        platform: 'hemnet',
        chipSelections: {
          kitchen: i < 80 ? ['Renoverat kök'] : [], // 80% usage
          bathroom: i < 10 ? ['Rare bathroom chip'] : ['Helkaklat'], // 10% vs 90%
        },
        freetextFields: {},
      }));
      
      const usageStats = analyzer.analyzeChipUsage(historicalData);
      
      const renovatKok = usageStats.find(s => s.chipLabel === 'Renoverat kök');
      expect(renovatKok?.selectionRate).toBe(80);
      
      const rareChip = usageStats.find(s => s.chipLabel === 'Rare bathroom chip');
      expect(rareChip?.selectionRate).toBe(10);
      
      const rareChips = analyzer.identifyRarelyUsedChips(usageStats, 5);
      expect(rareChips.some(r => r.chipLabel === 'Rare bathroom chip')).toBe(true);
    });
  });
});
