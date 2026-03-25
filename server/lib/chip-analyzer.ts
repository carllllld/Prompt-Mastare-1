/**
 * Chip Analyzer Module
 * 
 * Analyzes chip collections to optimize coverage and usage. Calculates selection
 * rates from historical data, identifies missing chips for frequently-entered features,
 * identifies rarely-used chips, validates coverage, and ensures proper terminology.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

// ── TYPES ──

export interface ChipUsageStats {
  chipLabel: string;
  category: string;
  selectionCount: number;
  selectionRate: number; // percentage of submissions
  appearsInGeneratedText: boolean;
  averageQualityImpact: number;
}

export interface ChipRecommendation {
  action: 'add' | 'remove' | 'relabel';
  category: string;
  chipLabel: string;
  reason: string;
  frequency?: number;
  suggestedLabel?: string;
}

export interface TerminologyIssue {
  chipLabel: string;
  category: string;
  issue: 'ambiguous' | 'non_standard' | 'unclear' | 'inconsistent';
  suggestion: string;
}

export interface FormSubmission {
  id: string;
  userId: string;
  timestamp: Date;
  propertyType: 'apartment' | 'house' | 'townhouse' | 'villa';
  platform: 'hemnet' | 'booli' | 'general';
  chipSelections: Record<string, string[]>;
  freetextFields: Record<string, string>;
  generatedTextId?: string;
}

export interface ChipAnalyzer {
  analyzeChipUsage(historicalData: FormSubmission[]): ChipUsageStats[];
  identifyMissingChips(freetextData: string[], category: string): ChipRecommendation[];
  identifyRarelyUsedChips(usageStats: ChipUsageStats[], threshold: number): ChipRecommendation[];
  validateChipCoverage(category: string, topFeatures: string[]): boolean;
  analyzeChipTerminology(chips: string[]): TerminologyIssue[];
}

// ── CHIP COLLECTIONS REFERENCE ──

/**
 * Current chip collections from PromptFormProfessional.tsx
 */
const CHIP_COLLECTIONS: Record<string, string[]> = {
  kitchen: [
    "Renoverat kök", "Köksö", "Stenbänk/komposit",
    "Integrerade vitvaror", "Platsbyggt kök", "Matplats 4–6 pers",
    "Öppen planlösning", "Vitvaror uppdaterade", "Fönster vid matplats",
  ],
  bathroom: [
    "Helkaklat", "Renoverat badrum", "Duschvägg i glas",
    "Badkar", "Tvättmaskin", "Torktumlare",
  ],
  flooring: [
    "Ekparkett", "Originalparkett", "Björkparkett",
    "Massivt trägolv", "Klinker", "Stengolv",
  ],
  heating: [
    "Fjärrvärme", "Bergvärme", "Luft-vattenvärmepump", "Luft-luftvärmepump",
    "Golvvärme", "Frånluftsvärmepump", "Vattenburen värme",
  ],
  special: [
    "Stambyte genomfört", "Nya fönster", "Nytt tak",
    "Dränering utförd", "Solceller", "Fiber indraget",
    "Braskamin", "Kakelugn", "Originaldetaljer",
  ],
  garden: [
    "Välskött trädgård", "Uteplats i söder", "Altan/trädäck",
    "Fruktträd", "Insynsskyddat", "Förråd/bod", "Pergola", "Eldstad ute",
  ],
  usp: [
    "Söderläge", "Fri utsikt", "Ingen insyn", "Lugn gårdssida",
    "Genomgående planlösning", "Låg avgift", "Stabil BRF",
    "Renoverat kök med årtal", "Renoverat badrum med årtal",
    "Nära pendling", "Garage/laddbox", "Flera badrum",
  ],
  parking: [
    "Garage", "Dubbelgarage", "Carport", "P-plats",
    "Garageplats", "Boendeparkering", "Laddbox för elbil", "Förberett för laddbox",
  ],
  roof: [
    "Plåttak", "Betongpannor", "Tegeltak", "Papptak", "Platt tak",
  ],
  material: [
    "Trä", "Tegel", "Puts", "Betong", "Plåt", "Leca",
  ],
};

// ── SWEDISH REAL ESTATE TERMINOLOGY REFERENCE ──

/**
 * Standard Swedish real estate terminology for validation.
 * Based on Hemnet/Booli conventions and Swedish real estate law.
 */
const STANDARD_TERMINOLOGY: Record<string, string[]> = {
  // Kitchen terms
  kitchen: [
    "renoverat kök", "köksö", "stenbänk", "komposit", "integrerade vitvaror",
    "platsbyggt", "matplats", "öppen planlösning", "vitvaror", "fönster",
  ],
  // Bathroom terms
  bathroom: [
    "helkaklat", "renoverat badrum", "duschvägg", "glas", "badkar",
    "tvättmaskin", "torktumlare", "dusch", "wc", "handfat",
  ],
  // Flooring terms
  flooring: [
    "parkett", "ekparkett", "björkparkett", "massivt trägolv", "klinker",
    "stengolv", "laminat", "matta", "kakel", "trägolv",
  ],
  // Heating terms
  heating: [
    "fjärrvärme", "bergvärme", "värmepump", "golvvärme", "frånluft",
    "luft-vatten", "luft-luft", "vattenburen", "elvärme", "pellets",
  ],
  // Special features
  special: [
    "stambyte", "fönster", "tak", "dränering", "solceller", "fiber",
    "braskamin", "kakelugn", "originaldetaljer", "renovering",
  ],
  // Garden terms
  garden: [
    "trädgård", "uteplats", "altan", "trädäck", "fruktträd", "insynsskydd",
    "förråd", "bod", "pergola", "eldstad", "uterum", "växthus",
  ],
  // USP terms
  usp: [
    "söderläge", "utsikt", "insyn", "gårdssida", "planlösning", "avgift",
    "brf", "renoverat", "pendling", "garage", "laddbox", "badrum",
  ],
  // Parking terms
  parking: [
    "garage", "carport", "parkeringsplats", "p-plats", "garageplats",
    "boendeparkering", "laddbox", "elbil", "förberett",
  ],
  // Roof terms
  roof: [
    "plåttak", "betongpannor", "tegeltak", "papptak", "platt tak",
    "takpannor", "skiffer", "eternit",
  ],
  // Material terms
  material: [
    "trä", "tegel", "puts", "betong", "plåt", "leca",
    "sten", "glas", "stål", "aluminium",
  ],
};

/**
 * Ambiguous or problematic chip labels that should be clarified.
 */
const AMBIGUOUS_LABELS = [
  "Renoverat kök med årtal", // Unclear - should specify year in freetext
  "Renoverat badrum med årtal", // Unclear - should specify year in freetext
  "Stenbänk/komposit", // Two different materials combined
  "Altan/trädäck", // Two different structures combined
  "Garage/laddbox", // Two different features combined
];

// ── CHIP ANALYZER IMPLEMENTATION ──

/**
 * Creates a Chip Analyzer instance for analyzing chip collections.
 */
export function createChipAnalyzer(): ChipAnalyzer {
  return {
    /**
     * Analyzes chip usage from historical form submissions.
     * Calculates selection rates and quality impact for each chip.
     * 
     * @param historicalData - Array of historical form submissions
     * @returns Array of chip usage statistics
     */
    analyzeChipUsage(historicalData: FormSubmission[]): ChipUsageStats[] {
      const stats: ChipUsageStats[] = [];
      
      if (historicalData.length === 0) {
        return stats;
      }
      
      // Count selections for each chip across all categories
      const chipCounts = new Map<string, { category: string; count: number }>();
      
      historicalData.forEach(submission => {
        Object.entries(submission.chipSelections).forEach(([category, chips]) => {
          chips.forEach(chip => {
            const key = `${category}:${chip}`;
            const existing = chipCounts.get(key);
            if (existing) {
              existing.count++;
            } else {
              chipCounts.set(key, { category, count: 1 });
            }
          });
        });
      });
      
      // Calculate selection rates
      const totalSubmissions = historicalData.length;
      
      chipCounts.forEach((data, key) => {
        const chipLabel = key.split(':')[1];
        const selectionRate = (data.count / totalSubmissions) * 100;
        
        stats.push({
          chipLabel,
          category: data.category,
          selectionCount: data.count,
          selectionRate,
          appearsInGeneratedText: false, // Would require text analysis
          averageQualityImpact: 0, // Would require quality score correlation
        });
      });
      
      // Sort by selection rate descending
      stats.sort((a, b) => b.selectionRate - a.selectionRate);
      
      return stats;
    },

    /**
     * Identifies frequently-entered features in freetext that should become chips.
     * Analyzes freetext data to find features appearing in >15% of submissions.
     * 
     * @param freetextData - Array of freetext entries from a specific category
     * @param category - The chip category to analyze
     * @returns Array of chip recommendations for missing features
     */
    identifyMissingChips(freetextData: string[], category: string): ChipRecommendation[] {
      const recommendations: ChipRecommendation[] = [];
      
      if (freetextData.length === 0) {
        return recommendations;
      }
      
      // Tokenize and count feature mentions
      const featureCounts = new Map<string, number>();
      
      freetextData.forEach(text => {
        if (!text || text.trim().length === 0) return;
        
        // Normalize text: lowercase, split by common delimiters
        const normalized = text.toLowerCase().trim();
        const features = normalized.split(/[,;.]+/).map(f => f.trim()).filter(f => f.length > 0);
        
        features.forEach(feature => {
          // Skip very short features (likely not meaningful)
          if (feature.length < 3) return;
          
          featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1);
        });
      });
      
      // Calculate frequency threshold (15%)
      const threshold = freetextData.length * 0.15;
      
      // Get existing chips for this category (normalized for comparison)
      const existingChips = CHIP_COLLECTIONS[category] || [];
      const existingChipsNormalized = new Set(
        existingChips.map(chip => chip.toLowerCase().trim())
      );
      
      // Identify frequent features not covered by existing chips
      featureCounts.forEach((count, feature) => {
        if (count >= threshold && !existingChipsNormalized.has(feature)) {
          const frequency = (count / freetextData.length) * 100;
          
          recommendations.push({
            action: 'add',
            category,
            chipLabel: feature,
            reason: `Feature appears in ${frequency.toFixed(1)}% of submissions (threshold: 15%)`,
            frequency,
          });
        }
      });
      
      // Sort by frequency descending
      recommendations.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
      
      return recommendations;
    },

    /**
     * Identifies rarely-used chips that should be removed.
     * Default threshold is 5% - chips selected in <5% of submissions.
     * 
     * @param usageStats - Array of chip usage statistics
     * @param threshold - Selection rate threshold (default: 5%)
     * @returns Array of chip recommendations for removal
     */
    identifyRarelyUsedChips(usageStats: ChipUsageStats[], threshold: number = 5): ChipRecommendation[] {
      const recommendations: ChipRecommendation[] = [];
      
      usageStats.forEach(stat => {
        if (stat.selectionRate < threshold) {
          recommendations.push({
            action: 'remove',
            category: stat.category,
            chipLabel: stat.chipLabel,
            reason: `Chip selected in only ${stat.selectionRate.toFixed(1)}% of submissions (threshold: ${threshold}%)`,
            frequency: stat.selectionRate,
          });
        }
      });
      
      // Sort by selection rate ascending (rarest first)
      recommendations.sort((a, b) => (a.frequency || 0) - (b.frequency || 0));
      
      return recommendations;
    },

    /**
     * Validates that chip collections cover the top 10 most common features.
     * 
     * @param category - The chip category to validate
     * @param topFeatures - Array of top 10 most frequently entered features (normalized)
     * @returns True if all top 10 features are covered by chips, false otherwise
     */
    validateChipCoverage(category: string, topFeatures: string[]): boolean {
      if (topFeatures.length === 0) {
        return true; // No features to cover
      }
      
      // Get existing chips for this category (normalized)
      const existingChips = CHIP_COLLECTIONS[category] || [];
      const existingChipsNormalized = new Set(
        existingChips.map(chip => chip.toLowerCase().trim())
      );
      
      // Check if all top features are covered
      const top10 = topFeatures.slice(0, 10);
      const coveredCount = top10.filter(feature => 
        existingChipsNormalized.has(feature.toLowerCase().trim())
      ).length;
      
      // All top 10 features must be covered
      return coveredCount === top10.length;
    },

    /**
     * Analyzes chip terminology for Swedish real estate compliance.
     * Identifies ambiguous, non-standard, or unclear chip labels.
     * 
     * @param chips - Array of chip labels to analyze
     * @returns Array of terminology issues found
     */
    analyzeChipTerminology(chips: string[]): TerminologyIssue[] {
      const issues: TerminologyIssue[] = [];
      
      chips.forEach(chip => {
        // Check for ambiguous labels
        if (AMBIGUOUS_LABELS.includes(chip)) {
          issues.push({
            chipLabel: chip,
            category: 'unknown', // Would need category context
            issue: 'ambiguous',
            suggestion: 'Consider splitting into separate chips or adding tooltip for clarification',
          });
        }
        
        // Check for combined features (indicated by "/" or "och")
        if (chip.includes('/') || chip.toLowerCase().includes(' och ')) {
          issues.push({
            chipLabel: chip,
            category: 'unknown',
            issue: 'unclear',
            suggestion: 'Consider splitting combined features into separate chips',
          });
        }
        
        // Check for vague terms
        const vagueTerms = ['uppdaterade', 'med årtal', 'bra', 'fint', 'nytt'];
        const hasVagueTerm = vagueTerms.some(term => 
          chip.toLowerCase().includes(term)
        );
        
        if (hasVagueTerm) {
          issues.push({
            chipLabel: chip,
            category: 'unknown',
            issue: 'unclear',
            suggestion: 'Consider using more specific terminology',
          });
        }
      });
      
      return issues;
    },
  };
}

/**
 * Default export for convenience.
 */
export default createChipAnalyzer;
