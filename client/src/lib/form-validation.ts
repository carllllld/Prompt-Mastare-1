/**
 * Form Validation Utilities
 * 
 * Provides dynamic validation rules based on property type and platform.
 * Implements Requirements 13.1, 13.2 for platform compliance validation.
 */

export type PropertyType = "apartment" | "house" | "townhouse" | "villa";
export type Platform = "hemnet" | "booli" | "general";

/**
 * Hemnet mandatory fields based on Hemnet API requirements.
 * These fields are required for publishing listings on Hemnet.
 */
const HEMNET_REQUIRED_FIELDS = [
  'propertyType',
  'address',
  'livingArea',
  'totalRooms',
  'price',
  'monthlyFee', // for apartments/townhouses
  'buildYear',
  'energyClass',
] as const;

/**
 * Booli mandatory fields based on Booli API requirements.
 * These fields are required for publishing listings on Booli.
 */
const BOOLI_REQUIRED_FIELDS = [
  'propertyType',
  'address',
  'livingArea',
  'totalRooms',
  'price',
] as const;

/**
 * Field name mapping from platform requirements to form field names.
 * Maps platform field names (e.g., 'rooms') to form field names (e.g., 'totalRooms').
 */
const PLATFORM_TO_FORM_FIELD_MAP: Record<string, string> = {
  'rooms': 'totalRooms',
  'balcony': 'balconyArea',
};

/**
 * Maps platform field name to form field name.
 */
function mapPlatformFieldToFormField(platformField: string): string {
  return PLATFORM_TO_FORM_FIELD_MAP[platformField] || platformField;
}

/**
 * Gets required fields based on property type.
 * 
 * Apartments and townhouses require:
 * - monthlyFee, floor, elevator
 * 
 * Houses and villas require:
 * - lotArea, floors
 */
export function getPropertyTypeRequiredFields(propertyType: PropertyType): string[] {
  const isApartmentType = propertyType === "apartment" || propertyType === "townhouse";
  const isHouseType = propertyType === "house" || propertyType === "villa";
  
  const required: string[] = [];
  
  if (isApartmentType) {
    required.push('monthlyFee', 'floor', 'elevator');
  }
  
  if (isHouseType) {
    required.push('lotArea', 'floors');
  }
  
  return required;
}

/**
 * Gets required fields based on platform selection.
 * 
 * Hemnet requires: propertyType, address, livingArea, totalRooms, price, monthlyFee (for apartments), buildYear, energyClass
 * Booli requires: propertyType, address, livingArea, totalRooms, price
 */
export function getPlatformRequiredFields(platform: Platform, propertyType: PropertyType): string[] {
  const isApartmentType = propertyType === "apartment" || propertyType === "townhouse";
  
  if (platform === "hemnet") {
    const hemnetFields = [...HEMNET_REQUIRED_FIELDS].map(mapPlatformFieldToFormField);
    
    // monthlyFee is only required for apartments/townhouses on Hemnet
    if (!isApartmentType) {
      return hemnetFields.filter(field => field !== 'monthlyFee');
    }
    
    return hemnetFields;
  }
  
  if (platform === "booli") {
    return [...BOOLI_REQUIRED_FIELDS].map(mapPlatformFieldToFormField);
  }
  
  // For "general" platform, use basic required fields
  return ['propertyType', 'address', 'livingArea', 'totalRooms'];
}

/**
 * Gets all required fields for a given property type and platform.
 * Combines property type requirements with platform requirements.
 */
export function getRequiredFields(propertyType: PropertyType, platform: Platform): string[] {
  const propertyTypeFields = getPropertyTypeRequiredFields(propertyType);
  const platformFields = getPlatformRequiredFields(platform, propertyType);
  
  // Combine and deduplicate
  const allRequired = [...new Set([...propertyTypeFields, ...platformFields])];
  
  return allRequired;
}

/**
 * Validates if all required fields are filled.
 * Returns an object with validation status and list of missing fields.
 */
export function validateRequiredFields(
  formData: Record<string, any>,
  propertyType: PropertyType,
  platform: Platform
): { valid: boolean; missingFields: string[] } {
  const requiredFields = getRequiredFields(propertyType, platform);
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    const value = formData[field];
    
    // Check if field is empty
    // For boolean fields (like elevator), false is a valid value
    if (typeof value === 'boolean') {
      continue; // Boolean fields are always "filled"
    }
    
    // For string/number fields, check if empty
    if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field);
    }
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Gets human-readable field labels for error messages.
 */
export function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    'propertyType': 'Bostadstyp',
    'address': 'Adress',
    'livingArea': 'Boarea',
    'totalRooms': 'Antal rum',
    'price': 'Pris',
    'monthlyFee': 'Avgift',
    'buildYear': 'Byggår',
    'energyClass': 'Energiklass',
    'floor': 'Våning',
    'elevator': 'Hiss',
    'lotArea': 'Tomtarea',
    'floors': 'Antal plan',
  };
  
  return labels[fieldName] || fieldName;
}

/**
 * Checks if a field is required based on current form state.
 */
export function isFieldRequired(
  fieldName: string,
  propertyType: PropertyType,
  platform: Platform
): boolean {
  const requiredFields = getRequiredFields(propertyType, platform);
  return requiredFields.includes(fieldName);
}

/**
 * Gets validation error message for a missing required field.
 */
export function getRequiredFieldError(fieldName: string): string {
  const label = getFieldLabel(fieldName);
  return `${label} är obligatoriskt`;
}
