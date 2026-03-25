/**
 * Field Impact Analyzer Module
 * 
 * Measures correlation between field completion and text quality. Calculates
 * fill rates, appearance rates, quality correlations, and composite impact scores
 * to identify which form fields actually improve generated text quality.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

// ── TYPES ──

export interface FieldImpactMetrics {
  fieldName: string;
  fillRate: number; // percentage of submissions where field is filled (0-100)
  appearanceRate: number; // percentage of generated texts where field data appears (0-100)
  qualityCorrelation: number; // Pearson correlation with quality scores (-1 to 1)
  impactScore: number; // composite score (0-100)
  category: 'high_impact' | 'medium_impact' | 'low_impact';
}

export interface FormSubmission {
  id: string;
  userId: string;
  timestamp: Date;
  propertyType: 'apartment' | 'house' | 'townhouse' | 'villa';
  platform: 'hemnet' | 'booli' | 'general';
  fieldData: Record<string, any>;
  chipSelections: Record<string, string[]>;
  generatedTextId?: string;
}

export interface GeneratedText {
  id: string;
  submissionId: string;
  mainText: string;
  headline: string;
  socialPost: string;
  qualityScore: number;
  fieldDataUsed: string[]; // which fields appeared in generated text
}

export interface QualityScore {
  textId: string;
  overallScore: number; // 0-100
  brokerRealism: number;
  factualAccuracy: number;
  readability: number;
  forbiddenPhrasesPenalty: number;
  userRating?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

export interface FieldImpactAnalyzer {
  analyzeFieldImpact(
    submissions: FormSubmission[],
    generatedTexts: GeneratedText[],
    qualityScores: QualityScore[]
  ): FieldImpactMetrics[];
  identifyHighImpactFields(metrics: FieldImpactMetrics[]): string[];
  identifyLowImpactFields(metrics: FieldImpactMetrics[]): string[];
  validatePriorityAlignment(
    priorityFields: string[],
    impactMetrics: FieldImpactMetrics[]
  ): ValidationResult;
}

// ── CONSTANTS ──

/**
 * Impact score thresholds for categorization.
 */
const HIGH_IMPACT_THRESHOLD = 70;
const LOW_IMPACT_THRESHOLD = 40;

/**
 * Composite impact score weights.
 * Formula: (fillRate * 0.3) + (appearanceRate * 0.4) + (qualityCorrelation * 0.3)
 */
const IMPACT_WEIGHTS = {
  fillRate: 0.3,
  appearanceRate: 0.4,
  qualityCorrelation: 0.3,
};

/**
 * Minimum impact score for critical priority fields.
 */
const CRITICAL_FIELD_MIN_IMPACT = 60;

// ── HELPER FUNCTIONS ──

/**
 * Checks if a field value is filled (not empty, null, or undefined).
 */
function isFieldFilled(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}

/**
 * Calculates the Pearson correlation coefficient between two arrays.
 * Returns a value between -1 (perfect negative correlation) and 1 (perfect positive correlation).
 * Returns 0 if there's no variance in either array.
 * 
 * @param x - First array of numeric values
 * @param y - Second array of numeric values
 * @returns Pearson correlation coefficient (-1 to 1)
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }
  
  const n = x.length;
  
  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate standard deviations and covariance
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }
  
  // Handle zero variance cases
  if (sumX2 === 0 || sumY2 === 0) {
    return 0;
  }
  
  // Calculate correlation
  const correlation = sumXY / Math.sqrt(sumX2 * sumY2);
  
  // Clamp to [-1, 1] to handle floating point errors
  return Math.max(-1, Math.min(1, correlation));
}

/**
 * Normalizes quality correlation from [-1, 1] to [0, 100] for impact score calculation.
 * Negative correlations are treated as 0 impact.
 */
function normalizeCorrelationForImpact(correlation: number): number {
  // Only positive correlations contribute to impact
  return Math.max(0, correlation) * 100;
}

/**
 * Calculates composite impact score using weighted formula.
 * Formula: (fillRate * 0.3) + (appearanceRate * 0.4) + (qualityCorrelation * 0.3)
 * 
 * @param fillRate - Fill rate percentage (0-100)
 * @param appearanceRate - Appearance rate percentage (0-100)
 * @param qualityCorrelation - Pearson correlation (-1 to 1)
 * @returns Composite impact score (0-100)
 */
function calculateImpactScore(
  fillRate: number,
  appearanceRate: number,
  qualityCorrelation: number
): number {
  const normalizedCorrelation = normalizeCorrelationForImpact(qualityCorrelation);
  
  const score = 
    (fillRate * IMPACT_WEIGHTS.fillRate) +
    (appearanceRate * IMPACT_WEIGHTS.appearanceRate) +
    (normalizedCorrelation * IMPACT_WEIGHTS.qualityCorrelation);
  
  // Clamp to [0, 100]
  return Math.max(0, Math.min(100, score));
}

/**
 * Categorizes impact score into high/medium/low.
 */
function categorizeImpact(impactScore: number): 'high_impact' | 'medium_impact' | 'low_impact' {
  if (impactScore > HIGH_IMPACT_THRESHOLD) return 'high_impact';
  if (impactScore < LOW_IMPACT_THRESHOLD) return 'low_impact';
  return 'medium_impact';
}

// ── FIELD IMPACT ANALYZER IMPLEMENTATION ──

/**
 * Creates a Field Impact Analyzer instance for measuring field impact on text quality.
 */
export function createFieldImpactAnalyzer(): FieldImpactAnalyzer {
  return {
    /**
     * Analyzes field impact by calculating fill rates, appearance rates, and quality correlations.
     * 
     * @param submissions - Array of historical form submissions
     * @param generatedTexts - Array of generated texts linked to submissions
     * @param qualityScores - Array of quality scores for generated texts
     * @returns Array of field impact metrics
     */
    analyzeFieldImpact(
      submissions: FormSubmission[],
      generatedTexts: GeneratedText[],
      qualityScores: QualityScore[]
    ): FieldImpactMetrics[] {
      if (submissions.length === 0) {
        return [];
      }
      
      // Build lookup maps for efficient access
      const textsBySubmissionId = new Map<string, GeneratedText>();
      generatedTexts.forEach(text => {
        textsBySubmissionId.set(text.submissionId, text);
      });
      
      const scoresByTextId = new Map<string, QualityScore>();
      qualityScores.forEach(score => {
        scoresByTextId.set(score.textId, score);
      });
      
      // Collect all unique field names from submissions
      const allFieldNames = new Set<string>();
      submissions.forEach(submission => {
        Object.keys(submission.fieldData).forEach(field => {
          allFieldNames.add(field);
        });
      });
      
      // Calculate metrics for each field
      const metrics: FieldImpactMetrics[] = [];
      
      allFieldNames.forEach(fieldName => {
        let filledCount = 0;
        let appearanceCount = 0;
        const fieldCompletionValues: number[] = [];
        const qualityScoreValues: number[] = [];
        
        submissions.forEach(submission => {
          const fieldValue = submission.fieldData[fieldName];
          const isFilled = isFieldFilled(fieldValue);
          
          // Track fill rate
          if (isFilled) {
            filledCount++;
          }
          
          // Track appearance rate and quality correlation
          const text = textsBySubmissionId.get(submission.id);
          if (text) {
            // Check if field data appears in generated text
            const appearsInText = text.fieldDataUsed?.includes(fieldName) || false;
            if (appearsInText) {
              appearanceCount++;
            }
            
            // Collect data for correlation calculation
            const score = scoresByTextId.get(text.id);
            if (score) {
              fieldCompletionValues.push(isFilled ? 1 : 0);
              qualityScoreValues.push(score.overallScore);
            }
          }
        });
        
        // Calculate rates
        const fillRate = (filledCount / submissions.length) * 100;
        const textsWithSubmissions = submissions.filter(s => textsBySubmissionId.has(s.id)).length;
        const appearanceRate = textsWithSubmissions > 0 
          ? (appearanceCount / textsWithSubmissions) * 100 
          : 0;
        
        // Calculate quality correlation
        const qualityCorrelation = fieldCompletionValues.length > 0
          ? calculatePearsonCorrelation(fieldCompletionValues, qualityScoreValues)
          : 0;
        
        // Calculate composite impact score
        const impactScore = calculateImpactScore(fillRate, appearanceRate, qualityCorrelation);
        
        metrics.push({
          fieldName,
          fillRate,
          appearanceRate,
          qualityCorrelation,
          impactScore,
          category: categorizeImpact(impactScore),
        });
      });
      
      // Sort by impact score descending
      metrics.sort((a, b) => b.impactScore - a.impactScore);
      
      return metrics;
    },

    /**
     * Identifies high-impact fields (score >70).
     * These fields significantly improve text quality when filled.
     * 
     * @param metrics - Array of field impact metrics
     * @returns Array of high-impact field names
     */
    identifyHighImpactFields(metrics: FieldImpactMetrics[]): string[] {
      return metrics
        .filter(m => m.impactScore > HIGH_IMPACT_THRESHOLD)
        .map(m => m.fieldName);
    },

    /**
     * Identifies low-impact fields (score <40).
     * These fields have minimal effect on text quality.
     * 
     * @param metrics - Array of field impact metrics
     * @returns Array of low-impact field names
     */
    identifyLowImpactFields(metrics: FieldImpactMetrics[]): string[] {
      return metrics
        .filter(m => m.impactScore < LOW_IMPACT_THRESHOLD)
        .map(m => m.fieldName);
    },

    /**
     * Validates that critical priority fields have high impact scores.
     * Critical fields should have impact score >60 to justify their priority.
     * 
     * @param priorityFields - Array of field names marked as critical priority
     * @param impactMetrics - Array of field impact metrics
     * @returns Validation result with issues and warnings
     */
    validatePriorityAlignment(
      priorityFields: string[],
      impactMetrics: FieldImpactMetrics[]
    ): ValidationResult {
      const result: ValidationResult = {
        valid: true,
        issues: [],
        warnings: [],
      };
      
      // Build lookup map for quick access
      const metricsByField = new Map<string, FieldImpactMetrics>();
      impactMetrics.forEach(metric => {
        metricsByField.set(metric.fieldName, metric);
      });
      
      // Check each priority field
      priorityFields.forEach(fieldName => {
        const metric = metricsByField.get(fieldName);
        
        if (!metric) {
          result.warnings.push(
            `Priority field "${fieldName}" has no impact metrics (not found in historical data)`
          );
          return;
        }
        
        if (metric.impactScore < CRITICAL_FIELD_MIN_IMPACT) {
          result.valid = false;
          result.issues.push(
            `Priority field "${fieldName}" has low impact score (${metric.impactScore.toFixed(1)}) - expected >${CRITICAL_FIELD_MIN_IMPACT} for critical fields`
          );
        }
      });
      
      return result;
    },
  };
}

/**
 * Default export for convenience.
 */
export default createFieldImpactAnalyzer;
