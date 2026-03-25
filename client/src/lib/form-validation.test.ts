/**
 * Unit tests for form validation utilities
 * 
 * Tests Requirements 13.1, 13.2 for platform compliance validation.
 */

import { describe, it, expect } from 'vitest';
import {
  getPropertyTypeRequiredFields,
  getPlatformRequiredFields,
  getRequiredFields,
  validateRequiredFields,
  isFieldRequired,
  getFieldLabel,
  getRequiredFieldError,
  type PropertyType,
  type Platform,
} from './form-validation';

describe('Form Validation Utilities', () => {
  describe('getPropertyTypeRequiredFields', () => {
    it('should return apartment-specific required fields for apartment', () => {
      const fields = getPropertyTypeRequiredFields('apartment');
      expect(fields).toContain('monthlyFee');
      expect(fields).toContain('floor');
      expect(fields).toContain('elevator');
      expect(fields).not.toContain('lotArea');
      expect(fields).not.toContain('floors');
    });

    it('should return apartment-specific required fields for townhouse', () => {
      const fields = getPropertyTypeRequiredFields('townhouse');
      expect(fields).toContain('monthlyFee');
      expect(fields).toContain('floor');
      expect(fields).toContain('elevator');
    });

    it('should return house-specific required fields for house', () => {
      const fields = getPropertyTypeRequiredFields('house');
      expect(fields).toContain('lotArea');
      expect(fields).toContain('floors');
      expect(fields).not.toContain('monthlyFee');
      expect(fields).not.toContain('floor');
      expect(fields).not.toContain('elevator');
    });

    it('should return house-specific required fields for villa', () => {
      const fields = getPropertyTypeRequiredFields('villa');
      expect(fields).toContain('lotArea');
      expect(fields).toContain('floors');
    });
  });

  describe('getPlatformRequiredFields', () => {
    it('should return Hemnet required fields for apartment', () => {
      const fields = getPlatformRequiredFields('hemnet', 'apartment');
      expect(fields).toContain('propertyType');
      expect(fields).toContain('address');
      expect(fields).toContain('livingArea');
      expect(fields).toContain('totalRooms');
      expect(fields).toContain('price');
      expect(fields).toContain('monthlyFee');
      expect(fields).toContain('buildYear');
      expect(fields).toContain('energyClass');
    });

    it('should return Hemnet required fields for house without monthlyFee', () => {
      const fields = getPlatformRequiredFields('hemnet', 'house');
      expect(fields).toContain('propertyType');
      expect(fields).toContain('address');
      expect(fields).toContain('livingArea');
      expect(fields).toContain('totalRooms');
      expect(fields).toContain('price');
      expect(fields).toContain('buildYear');
      expect(fields).toContain('energyClass');
      expect(fields).not.toContain('monthlyFee'); // Not required for houses
    });

    it('should return Booli required fields', () => {
      const fields = getPlatformRequiredFields('booli', 'apartment');
      expect(fields).toContain('propertyType');
      expect(fields).toContain('address');
      expect(fields).toContain('livingArea');
      expect(fields).toContain('totalRooms');
      expect(fields).toContain('price');
      expect(fields).not.toContain('buildYear'); // Not required by Booli
      expect(fields).not.toContain('energyClass'); // Not required by Booli
    });

    it('should return basic required fields for general platform', () => {
      const fields = getPlatformRequiredFields('general', 'apartment');
      expect(fields).toContain('propertyType');
      expect(fields).toContain('address');
      expect(fields).toContain('livingArea');
      expect(fields).toContain('totalRooms');
      expect(fields.length).toBe(4); // Only basic fields
    });
  });

  describe('getRequiredFields', () => {
    it('should combine property type and platform requirements for Hemnet apartment', () => {
      const fields = getRequiredFields('apartment', 'hemnet');
      
      // Platform requirements
      expect(fields).toContain('propertyType');
      expect(fields).toContain('address');
      expect(fields).toContain('livingArea');
      expect(fields).toContain('totalRooms');
      expect(fields).toContain('price');
      expect(fields).toContain('buildYear');
      expect(fields).toContain('energyClass');
      
      // Property type requirements
      expect(fields).toContain('monthlyFee');
      expect(fields).toContain('floor');
      expect(fields).toContain('elevator');
    });

    it('should combine property type and platform requirements for Hemnet house', () => {
      const fields = getRequiredFields('house', 'hemnet');
      
      // Platform requirements
      expect(fields).toContain('propertyType');
      expect(fields).toContain('address');
      expect(fields).toContain('livingArea');
      expect(fields).toContain('totalRooms');
      expect(fields).toContain('price');
      expect(fields).toContain('buildYear');
      expect(fields).toContain('energyClass');
      
      // Property type requirements
      expect(fields).toContain('lotArea');
      expect(fields).toContain('floors');
      
      // Should not include apartment-specific fields
      expect(fields).not.toContain('monthlyFee');
      expect(fields).not.toContain('floor');
      expect(fields).not.toContain('elevator');
    });

    it('should not have duplicate fields', () => {
      const fields = getRequiredFields('apartment', 'hemnet');
      const uniqueFields = [...new Set(fields)];
      expect(fields.length).toBe(uniqueFields.length);
    });
  });

  describe('validateRequiredFields', () => {
    it('should validate complete Hemnet apartment form data', () => {
      const formData = {
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
      
      const result = validateRequiredFields(formData, 'apartment', 'hemnet');
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should detect missing required fields for Hemnet apartment', () => {
      const formData = {
        propertyType: 'apartment',
        address: 'Karlavägen 12',
        livingArea: '84',
        totalRooms: '3',
        // Missing: price, monthlyFee, buildYear, energyClass, floor, elevator
      };
      
      const result = validateRequiredFields(formData, 'apartment', 'hemnet');
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('price');
      expect(result.missingFields).toContain('monthlyFee');
      expect(result.missingFields).toContain('buildYear');
      expect(result.missingFields).toContain('energyClass');
      expect(result.missingFields).toContain('floor');
      // elevator is boolean, so it's always "filled"
    });

    it('should validate complete Hemnet house form data', () => {
      const formData = {
        propertyType: 'house',
        address: 'Storgatan 45',
        livingArea: '150',
        totalRooms: '5',
        price: '6500000',
        buildYear: '1985',
        energyClass: 'B',
        lotArea: '800',
        floors: '2',
      };
      
      const result = validateRequiredFields(formData, 'house', 'hemnet');
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should detect missing required fields for Hemnet house', () => {
      const formData = {
        propertyType: 'house',
        address: 'Storgatan 45',
        livingArea: '150',
        // Missing: totalRooms, price, buildYear, energyClass, lotArea, floors
      };
      
      const result = validateRequiredFields(formData, 'house', 'hemnet');
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('totalRooms');
      expect(result.missingFields).toContain('price');
      expect(result.missingFields).toContain('buildYear');
      expect(result.missingFields).toContain('energyClass');
      expect(result.missingFields).toContain('lotArea');
      expect(result.missingFields).toContain('floors');
    });

    it('should validate complete Booli apartment form data', () => {
      const formData = {
        propertyType: 'apartment',
        address: 'Karlavägen 12',
        livingArea: '84',
        totalRooms: '3',
        price: '4495000',
        monthlyFee: '3842',
        floor: '3',
        elevator: true,
      };
      
      const result = validateRequiredFields(formData, 'apartment', 'booli');
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should treat boolean fields as always filled', () => {
      const formData = {
        propertyType: 'apartment',
        address: 'Karlavägen 12',
        livingArea: '84',
        totalRooms: '3',
        price: '4495000',
        monthlyFee: '3842',
        buildYear: '1932',
        energyClass: 'C',
        floor: '3',
        elevator: false, // false is a valid value
      };
      
      const result = validateRequiredFields(formData, 'apartment', 'hemnet');
      expect(result.valid).toBe(true);
      expect(result.missingFields).not.toContain('elevator');
    });

    it('should detect empty strings as missing', () => {
      const formData = {
        propertyType: 'apartment',
        address: '',
        livingArea: '  ',
        totalRooms: '3',
        price: '4495000',
        monthlyFee: '3842',
        buildYear: '1932',
        energyClass: 'C',
        floor: '3',
        elevator: true,
      };
      
      const result = validateRequiredFields(formData, 'apartment', 'hemnet');
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('address');
      expect(result.missingFields).toContain('livingArea');
    });
  });

  describe('isFieldRequired', () => {
    it('should return true for required fields', () => {
      expect(isFieldRequired('address', 'apartment', 'hemnet')).toBe(true);
      expect(isFieldRequired('livingArea', 'apartment', 'hemnet')).toBe(true);
      expect(isFieldRequired('buildYear', 'apartment', 'hemnet')).toBe(true);
      expect(isFieldRequired('monthlyFee', 'apartment', 'hemnet')).toBe(true);
      expect(isFieldRequired('floor', 'apartment', 'hemnet')).toBe(true);
    });

    it('should return false for non-required fields', () => {
      expect(isFieldRequired('view', 'apartment', 'hemnet')).toBe(false);
      expect(isFieldRequired('parking', 'apartment', 'hemnet')).toBe(false);
      expect(isFieldRequired('storage', 'apartment', 'hemnet')).toBe(false);
    });

    it('should handle property type-specific requirements', () => {
      expect(isFieldRequired('lotArea', 'house', 'hemnet')).toBe(true);
      expect(isFieldRequired('lotArea', 'apartment', 'hemnet')).toBe(false);
      expect(isFieldRequired('floor', 'apartment', 'hemnet')).toBe(true);
      expect(isFieldRequired('floor', 'house', 'hemnet')).toBe(false);
    });

    it('should handle platform-specific requirements', () => {
      expect(isFieldRequired('buildYear', 'apartment', 'hemnet')).toBe(true);
      expect(isFieldRequired('buildYear', 'apartment', 'booli')).toBe(false);
      expect(isFieldRequired('energyClass', 'apartment', 'hemnet')).toBe(true);
      expect(isFieldRequired('energyClass', 'apartment', 'booli')).toBe(false);
    });
  });

  describe('getFieldLabel', () => {
    it('should return Swedish labels for known fields', () => {
      expect(getFieldLabel('propertyType')).toBe('Bostadstyp');
      expect(getFieldLabel('address')).toBe('Adress');
      expect(getFieldLabel('livingArea')).toBe('Boarea');
      expect(getFieldLabel('totalRooms')).toBe('Antal rum');
      expect(getFieldLabel('price')).toBe('Pris');
      expect(getFieldLabel('monthlyFee')).toBe('Avgift');
      expect(getFieldLabel('buildYear')).toBe('Byggår');
      expect(getFieldLabel('energyClass')).toBe('Energiklass');
      expect(getFieldLabel('floor')).toBe('Våning');
      expect(getFieldLabel('elevator')).toBe('Hiss');
      expect(getFieldLabel('lotArea')).toBe('Tomtarea');
      expect(getFieldLabel('floors')).toBe('Antal plan');
    });

    it('should return field name for unknown fields', () => {
      expect(getFieldLabel('unknownField')).toBe('unknownField');
    });
  });

  describe('getRequiredFieldError', () => {
    it('should return Swedish error messages', () => {
      expect(getRequiredFieldError('address')).toBe('Adress är obligatoriskt');
      expect(getRequiredFieldError('livingArea')).toBe('Boarea är obligatoriskt');
      expect(getRequiredFieldError('buildYear')).toBe('Byggår är obligatoriskt');
    });
  });
});
