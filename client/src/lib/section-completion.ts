/**
 * Utility functions for calculating section completion
 */

export interface SectionConfig {
  id: string;
  title: string;
  priority: 'critical' | 'important' | 'optional';
  defaultCollapsed: boolean;
  fields: string[];
  order: number;
  mobileOrder: number;
}

export interface SectionCompletionInfo {
  percentage: number;
  filledFields: number;
  totalFields: number;
  hasErrors: boolean;
}

/**
 * Calculate completion percentage for a section
 * 
 * @param sectionConfig - section configuration
 * @param formValues - current form values
 * @param formErrors - current form errors
 * @returns completion info
 */
export function calculateSectionCompletion(
  sectionConfig: SectionConfig,
  formValues: Record<string, any>,
  formErrors: Record<string, any> = {}
): SectionCompletionInfo {
  const { fields } = sectionConfig;
  
  let filledFields = 0;
  let totalFields = fields.length;
  let hasErrors = false;
  
  for (const fieldName of fields) {
    const value = formValues[fieldName];
    
    // Check if field has error
    if (formErrors[fieldName]) {
      hasErrors = true;
    }
    
    // Check if field is filled
    if (value !== undefined && value !== null && value !== '') {
      // Handle array fields (chips)
      if (Array.isArray(value) && value.length > 0) {
        filledFields++;
      }
      // Handle string fields
      else if (typeof value === 'string' && value.trim() !== '') {
        filledFields++;
      }
      // Handle boolean fields
      else if (typeof value === 'boolean') {
        filledFields++;
      }
      // Handle number fields
      else if (typeof value === 'number') {
        filledFields++;
      }
    }
  }
  
  const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  
  return {
    percentage,
    filledFields,
    totalFields,
    hasErrors,
  };
}

/**
 * Calculate overall form completion
 * 
 * @param sections - array of section configs
 * @param formValues - current form values
 * @param formErrors - current form errors
 * @returns overall completion percentage
 */
export function calculateOverallCompletion(
  sections: SectionConfig[],
  formValues: Record<string, any>,
  formErrors: Record<string, any> = {}
): number {
  let totalFields = 0;
  let filledFields = 0;
  
  for (const section of sections) {
    const completion = calculateSectionCompletion(section, formValues, formErrors);
    totalFields += completion.totalFields;
    filledFields += completion.filledFields;
  }
  
  return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
}

/**
 * Get incomplete sections
 * 
 * @param sections - array of section configs
 * @param formValues - current form values
 * @returns array of incomplete section IDs
 */
export function getIncompleteSections(
  sections: SectionConfig[],
  formValues: Record<string, any>
): string[] {
  return sections
    .filter(section => {
      const completion = calculateSectionCompletion(section, formValues);
      return completion.percentage < 100;
    })
    .map(section => section.id);
}

/**
 * Get sections with errors
 * 
 * @param sections - array of section configs
 * @param formErrors - current form errors
 * @returns array of section IDs with errors
 */
export function getSectionsWithErrors(
  sections: SectionConfig[],
  formErrors: Record<string, any>
): string[] {
  return sections
    .filter(section => {
      return section.fields.some(field => formErrors[field]);
    })
    .map(section => section.id);
}
