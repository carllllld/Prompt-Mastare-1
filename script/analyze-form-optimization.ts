/**
 * Form Optimization Analysis Orchestration Script
 * 
 * Orchestrates all form optimization analyzers to produce a comprehensive
 * optimization report. Queries historical form submissions and generated texts
 * from the database, runs all analyzers, and outputs findings and recommendations.
 * 
 * Requirements: 1.5
 * 
 * Usage:
 *   npm run analyze-form-optimization
 *   npm run analyze-form-optimization -- --audit-only
 *   npm run analyze-form-optimization -- --chips-only
 *   npm run analyze-form-optimization -- --impact-only
 */

import { db } from '../server/db';
import { createFormAuditor } from '../server/lib/form-auditor';
import { createGapAnalyzer } from '../server/lib/gap-analyzer';
import { createChipAnalyzer } from '../server/lib/chip-analyzer';
import { createFieldImpactAnalyzer } from '../server/lib/field-impact-analyzer';
import type {
  FormSubmission,
  GeneratedText,
  QualityScore,
  FieldImpactMetrics,
} from '../server/lib/field-impact-analyzer';
import type { FieldGap } from '../server/lib/gap-analyzer';
import type { ChipRecommendation, ChipUsageStats } from '../server/lib/chip-analyzer';
import type { PlatformRequirement } from '../server/lib/form-auditor';

// ── TYPES ──

interface OptimizationReport {
  timestamp: Date;
  currentFormAnalysis: {
    totalFields: number;
    requiredFields: number;
    optionalFields: number;
    chipCategories: number;
    totalChips: number;
  };
  platformCompliance: {
    hemnetMandatoryMissing: string[];
    hemnetRecommendedMissing: string[];
    booliMandatoryMissing: string[];
    booliRecommendedMissing: string[];
  };
  fieldGaps: FieldGap[];
  chipRecommendations: ChipRecommendation[];
  chipUsageStats: ChipUsageStats[];
  fieldImpactMetrics: FieldImpactMetrics[];
  recommendations: {
    fieldsToAdd: string[];
    fieldsToRemove: string[];
    fieldsToConsolidate: Array<{ fields: string[]; into: string }>;
    chipsToAdd: Array<{ category: string; label: string }>;
    chipsToRemove: Array<{ category: string; label: string }>;
    priorityAdjustments: Array<{ field: string; from: string; to: string }>;
  };
}

interface CliOptions {
  auditOnly: boolean;
  chipsOnly: boolean;
  impactOnly: boolean;
  minSubmissions: number;
}

// ── CONSTANTS ──

const MINIMUM_SUBMISSIONS = 100;
const DEFAULT_CLI_OPTIONS: CliOptions = {
  auditOnly: false,
  chipsOnly: false,
  impactOnly: false,
  minSubmissions: MINIMUM_SUBMISSIONS,
};

// ── CLI ARGUMENT PARSING ──

function parseCliArguments(): CliOptions {
  const args = process.argv.slice(2);
  const options = { ...DEFAULT_CLI_OPTIONS };

  args.forEach(arg => {
    if (arg === '--audit-only') options.auditOnly = true;
    if (arg === '--chips-only') options.chipsOnly = true;
    if (arg === '--impact-only') options.impactOnly = true;
    if (arg.startsWith('--min-submissions=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!isNaN(value) && value > 0) {
        options.minSubmissions = value;
      }
    }
  });

  return options;
}

// ── DATA FETCHING ──

/**
 * Fetches historical form submissions from the database.
 * Requires minimum number of submissions for statistical validity.
 */
async function fetchHistoricalSubmissions(minCount: number): Promise<FormSubmission[]> {
  console.log(`Fetching historical form submissions (minimum ${minCount})...`);
  
  try {
    // Query the prompts table for historical submissions
    // Note: Adjust query based on actual database schema
    const results = await db.query(`
      SELECT 
        id,
        user_id as "userId",
        created_at as timestamp,
        property_type as "propertyType",
        'general' as platform,
        structured_data as "fieldData",
        chip_selections as "chipSelections",
        generated_text_id as "generatedTextId"
      FROM prompts
      WHERE structured_data IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1000
    `);
    
    const submissions: FormSubmission[] = results.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      timestamp: new Date(row.timestamp),
      propertyType: row.propertyType || 'apartment',
      platform: row.platform || 'general',
      fieldData: typeof row.fieldData === 'string' ? JSON.parse(row.fieldData) : row.fieldData,
      chipSelections: typeof row.chipSelections === 'string' ? JSON.parse(row.chipSelections) : (row.chipSelections || {}),
      generatedTextId: row.generatedTextId,
    }));
    
    console.log(`✓ Fetched ${submissions.length} submissions`);
    
    if (submissions.length < minCount) {
      console.warn(`⚠ Warning: Only ${submissions.length} submissions found (minimum ${minCount} recommended for statistical validity)`);
    }
    
    return submissions;
  } catch (error) {
    console.error('✗ Error fetching submissions:', error);
    throw error;
  }
}

/**
 * Fetches generated texts linked to form submissions.
 */
async function fetchGeneratedTexts(submissionIds: string[]): Promise<GeneratedText[]> {
  if (submissionIds.length === 0) return [];
  
  console.log(`Fetching generated texts for ${submissionIds.length} submissions...`);
  
  try {
    // Query generated texts
    // Note: Adjust query based on actual database schema
    const results = await db.query(`
      SELECT 
        id,
        prompt_id as "submissionId",
        main_text as "mainText",
        headline,
        social_post as "socialPost",
        quality_score as "qualityScore",
        field_data_used as "fieldDataUsed"
      FROM generated_texts
      WHERE prompt_id = ANY($1)
    `, [submissionIds]);
    
    const texts: GeneratedText[] = results.rows.map(row => ({
      id: row.id,
      submissionId: row.submissionId,
      mainText: row.mainText || '',
      headline: row.headline || '',
      socialPost: row.socialPost || '',
      qualityScore: row.qualityScore || 0,
      fieldDataUsed: typeof row.fieldDataUsed === 'string' ? JSON.parse(row.fieldDataUsed) : (row.fieldDataUsed || []),
    }));
    
    console.log(`✓ Fetched ${texts.length} generated texts`);
    
    return texts;
  } catch (error) {
    console.error('✗ Error fetching generated texts:', error);
    throw error;
  }
}

/**
 * Fetches quality scores for generated texts.
 */
async function fetchQualityScores(textIds: string[]): Promise<QualityScore[]> {
  if (textIds.length === 0) return [];
  
  console.log(`Fetching quality scores for ${textIds.length} texts...`);
  
  try {
    // Query quality scores
    // Note: Adjust query based on actual database schema
    const results = await db.query(`
      SELECT 
        text_id as "textId",
        overall_score as "overallScore",
        broker_realism as "brokerRealism",
        factual_accuracy as "factualAccuracy",
        readability,
        forbidden_phrases_penalty as "forbiddenPhrasesPenalty",
        user_rating as "userRating"
      FROM quality_scores
      WHERE text_id = ANY($1)
    `, [textIds]);
    
    const scores: QualityScore[] = results.rows.map(row => ({
      textId: row.textId,
      overallScore: row.overallScore || 0,
      brokerRealism: row.brokerRealism || 0,
      factualAccuracy: row.factualAccuracy || 0,
      readability: row.readability || 0,
      forbiddenPhrasesPenalty: row.forbiddenPhrasesPenalty || 0,
      userRating: row.userRating,
    }));
    
    console.log(`✓ Fetched ${scores.length} quality scores`);
    
    return scores;
  } catch (error) {
    console.error('✗ Error fetching quality scores:', error);
    throw error;
  }
}

// ── ANALYSIS ORCHESTRATION ──

/**
 * Runs all analyzers and produces comprehensive optimization report.
 */
async function runAnalysis(options: CliOptions): Promise<OptimizationReport> {
  console.log('\n=== Form Optimization Analysis ===\n');
  
  // Fetch historical data
  const submissions = await fetchHistoricalSubmissions(options.minSubmissions);
  
  if (submissions.length === 0) {
    throw new Error('No historical submissions found. Cannot perform analysis.');
  }
  
  const submissionIds = submissions.map(s => s.id);
  const texts = await fetchGeneratedTexts(submissionIds);
  const textIds = texts.map(t => t.id);
  const scores = await fetchQualityScores(textIds);
  
  console.log('\n--- Running Analyzers ---\n');
  
  // Initialize analyzers
  const formAuditor = createFormAuditor();
  const gapAnalyzer = createGapAnalyzer();
  const chipAnalyzer = createChipAnalyzer();
  const fieldImpactAnalyzer = createFieldImpactAnalyzer();
  
  // Run Form Auditor (unless skipped)
  let hemnetRequirements: PlatformRequirement[] = [];
  let booliRequirements: PlatformRequirement[] = [];
  let currentFields: string[] = [];
  
  if (!options.chipsOnly && !options.impactOnly) {
    console.log('Running Form Auditor...');
    hemnetRequirements = formAuditor.auditHemnetCompliance();
    booliRequirements = formAuditor.auditBooliCompliance();
    currentFields = formAuditor.getCurrentFormFields();
    console.log(`✓ Audited ${currentFields.length} current fields against platform requirements`);
  }
  
  // Run Gap Analyzer (unless skipped)
  let fieldGaps: FieldGap[] = [];
  
  if (!options.chipsOnly && !options.impactOnly) {
    console.log('Running Gap Analyzer...');
    const allRequirements = [...hemnetRequirements, ...booliRequirements];
    fieldGaps = gapAnalyzer.analyzeGaps(currentFields, allRequirements, submissions);
    console.log(`✓ Identified ${fieldGaps.length} field gaps`);
  }
  
  // Run Chip Analyzer (unless skipped)
  let chipUsageStats: ChipUsageStats[] = [];
  let chipRecommendations: ChipRecommendation[] = [];
  
  if (!options.auditOnly && !options.impactOnly) {
    console.log('Running Chip Analyzer...');
    chipUsageStats = chipAnalyzer.analyzeChipUsage(submissions);
    
    // Identify missing and rarely used chips
    const missingChips = chipAnalyzer.identifyMissingChips(submissions);
    const rareChips = chipAnalyzer.identifyRarelyUsedChips(chipUsageStats, 5);
    
    chipRecommendations = [...missingChips, ...rareChips];
    console.log(`✓ Analyzed ${chipUsageStats.length} chips, generated ${chipRecommendations.length} recommendations`);
  }
  
  // Run Field Impact Analyzer (unless skipped)
  let fieldImpactMetrics: FieldImpactMetrics[] = [];
  
  if (!options.auditOnly && !options.chipsOnly) {
    console.log('Running Field Impact Analyzer...');
    fieldImpactMetrics = fieldImpactAnalyzer.analyzeFieldImpact(submissions, texts, scores);
    console.log(`✓ Analyzed impact for ${fieldImpactMetrics.length} fields`);
  }
  
  // Build recommendations
  console.log('\n--- Generating Recommendations ---\n');
  
  const recommendations = buildRecommendations(
    fieldGaps,
    chipRecommendations,
    fieldImpactMetrics
  );
  
  // Build report
  const report: OptimizationReport = {
    timestamp: new Date(),
    currentFormAnalysis: {
      totalFields: currentFields.length,
      requiredFields: 0, // TODO: Calculate from field metadata
      optionalFields: 0, // TODO: Calculate from field metadata
      chipCategories: 10, // TODO: Calculate dynamically
      totalChips: chipUsageStats.length,
    },
    platformCompliance: {
      hemnetMandatoryMissing: fieldGaps
        .filter(g => g.gapType === 'missing_mandatory' && g.reason.includes('Hemnet'))
        .map(g => g.fieldName),
      hemnetRecommendedMissing: fieldGaps
        .filter(g => g.gapType === 'missing_recommended' && g.reason.includes('Hemnet'))
        .map(g => g.fieldName),
      booliMandatoryMissing: fieldGaps
        .filter(g => g.gapType === 'missing_mandatory' && g.reason.includes('Booli'))
        .map(g => g.fieldName),
      booliRecommendedMissing: fieldGaps
        .filter(g => g.gapType === 'missing_recommended' && g.reason.includes('Booli'))
        .map(g => g.fieldName),
    },
    fieldGaps,
    chipRecommendations,
    chipUsageStats,
    fieldImpactMetrics,
    recommendations,
  };
  
  return report;
}

/**
 * Builds actionable recommendations from analysis results.
 */
function buildRecommendations(
  fieldGaps: FieldGap[],
  chipRecommendations: ChipRecommendation[],
  fieldImpactMetrics: FieldImpactMetrics[]
) {
  return {
    fieldsToAdd: fieldGaps
      .filter(g => g.recommendation === 'add')
      .map(g => g.fieldName),
    
    fieldsToRemove: [
      ...fieldGaps.filter(g => g.recommendation === 'remove').map(g => g.fieldName),
      ...fieldImpactMetrics.filter(m => m.category === 'low_impact' && m.fillRate < 20).map(m => m.fieldName),
    ],
    
    fieldsToConsolidate: fieldGaps
      .filter(g => g.recommendation === 'consolidate' && g.consolidateWith)
      .map(g => ({
        fields: [g.fieldName, g.consolidateWith!],
        into: g.consolidateWith!,
      })),
    
    chipsToAdd: chipRecommendations
      .filter(r => r.action === 'add')
      .map(r => ({
        category: r.category,
        label: r.chipLabel,
      })),
    
    chipsToRemove: chipRecommendations
      .filter(r => r.action === 'remove')
      .map(r => ({
        category: r.category,
        label: r.chipLabel,
      })),
    
    priorityAdjustments: fieldImpactMetrics
      .filter(m => m.category === 'high_impact')
      .map(m => ({
        field: m.fieldName,
        from: 'optional',
        to: 'critical',
      })),
  };
}

// ── OUTPUT FORMATTING ──

/**
 * Outputs report as JSON file.
 */
async function outputJsonReport(report: OptimizationReport): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const outputPath = path.join(__dirname, '..', 'form-optimization-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  
  console.log(`\n✓ JSON report saved to: ${outputPath}`);
}

/**
 * Outputs human-readable summary to console.
 */
function outputHumanReadableSummary(report: OptimizationReport): void {
  console.log('\n=== Optimization Report Summary ===\n');
  console.log(`Generated: ${report.timestamp.toISOString()}\n`);
  
  console.log('Current Form:');
  console.log(`  - Total Fields: ${report.currentFormAnalysis.totalFields}`);
  console.log(`  - Total Chips: ${report.currentFormAnalysis.totalChips}`);
  console.log(`  - Chip Categories: ${report.currentFormAnalysis.chipCategories}\n`);
  
  console.log('Platform Compliance:');
  console.log(`  - Hemnet Mandatory Missing: ${report.platformCompliance.hemnetMandatoryMissing.length}`);
  console.log(`  - Hemnet Recommended Missing: ${report.platformCompliance.hemnetRecommendedMissing.length}`);
  console.log(`  - Booli Mandatory Missing: ${report.platformCompliance.booliMandatoryMissing.length}`);
  console.log(`  - Booli Recommended Missing: ${report.platformCompliance.booliRecommendedMissing.length}\n`);
  
  console.log('Recommendations:');
  console.log(`  - Fields to Add: ${report.recommendations.fieldsToAdd.length}`);
  console.log(`  - Fields to Remove: ${report.recommendations.fieldsToRemove.length}`);
  console.log(`  - Fields to Consolidate: ${report.recommendations.fieldsToConsolidate.length}`);
  console.log(`  - Chips to Add: ${report.recommendations.chipsToAdd.length}`);
  console.log(`  - Chips to Remove: ${report.recommendations.chipsToRemove.length}`);
  console.log(`  - Priority Adjustments: ${report.recommendations.priorityAdjustments.length}\n`);
  
  if (report.recommendations.fieldsToAdd.length > 0) {
    console.log('Top Fields to Add:');
    report.recommendations.fieldsToAdd.slice(0, 5).forEach(field => {
      console.log(`  - ${field}`);
    });
    console.log();
  }
  
  if (report.recommendations.fieldsToRemove.length > 0) {
    console.log('Top Fields to Remove:');
    report.recommendations.fieldsToRemove.slice(0, 5).forEach(field => {
      console.log(`  - ${field}`);
    });
    console.log();
  }
  
  if (report.fieldImpactMetrics.length > 0) {
    console.log('Top 5 High-Impact Fields:');
    report.fieldImpactMetrics
      .filter(m => m.category === 'high_impact')
      .slice(0, 5)
      .forEach(m => {
        console.log(`  - ${m.fieldName}: ${m.impactScore.toFixed(1)} (fill: ${m.fillRate.toFixed(1)}%, appear: ${m.appearanceRate.toFixed(1)}%)`);
      });
    console.log();
  }
  
  console.log('=== End of Report ===\n');
}

// ── MAIN EXECUTION ──

async function main() {
  try {
    const options = parseCliArguments();
    
    console.log('Options:', options);
    
    const report = await runAnalysis(options);
    
    await outputJsonReport(report);
    outputHumanReadableSummary(report);
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if executed directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runAnalysis, OptimizationReport };
