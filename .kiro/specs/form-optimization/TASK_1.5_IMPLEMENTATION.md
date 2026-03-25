# Task 1.5 Implementation: Chip Analyzer Module

## Overview

Created the Chip Analyzer module (`server/lib/chip-analyzer.ts`) to analyze chip collections for optimization. The module calculates selection rates, identifies missing chips, finds rarely-used chips, validates coverage, and ensures proper Swedish real estate terminology.

## Implementation Details

### Module: `server/lib/chip-analyzer.ts`

**Interfaces Implemented:**
- `ChipAnalyzer` - Main analyzer interface with 5 methods
- `ChipUsageStats` - Usage statistics for individual chips
- `ChipRecommendation` - Recommendations for adding/removing chips
- `TerminologyIssue` - Terminology validation issues
- `FormSubmission` - Historical form submission data structure

**Functions Implemented:**

1. **analyzeChipUsage(historicalData: FormSubmission[]): ChipUsageStats[]**
   - Calculates selection rates for all chips across historical submissions
   - Tracks selection count and percentage for each chip
   - Sorts results by selection rate descending
   - Returns empty array for no data

2. **identifyMissingChips(freetextData: string[], category: string): ChipRecommendation[]**
   - Analyzes freetext entries to find frequently-entered features
   - Uses 15% frequency threshold for recommendations
   - Normalizes and tokenizes text (splits by commas, semicolons, periods)
   - Filters out features already covered by existing chips
   - Skips very short features (<3 characters)
   - Sorts recommendations by frequency descending

3. **identifyRarelyUsedChips(usageStats: ChipUsageStats[], threshold: number = 5): ChipRecommendation[]**
   - Identifies chips with selection rate below threshold (default 5%)
   - Provides removal recommendations with usage statistics
   - Sorts by selection rate ascending (rarest first)
   - Includes clear reasoning in recommendations

4. **validateChipCoverage(category: string, topFeatures: string[]): boolean**
   - Validates that top 10 most common features are covered by chips
   - Normalizes chip labels for case-insensitive comparison
   - Returns true if all top 10 features are covered
   - Returns true for empty feature lists

5. **analyzeChipTerminology(chips: string[]): TerminologyIssue[]**
   - Identifies ambiguous chip labels (e.g., "med årtal")
   - Detects combined features (using "/" or "och")
   - Flags vague terms (uppdaterade, nytt, bra, fint)
   - Provides suggestions for improvement
   - Returns empty array for chips with no issues

**Reference Data:**
- `CHIP_COLLECTIONS` - All 10 chip categories with current chips (80+ total)
- `STANDARD_TERMINOLOGY` - Swedish real estate terminology reference
- `AMBIGUOUS_LABELS` - Known problematic chip labels

### Tests: `server/tests/chip-analyzer.test.ts`

**Test Coverage:**
- analyzeChipUsage: 6 tests
- identifyMissingChips: 7 tests
- identifyRarelyUsedChips: 7 tests
- validateChipCoverage: 6 tests
- analyzeChipTerminology: 5 tests
- Integration scenarios: 2 tests

**Total: 33 unit tests**

**Key Test Scenarios:**
- Selection rate calculation accuracy
- Frequency threshold enforcement (15% for additions, 5% for removals)
- Normalization and tokenization of freetext
- Top-10 coverage validation
- Terminology issue detection
- Empty input handling
- Sorting behavior verification
- Real-world usage patterns

## Requirements Validated

✅ **Requirement 3.1:** Analyze historical form submissions for chip usage
✅ **Requirement 3.2:** Identify features appearing in >15% of submissions
✅ **Requirement 3.3:** Identify chips with <5% selection rate
✅ **Requirement 3.4:** Identify missing common features
✅ **Requirement 3.5:** Ensure top 10 feature coverage
✅ **Requirement 3.6:** Validate Swedish real estate terminology

## Integration Points

The Chip Analyzer integrates with:
- **Form Auditor** - Uses platform requirements for context
- **Gap Analyzer** - Provides chip coverage data for redundancy detection
- **Analysis Script** - Will be orchestrated in `script/analyze-form-optimization.ts`
- **PromptFormProfessional.tsx** - References current chip collections

## Next Steps

1. Task 1.6: Write property tests for Chip Analyzer (Properties 9, 10, 11)
2. Task 1.7: Create Field Impact Analyzer module
3. Task 1.9: Create analysis orchestration script to use all analyzers together

## Notes

- Module uses minimal dependencies (no external libraries required)
- All functions handle edge cases (empty inputs, missing data)
- TypeScript compilation passes with no errors
- Ready for integration with analysis orchestration script
- Tests follow existing patterns from form-auditor and gap-analyzer tests
