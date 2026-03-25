/**
 * Unit tests for Form Auditor module
 * 
 * Tests platform compliance auditing, field mapping, and reference data.
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect } from 'vitest';
import {
  createFormAuditor,
  HEMNET_REQUIRED_FIELDS,
  HEMNET_RECOMMENDED_FIELDS,
  BOOLI_REQUIRED_FIELDS,
  BOOLI_RECOMMENDED_FIELDS,
  type PlatformRequirement,
} from '../lib/form-auditor';

describe('Form Auditor', () => {
  const auditor = createFormAuditor();

  describe('Platform Requirements Reference Data', () => {
    it('should define Hemnet required fields', () => {
      expect(HEMNET_REQUIRED_FIELDS).toBeDefined();
      expect(HEMNET_REQUIRED_FIELDS.length).toBeGreaterThan(0);
      expect(HEMNET_REQUIRED_FIELDS).toContain('propertyType');
      expect(HEMNET_REQUIRED_FIELDS).toContain('address');
      expect(HEMNET_REQUIRED_FIELDS).toContain('livingArea');
      expect(HEMNET_REQUIRED_FIELDS).toContain('price');
    });

    it('should define Hemnet recommended fields', () => {
      expect(HEMNET_RECOMMENDED_FIELDS).toBeDefined();
      expect(HEMNET_RECOMMENDED_FIELDS.length).toBeGreaterThan(0);
      expect(HEMNET_RECOMMENDED_FIELDS).toContain('floor');
      expect(HEMNET_RECOMMENDED_FIELDS).toContain('parking');
    });

    it('should define Booli required fields', () => {
      expect(BOOLI_REQUIRED_FIELDS).toBeDefined();
      expect(BOOLI_REQUIRED_FIELDS.length).toBeGreaterThan(0);
      expect(BOOLI_REQUIRED_FIELDS).toContain('propertyType');
      expect(BOOLI_REQUIRED_FIELDS).toContain('address');
      expect(BOOLI_REQUIRED_FIELDS).toContain('price');
    });

    it('should define Booli recommended fields', () => {
      expect(BOOLI_RECOMMENDED_FIELDS).toBeDefined();
      expect(BOOLI_RECOMMENDED_FIELDS.length).toBeGreaterThan(0);
      expect(BOOLI_RECOMMENDED_FIELDS).toContain('buildYear');
    });
  });

  describe('auditHemnetCompliance', () => {
    it('should return all Hemnet platform requirements', () => {
      const requirements = auditor.auditHemnetCompliance();
      
      expect(requirements).toBeDefined();
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
    });

    it('should include mandatory fields marked as required', () => {
      const requirements = auditor.auditHemnetCompliance();
      const requiredFields = requirements.filter(r => r.required);
      
      expect(requiredFields.length).toBeGreaterThan(0);
      expect(requiredFields.some(r => r.fieldName === 'propertyType')).toBe(true);
      expect(requiredFields.some(r => r.fieldName === 'address')).toBe(true);
      expect(requiredFields.some(r => r.fieldName === 'livingArea')).toBe(true);
    });

    it('should include recommended fields marked as not required', () => {
      const requirements = auditor.auditHemnetCompliance();
      const recommendedFields = requirements.filter(r => r.recommended && !r.required);
      
      expect(recommendedFields.length).toBeGreaterThan(0);
      expect(recommendedFields.some(r => r.fieldName === 'floor')).toBe(true);
      expect(recommendedFields.some(r => r.fieldName === 'parking')).toBe(true);
    });

    it('should mark all requirements with platform "hemnet"', () => {
      const requirements = auditor.auditHemnetCompliance();
      
      expect(requirements.every(r => r.platform === 'hemnet')).toBe(true);
    });

    it('should include descriptions for all requirements', () => {
      const requirements = auditor.auditHemnetCompliance();
      
      expect(requirements.every(r => r.description && r.description.length > 0)).toBe(true);
    });
  });

  describe('auditBooliCompliance', () => {
    it('should return all Booli platform requirements', () => {
      const requirements = auditor.auditBooliCompliance();
      
      expect(requirements).toBeDefined();
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
    });

    it('should include mandatory fields marked as required', () => {
      const requirements = auditor.auditBooliCompliance();
      const requiredFields = requirements.filter(r => r.required);
      
      expect(requiredFields.length).toBeGreaterThan(0);
      expect(requiredFields.some(r => r.fieldName === 'propertyType')).toBe(true);
      expect(requiredFields.some(r => r.fieldName === 'address')).toBe(true);
    });

    it('should include recommended fields marked as not required', () => {
      const requirements = auditor.auditBooliCompliance();
      const recommendedFields = requirements.filter(r => r.recommended && !r.required);
      
      expect(recommendedFields.length).toBeGreaterThan(0);
      expect(recommendedFields.some(r => r.fieldName === 'buildYear')).toBe(true);
    });

    it('should mark all requirements with platform "booli"', () => {
      const requirements = auditor.auditBooliCompliance();
      
      expect(requirements.every(r => r.platform === 'booli')).toBe(true);
    });
  });

  describe('getCurrentFormFields', () => {
    it('should return array of current form field names', () => {
      const fields = auditor.getCurrentFormFields();
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
    });

    it('should include core property fields', () => {
      const fields = auditor.getCurrentFormFields();
      
      expect(fields).toContain('propertyType');
      expect(fields).toContain('address');
      expect(fields).toContain('livingArea');
      expect(fields).toContain('price');
      expect(fields).toContain('totalRooms');
    });

    it('should include apartment-specific fields', () => {
      const fields = auditor.getCurrentFormFields();
      
      expect(fields).toContain('monthlyFee');
      expect(fields).toContain('floor');
      expect(fields).toContain('elevator');
      expect(fields).toContain('brfName');
    });

    it('should include house-specific fields', () => {
      const fields = auditor.getCurrentFormFields();
      
      expect(fields).toContain('lotArea');
      expect(fields).toContain('gardenDescription');
    });

    it('should include description fields', () => {
      const fields = auditor.getCurrentFormFields();
      
      expect(fields).toContain('layoutDescription');
      expect(fields).toContain('kitchenDescription');
      expect(fields).toContain('bathroomDescription');
    });
  });

  describe('mapFormFieldToPlatformField', () => {
    it('should map totalRooms to rooms', () => {
      const mapped = auditor.mapFormFieldToPlatformField('totalRooms');
      expect(mapped).toBe('rooms');
    });

    it('should map balconyArea to balcony', () => {
      const mapped = auditor.mapFormFieldToPlatformField('balconyArea');
      expect(mapped).toBe('balcony');
    });

    it('should map fastighetsbeteckning to propertyDesignation', () => {
      const mapped = auditor.mapFormFieldToPlatformField('fastighetsbeteckning');
      expect(mapped).toBe('propertyDesignation');
    });

    it('should return null for fields without mapping', () => {
      const mapped = auditor.mapFormFieldToPlatformField('address');
      expect(mapped).toBeNull();
    });

    it('should return null for non-existent fields', () => {
      const mapped = auditor.mapFormFieldToPlatformField('nonExistentField');
      expect(mapped).toBeNull();
    });
  });

  describe('Platform Compliance Integration', () => {
    it('should identify Hemnet mandatory fields present in current form', () => {
      const hemnetReqs = auditor.auditHemnetCompliance();
      const currentFields = auditor.getCurrentFormFields();
      
      const mandatoryFields = hemnetReqs.filter(r => r.required);
      const presentMandatory = mandatoryFields.filter(req => {
        const formField = req.fieldName;
        const mappedField = auditor.mapFormFieldToPlatformField(formField);
        return currentFields.includes(formField) || 
               (mappedField && currentFields.includes(mappedField));
      });
      
      expect(presentMandatory.length).toBeGreaterThan(0);
    });

    it('should identify Booli mandatory fields present in current form', () => {
      const booliReqs = auditor.auditBooliCompliance();
      const currentFields = auditor.getCurrentFormFields();
      
      const mandatoryFields = booliReqs.filter(r => r.required);
      const presentMandatory = mandatoryFields.filter(req => {
        const formField = req.fieldName;
        const mappedField = auditor.mapFormFieldToPlatformField(formField);
        return currentFields.includes(formField) || 
               (mappedField && currentFields.includes(mappedField));
      });
      
      expect(presentMandatory.length).toBeGreaterThan(0);
    });
  });

  describe('Field Mapping Consistency', () => {
    it('should have consistent mapping for balcony-related fields', () => {
      expect(auditor.mapFormFieldToPlatformField('balconyArea')).toBe('balcony');
      expect(auditor.mapFormFieldToPlatformField('balconyDirection')).toBe('balcony');
    });

    it('should map Swedish technical terms to English equivalents', () => {
      expect(auditor.mapFormFieldToPlatformField('fastighetsbeteckning')).toBe('propertyDesignation');
      expect(auditor.mapFormFieldToPlatformField('taxeringsvarde')).toBe('assessedValue');
      expect(auditor.mapFormFieldToPlatformField('tomtrattsavgald')).toBe('groundRentFee');
    });
  });
});
