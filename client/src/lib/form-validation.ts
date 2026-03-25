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
    'area': 'Område',
    'livingArea': 'Boarea',
    'totalRooms': 'Antal rum',
    'bedrooms': 'Sovrum',
    'bathrooms': 'Badrum',
    'price': 'Pris',
    'monthlyFee': 'Avgift',
    'buildYear': 'Byggår',
    'condition': 'Skick',
    'energyClass': 'Energiklass',
    'floor': 'Våning',
    'elevator': 'Hiss',
    'balconyArea': 'Balkongarea',
    'balconyDirection': 'Balkongväderstreck',
    'brfName': 'BRF-namn',
    'storage': 'Förråd',
    'layoutDescription': 'Planlösning',
    'kitchenDescription': 'Kök',
    'bathroomDescription': 'Badrum',
    'uniqueSellingPoints': 'Säljpunkter',
    'view': 'Utsikt',
    'neighborhood': 'Områdesbeskrivning',
    'transport': 'Kommunikationer',
    'parking': 'Parkering',
    'flooring': 'Golv',
    'heating': 'Uppvärmning',
    'lotArea': 'Tomtarea',
    'gardenDescription': 'Trädgård',
    'specialFeatures': 'Särskilda egenskaper',
    'fastighetsbeteckning': 'Fastighetsbeteckning',
    'taxeringsvarde': 'Taxeringsvärde',
    'tomtrattsavgald': 'Tomträttsavgäld',
    'konstruktionMaterial': 'Byggnadsmaterial',
    'taktyp': 'Taktyp',
    'renoveringsar': 'Renoveringar',
    'floors': 'Antal plan',
    'biarea': 'Biarea',
    'tilltradesdag': 'Tillträdesdag',
    'visningstid': 'Visningstid',
    'maklarnamn': 'Mäklarens namn',
    'maklartelefon': 'Telefon',
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

/**
 * Task 8.1: Field dependency definitions.
 * Maps fields to conditions that must be met for them to be visible/relevant.
 */
export type FieldDependency = {
  field: string;
  dependsOn: string;
  condition: (value: string | boolean) => boolean;
};

export const FIELD_DEPENDENCIES: FieldDependency[] = [
  // Apartment-only fields
  { field: 'monthlyFee', dependsOn: 'propertyType', condition: (v) => v === 'apartment' || v === 'townhouse' },
  { field: 'floor', dependsOn: 'propertyType', condition: (v) => v === 'apartment' || v === 'townhouse' },
  { field: 'elevator', dependsOn: 'propertyType', condition: (v) => v === 'apartment' || v === 'townhouse' },
  { field: 'brfName', dependsOn: 'propertyType', condition: (v) => v === 'apartment' || v === 'townhouse' },
  // House-only fields
  { field: 'lotArea', dependsOn: 'propertyType', condition: (v) => v === 'house' || v === 'villa' },
  { field: 'floors', dependsOn: 'propertyType', condition: (v) => v === 'house' || v === 'villa' },
  { field: 'biarea', dependsOn: 'propertyType', condition: (v) => v === 'house' || v === 'villa' },
  { field: 'gardenDescription', dependsOn: 'propertyType', condition: (v) => v === 'house' || v === 'villa' },
  { field: 'fastighetsbeteckning', dependsOn: 'propertyType', condition: (v) => v === 'house' || v === 'villa' },
  { field: 'tomtrattsavgald', dependsOn: 'propertyType', condition: (v) => v === 'house' || v === 'villa' },
  { field: 'konstruktionMaterial', dependsOn: 'propertyType', condition: (v) => v === 'house' || v === 'villa' },
  { field: 'taktyp', dependsOn: 'propertyType', condition: (v) => v === 'house' || v === 'villa' },
  // Balcony direction depends on having a balcony area
  { field: 'balconyDirection', dependsOn: 'balconyArea', condition: (v) => typeof v === 'string' && v.trim() !== '' },
];

/**
 * Task 8.1: Check if a field should be visible based on dependencies.
 */
export function isFieldVisible(
  fieldName: string,
  formData: Record<string, string | boolean>
): boolean {
  const deps = FIELD_DEPENDENCIES.filter(d => d.field === fieldName);
  if (deps.length === 0) return true; // No dependencies = always visible
  return deps.every(dep => dep.condition(formData[dep.dependsOn] ?? ''));
}

/**
 * Task 8.3: Cross-field validation warnings (non-blocking).
 * Returns advisory warnings for data quality improvement.
 */
export function getValidationWarnings(
  formData: Record<string, string | boolean>,
  propertyType: PropertyType
): string[] {
  const warnings: string[] = [];
  const isHouseType = propertyType === 'house' || propertyType === 'villa';

  // Warn if USP is empty but view is filled (view contributes to USP)
  if (formData.view && !formData.uniqueSellingPoints) {
    warnings.push('Tips: Lägg till försäljningsargument för starkare text.');
  }

  // Warn if house has no garden description
  if (isHouseType && !formData.gardenDescription) {
    warnings.push('Tips: Beskriv trädgården — det är ofta avgörande för villaköpare.');
  }

  // Warn if no kitchen or bathroom info
  if (!formData.kitchenDescription && !formData.bathroomDescription) {
    warnings.push('Tips: Kök och badrum är högintressanta — beskriv åtminstone ett.');
  }

  return warnings;
}
