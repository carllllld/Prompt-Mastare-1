/**
 * Gap Analyzer Module Tests
 * 
 * Tests for identifying missing, redundant, and overlapping form fields.
 * 
 * Requirements: 1.5, 1.7, 1.8, 2.1, 2.2, 2.3
 */

import { describe, it, expect } from 'vitest';
import { createGapAnalyzer } from '../lib/gap-analyzer';
import type { PlatformRequirement } from '../lib/form-auditor';
import type { FieldUsageData, ChipCoverage } from '../lib/gap-analyzer';

describe('Gap Analyzer', () => {
  describe('analyzeGaps', () => {
    it('should identify missing mandatory fields with critical priority', () => {
      const analyzer = createGapAnalyzer();
      
      const currentFields = ['address', 'price'];
      const platformRequirements: PlatformRequirement[] = [
        {
          fieldName: 'propertyType',
          required: true,
          recommended: false,
          dataType: 'enum',
          platform: 'hemnet',
          description: 'Type of property',
        },
        {
          fieldName: 'livingArea',
          required: true,
          recommended: false,
          dataType: 'number',
          platform: 'booli',
          description: 'Living area in sqm',
        },
      ];
      const usageData: FieldUsageData[] = [];
      
      const gaps = analyzer.analyzeGaps(currentFields, platformRequirements, usageData);
      
      const mandatoryGaps = gaps.filter(g => g.gapType === 'missing_mandatory');
      expect(mandatoryGaps).toHaveLength(2);
      expect(mandatoryGaps.every(g => g.priority === 'critical')).toBe(true);
      expect(mandatoryGaps.every(g => g.recommendation === 'add')).toBe(true);
      expect(mandatoryGaps.map(g => g.fieldName)).toContain('propertyType');
      expect(mandatoryGaps.map(g => g.fieldName)).toContain('livingArea');
    });

    it('should identify missing recommended fields with important priority', () => {
      const analyzer = createGapAnalyzer();
      
      const currentFields = ['propertyType', 'address', 'price'];
      const platformRequirements: PlatformRequirement[] = [
        {
          fieldName: 'propertyType',
          required: true,
          recommended: false,
          dataType: 'enum',
          platform: 'hemnet',
          description: 'Type of property',
        },
        {
          fieldName: 'floor',
          required: false,
          recommended: true,
          dataType: 'number',
          platform: 'hemnet',
          description: 'Floor number',
        },
        {
          fieldName: 'elevator',
          required: false,
          recommended: true,
          dataType: 'boolean',
          platform: 'hemnet',
          description: 'Has elevator',
        },
      ];
      const usageData: FieldUsageData[] = [];
      
      const gaps = analyzer.analyzeGaps(currentFields, platformRequirements, usageData);
      
      const recommendedGaps = gaps.filter(g => g.gapType === 'missing_recommended');
      expect(recommendedGaps).toHaveLength(2);
      expect(recommendedGaps.every(g => g.priority === 'important')).toBe(true);
      expect(recommendedGaps.every(g => g.recommendation === 'add')).toBe(true);
      expect(recommendedGaps.map(g => g.fieldName)).toContain('floor');
      expect(recommendedGaps.map(g => g.fieldName)).toContain('elevator');
    });

    it('should identify low-value fields (high fill rate, low appearance rate)', () => {
      const analyzer = createGapAnalyzer();
      
      const currentFields = ['customField1', 'customField2'];
      const platformRequirements: PlatformRequirement[] = [];
      const usageData: FieldUsageData[] = [
        {
          fieldName: 'customField1',
          fillRate: 75,
          appearanceRate: 15,
        },
        {
          fieldName: 'customField2',
          fillRate: 60,
          appearanceRate: 5,
        },
      ];
      
      const gaps = analyzer.analyzeGaps(currentFields, platformRequirements, usageData);
      
      const lowValueGaps = gaps.filter(g => g.gapType === 'low_value');
      expect(lowValueGaps).toHaveLength(2);
      expect(lowValueGaps.every(g => g.priority === 'review')).toBe(true);
      expect(lowValueGaps.every(g => g.recommendation === 'demote')).toBe(true);
      expect(lowValueGaps[0].reason).toContain('75%');
      expect(lowValueGaps[0].reason).toContain('15%');
    });

    it('should identify unused fields (not required and low fill rate)', () => {
      const analyzer = createGapAnalyzer();
      
      const currentFields = ['rarelyUsedField'];
      const platformRequirements: PlatformRequirement[] = [];
      const usageData: FieldUsageData[] = [
        {
          fieldName: 'rarelyUsedField',
          fillRate: 5,
          appearanceRate: 2,
        },
      ];
      
      const gaps = analyzer.analyzeGaps(currentFields, platformRequirements, usageData);
      
      const unusedGaps = gaps.filter(g => g.gapType === 'unused');
      expect(unusedGaps).toHaveLength(1);
      expect(unusedGaps[0].priority).toBe('review');
      expect(unusedGaps[0].recommendation).toBe('remove');
    });

    it('should not flag platform-required fields as unused', () => {
      const analyzer = createGapAnalyzer();
      
      const currentFields = ['propertyType', 'address'];
      const platformRequirements: PlatformRequirement[] = [
        {
          fieldName: 'propertyType',
          required: true,
          recommended: false,
          dataType: 'enum',
          platform: 'hemnet',
          description: 'Type of property',
        },
        {
          fieldName: 'address',
          required: false,
          recommended: true,
          dataType: 'string',
          platform: 'booli',
          description: 'Property address',
        },
      ];
      const usageData: FieldUsageData[] = [
        {
          fieldName: 'propertyType',
          fillRate: 5,
          appearanceRate: 2,
        },
        {
          fieldName: 'address',
          fillRate: 3,
          appearanceRate: 1,
        },
      ];
      
      const gaps = analyzer.analyzeGaps(currentFields, platformRequirements, usageData);
      
      const unusedGaps = gaps.filter(g => g.gapType === 'unused');
      expect(unusedGaps).toHaveLength(0);
    });

    it('should handle empty inputs gracefully', () => {
      const analyzer = createGapAnalyzer();
      
      const gaps = analyzer.analyzeGaps([], [], []);
      
      expect(gaps).toEqual([]);
    });

    it('should include platform information in gap reasons', () => {
      const analyzer = createGapAnalyzer();
      
      const currentFields: string[] = [];
      const platformRequirements: PlatformRequirement[] = [
        {
          fieldName: 'energyClass',
          required: true,
          recommended: false,
          dataType: 'enum',
          platform: 'hemnet',
          description: 'Energy classification',
        },
      ];
      const usageData: FieldUsageData[] = [];
      
      const gaps = analyzer.analyzeGaps(currentFields, platformRequirements, usageData);
      
      expect(gaps[0].reason).toContain('hemnet');
      expect(gaps[0].reason).toContain('Energy classification');
    });
  });

  describe('identifyRedundantFields', () => {
    it('should identify fields with high chip coverage as redundant', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['kitchenDescription', 'bathroomDescription'];
      const chipCoverage: ChipCoverage[] = [
        {
          fieldName: 'kitchenDescription',
          hasChips: true,
          chipCategory: 'kitchen',
          coveragePercentage: 95,
        },
        {
          fieldName: 'bathroomDescription',
          hasChips: true,
          chipCategory: 'bathroom',
          coveragePercentage: 92,
        },
      ];
      
      const gaps = analyzer.identifyRedundantFields(fields, chipCoverage);
      
      expect(gaps).toHaveLength(2);
      expect(gaps.every(g => g.gapType === 'redundant')).toBe(true);
      expect(gaps.every(g => g.priority === 'review')).toBe(true);
      expect(gaps.every(g => g.recommendation === 'consolidate')).toBe(true);
      expect(gaps[0].consolidateWith).toBe('kitchen');
      expect(gaps[1].consolidateWith).toBe('bathroom');
    });

    it('should not flag fields with low chip coverage as redundant', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['uniqueSellingPoints'];
      const chipCoverage: ChipCoverage[] = [
        {
          fieldName: 'uniqueSellingPoints',
          hasChips: true,
          chipCategory: 'usp',
          coveragePercentage: 60,
        },
      ];
      
      const gaps = analyzer.identifyRedundantFields(fields, chipCoverage);
      
      expect(gaps).toHaveLength(0);
    });

    it('should not flag fields without chips as redundant', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['layoutDescription'];
      const chipCoverage: ChipCoverage[] = [
        {
          fieldName: 'layoutDescription',
          hasChips: false,
          coveragePercentage: 0,
        },
      ];
      
      const gaps = analyzer.identifyRedundantFields(fields, chipCoverage);
      
      expect(gaps).toHaveLength(0);
    });

    it('should include coverage percentage in reason', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['flooring'];
      const chipCoverage: ChipCoverage[] = [
        {
          fieldName: 'flooring',
          hasChips: true,
          chipCategory: 'flooring',
          coveragePercentage: 98,
        },
      ];
      
      const gaps = analyzer.identifyRedundantFields(fields, chipCoverage);
      
      expect(gaps[0].reason).toContain('98%');
      expect(gaps[0].reason).toContain('flooring');
    });

    it('should handle empty inputs gracefully', () => {
      const analyzer = createGapAnalyzer();
      
      const gaps = analyzer.identifyRedundantFields([], []);
      
      expect(gaps).toEqual([]);
    });
  });

  describe('identifyOverlappingFields', () => {
    it('should identify parking and specialFeatures overlap', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['parking', 'specialFeatures'];
      
      const gaps = analyzer.identifyOverlappingFields(fields);
      
      expect(gaps).toHaveLength(1);
      expect(gaps[0].fieldName).toBe('specialFeatures');
      expect(gaps[0].gapType).toBe('overlapping');
      expect(gaps[0].priority).toBe('review');
      expect(gaps[0].recommendation).toBe('consolidate');
      expect(gaps[0].consolidateWith).toBe('parking');
      expect(gaps[0].reason).toContain('Parking');
    });

    it('should identify storage and specialFeatures overlap', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['storage', 'specialFeatures'];
      
      const gaps = analyzer.identifyOverlappingFields(fields);
      
      expect(gaps).toHaveLength(1);
      expect(gaps[0].fieldName).toBe('specialFeatures');
      expect(gaps[0].consolidateWith).toBe('storage');
      expect(gaps[0].reason).toContain('Storage');
    });

    it('should identify view and uniqueSellingPoints overlap', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['view', 'uniqueSellingPoints'];
      
      const gaps = analyzer.identifyOverlappingFields(fields);
      
      expect(gaps).toHaveLength(1);
      expect(gaps[0].fieldName).toBe('uniqueSellingPoints');
      expect(gaps[0].consolidateWith).toBe('view');
      expect(gaps[0].reason).toContain('View');
    });

    it('should identify neighborhood and transport overlap', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['neighborhood', 'transport'];
      
      const gaps = analyzer.identifyOverlappingFields(fields);
      
      expect(gaps).toHaveLength(1);
      expect(gaps[0].fieldName).toBe('transport');
      expect(gaps[0].consolidateWith).toBe('neighborhood');
      expect(gaps[0].reason).toContain('Location');
    });

    it('should identify multiple overlaps with balcony fields', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['balconyArea', 'balconyDirection', 'specialFeatures'];
      
      const gaps = analyzer.identifyOverlappingFields(fields);
      
      expect(gaps.length).toBeGreaterThanOrEqual(1);
      const balconyOverlap = gaps.find(g => g.reason.includes('Balcony'));
      expect(balconyOverlap).toBeDefined();
    });

    it('should not identify overlaps when only one field exists', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['parking'];
      
      const gaps = analyzer.identifyOverlappingFields(fields);
      
      expect(gaps).toHaveLength(0);
    });

    it('should not identify overlaps for unrelated fields', () => {
      const analyzer = createGapAnalyzer();
      
      const fields = ['propertyType', 'price', 'livingArea'];
      
      const gaps = analyzer.identifyOverlappingFields(fields);
      
      expect(gaps).toHaveLength(0);
    });

    it('should handle empty input gracefully', () => {
      const analyzer = createGapAnalyzer();
      
      const gaps = analyzer.identifyOverlappingFields([]);
      
      expect(gaps).toEqual([]);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle comprehensive gap analysis', () => {
      const analyzer = createGapAnalyzer();
      
      const currentFields = [
        'propertyType',
        'address',
        'price',
        'parking',
        'specialFeatures',
        'rareField',
      ];
      
      const platformRequirements: PlatformRequirement[] = [
        {
          fieldName: 'propertyType',
          required: true,
          recommended: false,
          dataType: 'enum',
          platform: 'hemnet',
          description: 'Type of property',
        },
        {
          fieldName: 'livingArea',
          required: true,
          recommended: false,
          dataType: 'number',
          platform: 'hemnet',
          description: 'Living area',
        },
        {
          fieldName: 'floor',
          required: false,
          recommended: true,
          dataType: 'number',
          platform: 'hemnet',
          description: 'Floor number',
        },
      ];
      
      const usageData: FieldUsageData[] = [
        {
          fieldName: 'rareField',
          fillRate: 3,
          appearanceRate: 1,
        },
      ];
      
      const chipCoverage: ChipCoverage[] = [
        {
          fieldName: 'parking',
          hasChips: true,
          chipCategory: 'parking',
          coveragePercentage: 95,
        },
      ];
      
      const gapAnalysis = analyzer.analyzeGaps(currentFields, platformRequirements, usageData);
      const redundantFields = analyzer.identifyRedundantFields(currentFields, chipCoverage);
      const overlappingFields = analyzer.identifyOverlappingFields(currentFields);
      
      // Should find missing mandatory field
      expect(gapAnalysis.some(g => g.fieldName === 'livingArea' && g.gapType === 'missing_mandatory')).toBe(true);
      
      // Should find missing recommended field
      expect(gapAnalysis.some(g => g.fieldName === 'floor' && g.gapType === 'missing_recommended')).toBe(true);
      
      // Should find unused field
      expect(gapAnalysis.some(g => g.fieldName === 'rareField' && g.gapType === 'unused')).toBe(true);
      
      // Should find redundant field
      expect(redundantFields.some(g => g.fieldName === 'parking' && g.gapType === 'redundant')).toBe(true);
      
      // Should find overlapping fields
      expect(overlappingFields.some(g => g.gapType === 'overlapping')).toBe(true);
    });
  });
});
