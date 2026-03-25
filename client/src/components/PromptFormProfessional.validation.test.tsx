/**
 * Integration tests for PromptFormProfessional validation
 * 
 * Tests Requirements 13.1, 13.2 for platform compliance validation.
 * Focuses on validation engine behavior, not full component rendering.
 */

import { describe, it, expect } from 'vitest';
import {
  validateRequiredFields,
  getRequiredFields,
  type PropertyType,
  type Platform,
} from '@/lib/form-validation';

describe('PromptFormProfessional Validation Integration', () => {
  describe('Hemnet Platform Validation', () => {
    it('should enforce all Hemnet mandatory fields for apartments', () => {
      const requiredFields = getRequiredFields('apartment', 'hemnet');
      
      // Hemnet mandatory fields
      expect(requiredFields).toContain('propertyType');
      expect(requiredFields).toContain('address');
      expect(requiredFields).toContain('livingArea');
      expect(requiredFields).toContain('totalRooms');
      expect(requiredFields).toContain('price');
      expect(requiredFields).toContain('monthlyFee');
      expect(requiredFields).toContain('buildYear');
      expect(requiredFields).toContain('energyClass');
      
      // Apartment-specific fields
      expect(requiredFields).toContain('floor');
      expect(requiredFields).toContain('elevator');
      
      // Should not include house-specific fields
      expect(requiredFields).not.toContain('lotArea');
      expect(requiredFields).not.toContain('floors');
    });

    it('should enforce all Hemnet mandatory fields for houses', () => {
      const requiredFields = getRequiredFields('house', 'hemnet');
      
      // Hemnet mandatory fields
      expect(requiredFields).toContain('propertyType');
      expect(requiredFields).toContain('address');
      expect(requiredFields).toContain('livingArea');
      expect(requiredFields).toContain('totalRooms');
      expect(requiredFields).toContain('price');
      expect(requiredFields).toContain('buildYear');
      expect(requiredFields).toContain('energyClass');
      
      // House-specific fields
      expect(requiredFields).toContain('lotArea');
      expect(requiredFields).toContain('floors');
      
      // Should not include apartment-specific fields
      expect(requiredFields).not.toContain('monthlyFee');
      expect(requiredFields).not.toContain('floor');
      expect(requiredFields).not.toContain('elevator');
    });

    it('should prevent submission when Hemnet mandatory fields are missing', () => {
      const incompleteData = {
        propertyType: 'apartment',
        address: 'Karlavägen 12',
        livingArea: '84',
        totalRooms: '3',
        // Missing: price, monthlyFee, buildYear, energyClass, floor
      };
      
      const result = validateRequiredFields(incompleteData, 'apartment', 'hemnet');
      
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('price');
      expect(result.missingFields).toContain('monthlyFee');
      expect(result.missingFields).toContain('buildYear');
      expect(result.missingFields).toContain('energyClass');
      expect(result.missingFields).toContain('floor');
    });

    it('should allow submission when all Hemnet mandatory fields are filled', () => {
      const completeData = {
        propertyType: 'apartment',
        address: 'Karlavägen 12',
        livingArea: '84',
        totalRooms: '3',
        price: '4495000',
        monthlyFee: '3842',
        buildYear: '1932',
        energyClass: 'C',
        floor: '3',
        elevator: true,
      };
      
      const result = validateRequiredFields(completeData, 'apartment', 'hemnet');
      
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });
  });

  describe('Booli Platform Validation', () => {
    it('should enforce all Booli mandatory fields', () => {
      const requiredFields = getRequiredFields('apartment', 'booli');
      
      // Booli mandatory fields
      expect(requiredFields).toContain('propertyType');
      expect(requiredFields).toContain('address');
      expect(requiredFields).toContain('livingArea');
      expect(requiredFields).toContain('totalRooms');
      expect(requiredFields).toContain('price');
      
      // Apartment-specific fields
      expect(requiredFields).toContain('monthlyFee');
      expect(requiredFields).toContain('floor');
      expect(requiredFields).toContain('elevator');
    });

    it('should prevent submission when Booli mandatory fields are missing', () => {
      const incompleteData = {
        propertyType: 'apartment',
        address: 'Karlavägen 12',
        // Missing: livingArea, totalRooms, price
        monthlyFee: '3842',
        floor: '3',
        elevator: true,
      };
      
      const result = validateRequiredFields(incompleteData, 'apartment', 'booli');
      
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('livingArea');
      expect(result.missingFields).toContain('totalRooms');
      expect(result.missingFields).toContain('price');
    });

    it('should allow submission when all Booli mandatory fields are filled', () => {
      const completeData = {
        propertyType: 'apartment',
        address: 'Karlavägen 12',
        livingArea: '84',
        totalRooms: '3',
        price: '4495000',
        monthlyFee: '3842',
        floor: '3',
        elevator: false,
      };
      
      const result = validateRequiredFields(completeData, 'apartment', 'booli');
      
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });
  });

  describe('Property Type-Specific Validation', () => {
    it('should require apartment-specific fields for apartments', () => {
      const requiredFields = getRequiredFields('apartment', 'general');
      
      expect(requiredFields).toContain('monthlyFee');
      expect(requiredFields).toContain('floor');
      expect(requiredFields).toContain('elevator');
    });

    it('should require apartment-specific fields for townhouses', () => {
      const requiredFields = getRequiredFields('townhouse', 'general');
      
      expect(requiredFields).toContain('monthlyFee');
      expect(requiredFields).toContain('floor');
      expect(requiredFields).toContain('elevator');
    });

    it('should require house-specific fields for houses', () => {
      const requiredFields = getRequiredFields('house', 'general');
      
      expect(requiredFields).toContain('lotArea');
      expect(requiredFields).toContain('floors');
      expect(requiredFields).not.toContain('monthlyFee');
      expect(requiredFields).not.toContain('floor');
      expect(requiredFields).not.toContain('elevator');
    });

    it('should require house-specific fields for villas', () => {
      const requiredFields = getRequiredFields('villa', 'general');
      
      expect(requiredFields).toContain('lotArea');
      expect(requiredFields).toContain('floors');
    });

    it('should prevent submission when apartment-specific fields are missing', () => {
      const incompleteData = {
        propertyType: 'apartment',
        address: 'Karlavägen 12',
        livingArea: '84',
        totalRooms: '3',
        // Missing: monthlyFee, floor
        elevator: true,
      };
      
      const result = validateRequiredFields(incompleteData, 'apartment', 'general');
      
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('monthlyFee');
      expect(result.missingFields).toContain('floor');
    });

    it('should prevent submission when house-specific fields are missing', () => {
      const incompleteData = {
        propertyType: 'house',
        address: 'Storgatan 45',
        livingArea: '150',
        totalRooms: '5',
        // Missing: lotArea, floors
      };
      
      const result = validateRequiredFields(incompleteData, 'house', 'general');
      
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('lotArea');
      expect(result.missingFields).toContain('floors');
    });
  });

  describe('Combined Platform and Property Type Validation', () => {
    it('should enforce both Hemnet and apartment requirements', () => {
      const requiredFields = getRequiredFields('apartment', 'hemnet');
      
      // Should have at least 10 required fields (8 Hemnet + 3 apartment - 1 overlap)
      expect(requiredFields.length).toBeGreaterThanOrEqual(10);
      
      // Verify no duplicates
      const uniqueFields = [...new Set(requiredFields)];
      expect(requiredFields.length).toBe(uniqueFields.length);
    });

    it('should enforce both Hemnet and house requirements', () => {
      const requiredFields = getRequiredFields('house', 'hemnet');
      
      // Should have at least 9 required fields (7 Hemnet without monthlyFee + 2 house)
      expect(requiredFields.length).toBeGreaterThanOrEqual(9);
      
      // Verify no duplicates
      const uniqueFields = [...new Set(requiredFields)];
      expect(requiredFields.length).toBe(uniqueFields.length);
    });

    it('should enforce both Booli and apartment requirements', () => {
      const requiredFields = getRequiredFields('apartment', 'booli');
      
      // Should have at least 7 required fields (5 Booli + 3 apartment - 1 overlap)
      expect(requiredFields.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty form data', () => {
      const emptyData = {};
      
      const result = validateRequiredFields(emptyData, 'apartment', 'hemnet');
      
      expect(result.valid).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only values as missing', () => {
      const whitespaceData = {
        propertyType: 'apartment',
        address: '   ',
        livingArea: '\t\n',
        totalRooms: '  ',
        price: '',
        monthlyFee: '3842',
        buildYear: '1932',
        energyClass: 'C',
        floor: '3',
        elevator: true,
      };
      
      const result = validateRequiredFields(whitespaceData, 'apartment', 'hemnet');
      
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('address');
      expect(result.missingFields).toContain('livingArea');
      expect(result.missingFields).toContain('totalRooms');
      expect(result.missingFields).toContain('price');
    });

    it('should handle null and undefined values as missing', () => {
      const nullData = {
        propertyType: 'apartment',
        address: null,
        livingArea: undefined,
        totalRooms: '3',
        price: '4495000',
        monthlyFee: '3842',
        buildYear: '1932',
        energyClass: 'C',
        floor: '3',
        elevator: true,
      };
      
      const result = validateRequiredFields(nullData, 'apartment', 'hemnet');
      
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('address');
      expect(result.missingFields).toContain('livingArea');
    });

    it('should treat false as valid for boolean fields', () => {
      const dataWithFalse = {
        propertyType: 'apartment',
        address: 'Karlavägen 12',
        livingArea: '84',
        totalRooms: '3',
        price: '4495000',
        monthlyFee: '3842',
        buildYear: '1932',
        energyClass: 'C',
        floor: '3',
        elevator: false, // false should be valid
      };
      
      const result = validateRequiredFields(dataWithFalse, 'apartment', 'hemnet');
      
      expect(result.valid).toBe(true);
      expect(result.missingFields).not.toContain('elevator');
    });
  });
});
