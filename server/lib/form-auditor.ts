/**
 * Form Auditor Module
 * 
 * Compares current form fields against Hemnet and Booli API requirements.
 * Identifies missing mandatory and recommended fields for platform compliance.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

// ── TYPES ──

export interface PlatformRequirement {
  fieldName: string;
  required: boolean;
  recommended: boolean;
  dataType: string;
  platform: 'hemnet' | 'booli' | 'both';
  description: string;
}

export interface FormAuditor {
  auditHemnetCompliance(): PlatformRequirement[];
  auditBooliCompliance(): PlatformRequirement[];
  getCurrentFormFields(): string[];
  mapFormFieldToPlatformField(formField: string): string | null;
}

// ── PLATFORM REQUIREMENTS REFERENCE DATA ──

/**
 * Hemnet mandatory fields based on Hemnet API requirements.
 * These fields are required for publishing listings on Hemnet.
 */
export const HEMNET_REQUIRED_FIELDS = [
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
 * Hemnet recommended fields that improve listing visibility and quality.
 * While not mandatory, these fields significantly enhance the listing.
 */
export const HEMNET_RECOMMENDED_FIELDS = [
  'floor',
  'elevator',
  'balconyArea',
  'balconyDirection',
  'parking',
  'condition',
  'layoutDescription',
  'kitchenDescription',
  'bathroomDescription',
  'storage',
  'view',
  'neighborhood',
  'transport',
] as const;

/**
 * Booli mandatory fields based on Booli API requirements.
 * These fields are required for publishing listings on Booli.
 */
export const BOOLI_REQUIRED_FIELDS = [
  'propertyType',
  'address',
  'livingArea',
  'totalRooms',
  'price',
] as const;

/**
 * Booli recommended fields that improve listing quality.
 * These fields enhance the listing but are not mandatory.
 */
export const BOOLI_RECOMMENDED_FIELDS = [
  'buildYear',
  'monthlyFee',
  'floor',
  'balconyArea',
  'energyClass',
  'parking',
  'condition',
] as const;

// ── FIELD MAPPING ──

/**
 * Maps PropertyFormData field names to platform field names.
 * Some form fields may have different names than platform APIs expect.
 */
const FIELD_NAME_MAPPING: Record<string, string> = {
  // Form field name -> Platform field name
  'totalRooms': 'rooms',
  'balconyArea': 'balcony',
  'balconyDirection': 'balcony',
  'brfName': 'housingCooperative',
  'lotArea': 'plotArea',
  'gardenDescription': 'garden',
  'konstruktionMaterial': 'constructionMaterial',
  'taktyp': 'roofType',
  'floors': 'numberOfFloors',
  'biarea': 'auxiliaryArea',
  'tilltradesdag': 'accessDate',
  'visningstid': 'viewingTime',
  'maklarnamn': 'brokerName',
  'maklartelefon': 'brokerPhone',
};

/**
 * Current form fields from PropertyFormData interface.
 * This list should match the actual interface in PromptFormProfessional.tsx.
 */
const CURRENT_FORM_FIELDS = [
  'propertyType',
  'address',
  'area',
  'price',
  'monthlyFee',
  'livingArea',
  'totalRooms',
  'bedrooms',
  'bathrooms',
  'buildYear',
  'condition',
  'energyClass',
  'floor',
  'elevator',
  'balconyArea',
  'balconyDirection',
  'brfName',
  'storage',
  'layoutDescription',
  'kitchenDescription',
  'bathroomDescription',
  'uniqueSellingPoints',
  'view',
  'neighborhood',
  'transport',
  'parking',
  'flooring',
  'heating',
  'lotArea',
  'gardenDescription',
  'specialFeatures',
  'otherInfo',
  'konstruktionMaterial',
  'taktyp',
  'floors',
  'biarea',
  'tilltradesdag',
  'platform',
  'writingStyle',
  'visningstid',
  'maklarnamn',
  'maklartelefon',
] as const;

// ── PLATFORM REQUIREMENT DEFINITIONS ──

/**
 * Detailed Hemnet platform requirements with descriptions.
 */
const HEMNET_REQUIREMENTS: PlatformRequirement[] = [
  {
    fieldName: 'propertyType',
    required: true,
    recommended: false,
    dataType: 'enum',
    platform: 'hemnet',
    description: 'Type of property (apartment, house, townhouse, villa)',
  },
  {
    fieldName: 'address',
    required: true,
    recommended: false,
    dataType: 'string',
    platform: 'hemnet',
    description: 'Full property address',
  },
  {
    fieldName: 'livingArea',
    required: true,
    recommended: false,
    dataType: 'number',
    platform: 'hemnet',
    description: 'Living area in square meters (boarea)',
  },
  {
    fieldName: 'rooms',
    required: true,
    recommended: false,
    dataType: 'number',
    platform: 'hemnet',
    description: 'Total number of rooms',
  },
  {
    fieldName: 'price',
    required: true,
    recommended: false,
    dataType: 'number',
    platform: 'hemnet',
    description: 'Asking price in SEK',
  },
  {
    fieldName: 'monthlyFee',
    required: true,
    recommended: false,
    dataType: 'number',
    platform: 'hemnet',
    description: 'Monthly fee (avgift) for apartments/townhouses',
  },
  {
    fieldName: 'buildYear',
    required: true,
    recommended: false,
    dataType: 'number',
    platform: 'hemnet',
    description: 'Year the property was built',
  },
  {
    fieldName: 'energyClass',
    required: true,
    recommended: false,
    dataType: 'enum',
    platform: 'hemnet',
    description: 'Energy classification (A-G)',
  },
  {
    fieldName: 'floor',
    required: false,
    recommended: true,
    dataType: 'number',
    platform: 'hemnet',
    description: 'Floor number for apartments',
  },
  {
    fieldName: 'elevator',
    required: false,
    recommended: true,
    dataType: 'boolean',
    platform: 'hemnet',
    description: 'Whether building has elevator',
  },
  {
    fieldName: 'balcony',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'hemnet',
    description: 'Balcony area and direction',
  },
  {
    fieldName: 'parking',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'hemnet',
    description: 'Parking information',
  },
  {
    fieldName: 'condition',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'hemnet',
    description: 'Property condition',
  },
  {
    fieldName: 'layoutDescription',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'hemnet',
    description: 'Description of property layout',
  },
  {
    fieldName: 'kitchenDescription',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'hemnet',
    description: 'Kitchen description',
  },
  {
    fieldName: 'bathroomDescription',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'hemnet',
    description: 'Bathroom description',
  },
  {
    fieldName: 'storage',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'hemnet',
    description: 'Storage space information',
  },
  {
    fieldName: 'view',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'hemnet',
    description: 'View from property',
  },
  {
    fieldName: 'neighborhood',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'hemnet',
    description: 'Neighborhood description',
  },
  {
    fieldName: 'transport',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'hemnet',
    description: 'Transportation connections',
  },
];

/**
 * Detailed Booli platform requirements with descriptions.
 */
const BOOLI_REQUIREMENTS: PlatformRequirement[] = [
  {
    fieldName: 'propertyType',
    required: true,
    recommended: false,
    dataType: 'enum',
    platform: 'booli',
    description: 'Type of property (apartment, house, townhouse, villa)',
  },
  {
    fieldName: 'address',
    required: true,
    recommended: false,
    dataType: 'string',
    platform: 'booli',
    description: 'Full property address',
  },
  {
    fieldName: 'livingArea',
    required: true,
    recommended: false,
    dataType: 'number',
    platform: 'booli',
    description: 'Living area in square meters (boarea)',
  },
  {
    fieldName: 'rooms',
    required: true,
    recommended: false,
    dataType: 'number',
    platform: 'booli',
    description: 'Total number of rooms',
  },
  {
    fieldName: 'price',
    required: true,
    recommended: false,
    dataType: 'number',
    platform: 'booli',
    description: 'Asking price in SEK',
  },
  {
    fieldName: 'buildYear',
    required: false,
    recommended: true,
    dataType: 'number',
    platform: 'booli',
    description: 'Year the property was built',
  },
  {
    fieldName: 'monthlyFee',
    required: false,
    recommended: true,
    dataType: 'number',
    platform: 'booli',
    description: 'Monthly fee (avgift) for apartments/townhouses',
  },
  {
    fieldName: 'floor',
    required: false,
    recommended: true,
    dataType: 'number',
    platform: 'booli',
    description: 'Floor number for apartments',
  },
  {
    fieldName: 'balcony',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'booli',
    description: 'Balcony information',
  },
  {
    fieldName: 'energyClass',
    required: false,
    recommended: true,
    dataType: 'enum',
    platform: 'booli',
    description: 'Energy classification (A-G)',
  },
  {
    fieldName: 'parking',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'booli',
    description: 'Parking information',
  },
  {
    fieldName: 'condition',
    required: false,
    recommended: true,
    dataType: 'string',
    platform: 'booli',
    description: 'Property condition',
  },
];

// ── FORM AUDITOR IMPLEMENTATION ──

/**
 * Creates a Form Auditor instance for analyzing platform compliance.
 */
export function createFormAuditor(): FormAuditor {
  return {
    /**
     * Audits form compliance with Hemnet requirements.
     * Returns all Hemnet platform requirements (mandatory and recommended).
     * 
     * @returns Array of Hemnet platform requirements
     */
    auditHemnetCompliance(): PlatformRequirement[] {
      return HEMNET_REQUIREMENTS;
    },

    /**
     * Audits form compliance with Booli requirements.
     * Returns all Booli platform requirements (mandatory and recommended).
     * 
     * @returns Array of Booli platform requirements
     */
    auditBooliCompliance(): PlatformRequirement[] {
      return BOOLI_REQUIREMENTS;
    },

    /**
     * Returns the list of current form fields from PropertyFormData.
     * 
     * @returns Array of current form field names
     */
    getCurrentFormFields(): string[] {
      return [...CURRENT_FORM_FIELDS];
    },

    /**
     * Maps a form field name to its corresponding platform field name.
     * Returns null if the field name doesn't need mapping.
     * 
     * @param formField - The form field name from PropertyFormData
     * @returns The platform field name, or null if no mapping exists
     */
    mapFormFieldToPlatformField(formField: string): string | null {
      return FIELD_NAME_MAPPING[formField] || null;
    },
  };
}

/**
 * Default export for convenience.
 */
export default createFormAuditor;
