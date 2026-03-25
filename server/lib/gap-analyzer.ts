/**
 * Gap Analyzer Module
 * 
 * Identifies missing, redundant, and low-value fields by comparing current form
 * against platform requirements and analyzing chip coverage and field overlaps.
 * 
 * Requirements: 1.5, 1.7, 1.8, 2.1, 2.2, 2.3
 */

import type { PlatformRequirement } from './form-auditor';

// ── TYPES ──

export interface FieldGap {
  fieldName: string;
  gapType: 'missing_mandatory' | 'missing_recommended' | 'redundant' | 'low_value' | 'unused' | 'overlapping';
  priority: 'critical' | 'important' | 'review';
  reason: string;
  recommendation: 'add' | 'remove' | 'consolidate' | 'demote';
  consolidateWith?: string;
}

export interface FieldUsageData {
  fieldName: string;
  fillRate: number; // percentage of submissions where field is filled
  appearanceRate: number; // percentage of generated texts where field data appears
}

export interface ChipCoverage {
  fieldName: string;
  hasChips: boolean;
  chipCategory?: string;
  coveragePercentage: number; // percentage of field values covered by chips
}

export interface GapAnalyzer {
  analyzeGaps(
    currentFields: string[],
    platformRequirements: PlatformRequirement[],
    usageData: FieldUsageData[]
  ): FieldGap[];
  identifyRedundantFields(fields: string[], chipCoverage: ChipCoverage[]): FieldGap[];
  identifyOverlappingFields(fields: string[]): FieldGap[];
}

// ── FIELD OVERLAP DETECTION ──

/**
 * Known field overlaps based on semantic analysis.
 * These fields collect similar or overlapping information.
 */
const KNOWN_OVERLAPS: Array<{ fields: string[]; reason: string }> = [
  {
    fields: ['parking', 'specialFeatures'],
    reason: 'Parking information often duplicated in special features field',
  },
  {
    fields: ['storage', 'specialFeatures'],
    reason: 'Storage details often duplicated in special features field',
  },
  {
    fields: ['view', 'uniqueSellingPoints'],
    reason: 'View descriptions often duplicated in USP field',
  },
  {
    fields: ['neighborhood', 'transport'],
    reason: 'Location information overlaps between neighborhood and transport fields',
  },
  {
    fields: ['gardenDescription', 'specialFeatures'],
    reason: 'Garden details often duplicated in special features field',
  },
  {
    fields: ['balconyArea', 'balconyDirection', 'specialFeatures'],
    reason: 'Balcony information sometimes duplicated in special features',
  },
];

// ── GAP ANALYZER IMPLEMENTATION ──

/**
 * Creates a Gap Analyzer instance for identifying form field gaps.
 */
export function createGapAnalyzer(): GapAnalyzer {
  return {
    /**
     * Analyzes gaps between current form fields and platform requirements.
     * Identifies missing mandatory fields, missing recommended fields, and unused fields.
     * 
     * @param currentFields - Array of current form field names
     * @param platformRequirements - Array of platform requirements (Hemnet/Booli)
     * @param usageData - Field usage statistics from historical data
     * @returns Array of identified field gaps
     */
    analyzeGaps(
      currentFields: string[],
      platformRequirements: PlatformRequirement[],
      usageData: FieldUsageData[]
    ): FieldGap[] {
      const gaps: FieldGap[] = [];
      
      // Create a set of current fields for quick lookup
      const currentFieldSet = new Set(currentFields);
      
      // Create a set of all platform-required and recommended fields
      const platformFieldSet = new Set<string>();
      const mandatoryFields = new Set<string>();
      const recommendedFields = new Set<string>();
      
      platformRequirements.forEach(req => {
        platformFieldSet.add(req.fieldName);
        if (req.required) {
          mandatoryFields.add(req.fieldName);
        } else if (req.recommended) {
          recommendedFields.add(req.fieldName);
        }
      });
      
      // Identify missing mandatory fields (critical priority)
      platformRequirements.forEach(req => {
        if (req.required && !currentFieldSet.has(req.fieldName)) {
          gaps.push({
            fieldName: req.fieldName,
            gapType: 'missing_mandatory',
            priority: 'critical',
            reason: `Required by ${req.platform} platform: ${req.description}`,
            recommendation: 'add',
          });
        }
      });
      
      // Identify missing recommended fields (important priority)
      platformRequirements.forEach(req => {
        if (req.recommended && !req.required && !currentFieldSet.has(req.fieldName)) {
          gaps.push({
            fieldName: req.fieldName,
            gapType: 'missing_recommended',
            priority: 'important',
            reason: `Recommended by ${req.platform} platform: ${req.description}`,
            recommendation: 'add',
          });
        }
      });
      
      // Identify unused fields (fields not required by any platform)
      currentFields.forEach(field => {
        if (!platformFieldSet.has(field)) {
          // Check if field has low usage
          const usage = usageData.find(u => u.fieldName === field);
          
          if (usage && usage.appearanceRate < 20 && usage.fillRate > 50) {
            // Low-value field: frequently filled but rarely used
            gaps.push({
              fieldName: field,
              gapType: 'low_value',
              priority: 'review',
              reason: `Field is filled in ${usage.fillRate.toFixed(0)}% of submissions but appears in only ${usage.appearanceRate.toFixed(0)}% of generated texts`,
              recommendation: 'demote',
            });
          } else if (!usage || usage.fillRate < 10) {
            // Unused field: not required by platforms and rarely filled
            gaps.push({
              fieldName: field,
              gapType: 'unused',
              priority: 'review',
              reason: 'Field is not required by Hemnet or Booli and has low usage',
              recommendation: 'remove',
            });
          }
        }
      });
      
      return gaps;
    },

    /**
     * Identifies redundant fields that duplicate information collectible through chips.
     * 
     * @param fields - Array of current form field names
     * @param chipCoverage - Array of chip coverage data for fields
     * @returns Array of redundant field gaps
     */
    identifyRedundantFields(fields: string[], chipCoverage: ChipCoverage[]): FieldGap[] {
      const gaps: FieldGap[] = [];
      
      // Check each field for chip redundancy
      fields.forEach(field => {
        const coverage = chipCoverage.find(c => c.fieldName === field);
        
        if (coverage && coverage.hasChips && coverage.coveragePercentage > 90) {
          // Field has high chip coverage - may be redundant
          gaps.push({
            fieldName: field,
            gapType: 'redundant',
            priority: 'review',
            reason: `Field has ${coverage.coveragePercentage.toFixed(0)}% chip coverage in ${coverage.chipCategory} category. Freetext may be redundant.`,
            recommendation: 'consolidate',
            consolidateWith: coverage.chipCategory,
          });
        }
      });
      
      return gaps;
    },

    /**
     * Identifies overlapping fields that collect similar or duplicate information.
     * 
     * @param fields - Array of current form field names
     * @returns Array of overlapping field gaps
     */
    identifyOverlappingFields(fields: string[]): FieldGap[] {
      const gaps: FieldGap[] = [];
      const fieldSet = new Set(fields);
      
      // Check known overlaps
      KNOWN_OVERLAPS.forEach(overlap => {
        // Check if all fields in the overlap group exist
        const existingFields = overlap.fields.filter(f => fieldSet.has(f));
        
        if (existingFields.length > 1) {
          // Multiple overlapping fields exist - recommend consolidation
          const primaryField = existingFields[0];
          const secondaryFields = existingFields.slice(1);
          
          secondaryFields.forEach(field => {
            gaps.push({
              fieldName: field,
              gapType: 'overlapping',
              priority: 'review',
              reason: overlap.reason,
              recommendation: 'consolidate',
              consolidateWith: primaryField,
            });
          });
        }
      });
      
      return gaps;
    },
  };
}

/**
 * Default export for convenience.
 */
export default createGapAnalyzer;
