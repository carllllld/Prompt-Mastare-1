# Design Document: Form Optimization

## Overview

This design optimizes OptiPrompt's property data collection form (PromptFormProfessional.tsx) to ensure compliance with Hemnet and Booli requirements, eliminate redundant fields, improve chip coverage, enhance UX flow, and validate field impact on generated text quality. The current 1894-line form has evolved organically and requires systematic analysis against actual platform requirements and broker workflows.

The optimization focuses on:
- Auditing all 60+ form fields against Hemnet/Booli APIs
- Analyzing chip collections (10 categories, 80+ options) for coverage and usage
- Validating field impact on the 7-stage AI text generation pipeline
- Improving mobile UX and accessibility compliance
- Streamlining broker workflows based on real usage patterns

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Form Optimization System                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │  Form Auditor    │──────│  Gap Analyzer    │            │
│  │  - Hemnet API    │      │  - Missing fields│            │
│  │  - Booli API     │      │  - Redundancies  │            │
│  │  - Field mapping │      │  - Priorities    │            │
│  └──────────────────┘      └──────────────────┘            │
│           │                          │                       │
│           ▼                          ▼                       │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │  Chip Analyzer   │      │ Field Impact     │            │
│  │  - Usage stats   │      │ Analyzer         │            │
│  │  - Coverage calc │      │ - Quality corr.  │            │
│  │  - Recommendations│      │ - Text appearance│            │
│  └──────────────────┘      └──────────────────┘            │
│           │                          │                       │
│           └──────────┬───────────────┘                       │
│                      ▼                                       │
│           ┌──────────────────┐                              │
│           │ Optimization     │                              │
│           │ Recommendations  │                              │
│           └──────────────────┘                              │
│                      │                                       │
│                      ▼                                       │
│           ┌──────────────────┐                              │
│           │ Form Refactoring │                              │
│           │ Implementation   │                              │
│           └──────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Historical Form Data ──┐
                       │
Hemnet API Spec ───────┼──▶ Analysis Engine ──▶ Recommendations ──▶ Refactored Form
                       │
Booli API Spec ────────┤
                       │
Generated Texts ───────┘
```


## Components and Interfaces

### 1. Form Auditor

**Purpose:** Compare current form fields against Hemnet and Booli API requirements.

**Interface:**
```typescript
interface PlatformRequirement {
  fieldName: string;
  required: boolean;
  recommended: boolean;
  dataType: string;
  platform: 'hemnet' | 'booli' | 'both';
  description: string;
}

interface FormAuditor {
  auditHemnetCompliance(): PlatformRequirement[];
  auditBooliCompliance(): PlatformRequirement[];
  getCurrentFormFields(): string[];
  mapFormFieldToPlatformField(formField: string): string | null;
}
```

**Implementation:**
- Maintain reference lists of Hemnet and Booli required/recommended fields
- Map PropertyFormData interface fields to platform field names
- Identify unmapped platform requirements
- Output structured compliance report

### 2. Gap Analyzer

**Purpose:** Identify missing, redundant, and low-value fields.

**Interface:**
```typescript
interface FieldGap {
  fieldName: string;
  gapType: 'missing_mandatory' | 'missing_recommended' | 'redundant' | 'low_value' | 'unused';
  priority: 'critical' | 'important' | 'review';
  reason: string;
  recommendation: 'add' | 'remove' | 'consolidate' | 'demote';
  consolidateWith?: string;
}

interface GapAnalyzer {
  analyzeGaps(
    currentFields: string[],
    platformRequirements: PlatformRequirement[],
    usageData: FieldUsageData
  ): FieldGap[];
  identifyRedundantFields(fields: string[], chipCoverage: ChipCoverage): FieldGap[];
  identifyOverlappingFields(fields: string[]): FieldGap[];
}
```

**Implementation:**
- Compare current fields against platform requirements
- Analyze chip-to-field redundancy
- Detect overlapping data collection (e.g., parking in multiple places)
- Prioritize gaps based on platform requirements and quality impact


### 3. Chip Analyzer

**Purpose:** Optimize chip collections for coverage and usage.

**Interface:**
```typescript
interface ChipUsageStats {
  chipLabel: string;
  category: string;
  selectionCount: number;
  selectionRate: number; // percentage of submissions
  appearsInGeneratedText: boolean;
  averageQualityImpact: number;
}

interface ChipRecommendation {
  action: 'add' | 'remove' | 'relabel';
  category: string;
  chipLabel: string;
  reason: string;
  frequency?: number;
  suggestedLabel?: string;
}

interface ChipAnalyzer {
  analyzeChipUsage(historicalData: FormSubmission[]): ChipUsageStats[];
  identifyMissingChips(freetextData: string[], category: string): ChipRecommendation[];
  identifyRarelyUsedChips(usageStats: ChipUsageStats[], threshold: number): ChipRecommendation[];
  validateChipCoverage(category: string, topFeatures: string[]): boolean;
  analyzeChipTerminology(chips: string[]): TerminologyIssue[];
}
```

**Implementation:**
- Parse historical form submissions from database
- Extract freetext entries and tokenize for feature detection
- Calculate selection rates for existing chips
- Identify frequently-entered features not covered by chips
- Validate chip labels against Swedish real estate terminology standards
- Recommend additions (>15% frequency) and removals (<5% usage)

### 4. Field Impact Analyzer

**Purpose:** Measure correlation between field completion and text quality.

**Interface:**
```typescript
interface FieldImpactMetrics {
  fieldName: string;
  fillRate: number; // percentage of submissions where field is filled
  appearanceRate: number; // percentage of generated texts where field data appears
  qualityCorrelation: number; // correlation with quality scores (-1 to 1)
  impactScore: number; // composite score (0-100)
  category: 'high_impact' | 'medium_impact' | 'low_impact';
}

interface FieldImpactAnalyzer {
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
```

**Implementation:**
- Query historical submissions and generated texts from database
- Parse generated texts to detect which field data appears
- Calculate Pearson correlation between field completion and quality scores
- Compute composite impact score: `(fillRate * 0.3) + (appearanceRate * 0.4) + (qualityCorrelation * 0.3)`
- Categorize fields: high (>70), medium (40-70), low (<40)
- Validate that current "critical" priority fields have high impact scores


### 5. Normalization Engine (Existing)

**Purpose:** Detect and normalize duplicate information between chips and freetext.

**Current Implementation:**
- `CANONICAL_RULES`: Array of 17 regex patterns mapping aliases to canonical forms
- `normalizeListText()`: Splits, normalizes, and deduplicates comma-separated lists
- `mergeChipsAndText()`: Combines chip selections with freetext, detects conflicts, shows toast
- Integrated into `submitForm()` for all chip-enabled fields

**Enhancements Needed:**
- Expand CANONICAL_RULES based on chip analysis findings
- Add more sophisticated alias detection (e.g., "laddbox" vs "laddplats elbil")
- Improve conflict detection to catch semantic duplicates, not just string matches
- Log normalization events for analysis

### 6. Validation Engine (Existing + Enhancements)

**Current Implementation:**
- React Hook Form validation with Zod schemas
- Priority checklist with 7 items tracking completion
- Warning dialog when <4 priority fields completed
- Field-level validation with FormMessage components

**Enhancements Needed:**
```typescript
interface ValidationEngine {
  getRequiredFields(propertyType: PropertyType): string[];
  validateSubmission(data: PropertyFormData): ValidationResult;
  validatePriorityFields(data: PropertyFormData): PriorityValidation;
  getFieldValidationRules(fieldName: string): ValidationRule[];
}

interface ValidationResult {
  valid: boolean;
  errors: FieldError[];
  warnings: FieldWarning[];
  canSubmit: boolean;
}

interface PriorityValidation {
  completedCount: number;
  totalCount: number;
  missingFields: string[];
  shouldWarn: boolean;
}
```

**Implementation:**
- Dynamic required fields based on property type
- Stricter validation for Hemnet/Booli mandatory fields
- Contextual validation (e.g., balcony fields only required if hasBalcony=true)
- Improved error messages with actionable guidance


## Data Models

### Platform Requirements Reference

```typescript
// Hemnet mandatory fields (example - requires actual API documentation)
const HEMNET_REQUIRED_FIELDS = [
  'propertyType',
  'address',
  'livingArea',
  'rooms',
  'price',
  'monthlyFee', // for apartments
  'buildYear',
  'energyClass',
] as const;

const HEMNET_RECOMMENDED_FIELDS = [
  'floor',
  'elevator',
  'balcony',
  'parking',
  'condition',
  'layoutDescription',
  'kitchenDescription',
  'bathroomDescription',
] as const;

// Booli mandatory fields (example - requires actual API documentation)
const BOOLI_REQUIRED_FIELDS = [
  'propertyType',
  'address',
  'livingArea',
  'rooms',
  'price',
] as const;

const BOOLI_RECOMMENDED_FIELDS = [
  'buildYear',
  'monthlyFee',
  'floor',
  'balcony',
  'energyClass',
] as const;
```

### Field Metadata

```typescript
interface FieldMetadata {
  name: keyof PropertyFormData;
  label: string;
  category: 'grundfakta' | 'rum' | 'material' | 'läge' | 'säljpunkter' | 'övrigt';
  priority: 'critical' | 'important' | 'optional';
  propertyTypes: PropertyType[]; // which property types this field applies to
  hemnetRequired: boolean;
  hemnetRecommended: boolean;
  booliRequired: boolean;
  booliRecommended: boolean;
  hasChips: boolean;
  chipCategory?: string;
  helpText?: string;
  tooltip?: string;
  validationRules: ValidationRule[];
  impactScore?: number; // populated by Field Impact Analyzer
  dependencies?: FieldDependency[];
}

interface FieldDependency {
  field: string;
  condition: (value: any) => boolean;
  action: 'show' | 'hide' | 'require' | 'optional';
}
```

### Chip Collection Metadata

```typescript
interface ChipCollection {
  category: 'kitchen' | 'bathroom' | 'flooring' | 'heating' | 'special' | 'garden' | 'usp' | 'parking' | 'roof' | 'material';
  label: string;
  chips: ChipDefinition[];
  targetField: keyof PropertyFormData;
  allowFreetext: boolean;
  propertyTypes: PropertyType[];
}

interface ChipDefinition {
  label: string;
  canonical: string; // normalized form for CANONICAL_RULES
  aliases: string[]; // alternative phrasings
  tooltip?: string;
  usageRate?: number; // populated by Chip Analyzer
  qualityImpact?: number;
}
```


### Form Submission Analytics

```typescript
interface FormSubmission {
  id: string;
  userId: string;
  timestamp: Date;
  propertyType: PropertyType;
  platform: 'hemnet' | 'booli' | 'general';
  fieldData: Partial<PropertyFormData>;
  chipSelections: Record<string, string[]>;
  completionTime: number; // seconds
  fieldsCompleted: string[];
  generatedTextId?: string;
}

interface GeneratedText {
  id: string;
  submissionId: string;
  mainText: string;
  headline: string;
  socialPost: string;
  qualityScore: number;
  forbiddenPhraseCount: number;
  brokerRealismScore: number;
  fieldDataUsed: string[]; // which fields appeared in generated text
}

interface QualityScore {
  textId: string;
  overallScore: number; // 0-100
  brokerRealism: number;
  factualAccuracy: number;
  readability: number;
  forbiddenPhrasesPenalty: number;
  userRating?: number; // if user provided feedback
}
```

### Optimization Report

```typescript
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
  fieldImpactMetrics: FieldImpactMetrics[];
  recommendations: {
    fieldsToAdd: FieldMetadata[];
    fieldsToRemove: string[];
    fieldsToConsolidate: Array<{ fields: string[]; into: string }>;
    chipsToAdd: Array<{ category: string; label: string }>;
    chipsToRemove: Array<{ category: string; label: string }>;
    priorityAdjustments: Array<{ field: string; from: string; to: string }>;
  };
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Platform Compliance Completeness

*For any* gap analysis report, all Hemnet mandatory fields not present in the current form should be listed with priority "critical", and all Booli mandatory fields not present should be listed with priority "critical".

**Validates: Requirements 1.5, 1.6**

### Property 2: Recommended Field Priority Assignment

*For any* gap analysis report, all missing recommended fields (from either Hemnet or Booli) should be listed with priority "important".

**Validates: Requirements 1.7**

### Property 3: Unused Field Identification

*For any* gap analysis report, all current form fields that are neither Hemnet-required, Booli-required, nor Hemnet-recommended, nor Booli-recommended should be listed with priority "review".

**Validates: Requirements 1.8**

### Property 4: Chip Redundancy Detection

*For any* field that has chip coverage for the same data type, if the field also accepts freetext for that data, the system should mark it as redundant.

**Validates: Requirements 2.1**

### Property 5: Low-Value Field Identification

*For any* field with appearance rate <20% in generated texts and fill rate >50%, the system should mark it as low-value.

**Validates: Requirements 2.2**

### Property 6: Field Overlap Detection

*For any* pair of fields where >30% of their content overlaps semantically (e.g., both collect parking information), the system should identify the overlap and recommend consolidation.

**Validates: Requirements 2.3**

### Property 7: Redundant Field Justification

*For any* field marked as redundant, there must be a non-empty justification string explaining why it's redundant.

**Validates: Requirements 2.5**

### Property 8: High-Impact Field Preservation

*For any* field with impact score >70, it should not be recommended for removal.

**Validates: Requirements 2.6**

### Property 9: Frequent Feature Chip Recommendation

*For any* property feature appearing in >15% of historical submissions, the Chip Analyzer should recommend it as a chip option.

**Validates: Requirements 3.2**

### Property 10: Rare Chip Identification

*For any* existing chip with selection rate <5%, the Chip Analyzer should identify it for potential removal.

**Validates: Requirements 3.3**

### Property 11: Top Feature Coverage

*For any* chip collection, the top 10 most frequently entered features in that category should be present as chips.

**Validates: Requirements 3.5**

### Property 12: Chip-Freetext Duplicate Normalization

*For any* form submission where a chip is selected AND the same information appears in the corresponding freetext field, the normalization engine should detect the duplication and merge them into a single occurrence.

**Validates: Requirements 3.7, 11.1, 11.3, 11.6**

### Property 13: Canonical Alias Mapping

*For any* text matching a pattern in CANONICAL_RULES, the normalization engine should replace it with the canonical form.

**Validates: Requirements 11.2**

### Property 14: Duplicate Detection Toast

*For any* form submission where duplicate information is detected between chips and freetext, a toast notification should be shown to the user.

**Validates: Requirements 11.4**

### Property 15: Chip-Only Candidate Evaluation

*For any* field with <20 distinct values in historical data, the system should evaluate it as a chip-only candidate.

**Validates: Requirements 4.1**

### Property 16: Chip-Only Coverage Validation

*For any* field recommended for chip-only conversion, the proposed chips must cover >90% of historical values for that field.

**Validates: Requirements 4.3**

### Property 17: Chip-Only Fallback Option

*For any* field converted to chip-only, there must be an "Övrigt" (Other) option with an optional text field.

**Validates: Requirements 4.5**

### Property 18: Missing Critical Field Addition

*For any* Hemnet-required or Booli-required field not present in the current form, the system should recommend adding it with priority "critical".

**Validates: Requirements 5.2, 5.3**

### Property 19: New Field Disposition Integration

*For any* new field added to PropertyFormData, it must be handled in buildDispositionFromStructuredData() to ensure it's passed to the AI pipeline.

**Validates: Requirements 5.6**

### Property 20: High-Impact Field Prioritization

*For any* form field ordering, fields with impact score >70 should appear before fields with impact score <40.

**Validates: Requirements 6.1, 6.3**

### Property 21: Related Field Grouping

*For any* two fields in the same category (e.g., both kitchen-related), they should be within the same FieldGroup component.

**Validates: Requirements 6.2**

### Property 22: Priority Field Warning

*For any* form submission with fewer than 4 priority fields completed, a warning dialog should be displayed before submission.

**Validates: Requirements 6.4, 13.3**

### Property 23: Field Impact Correlation Calculation

*For any* field, the quality correlation should be calculated as the Pearson correlation coefficient between field completion (0/1) and text quality scores across all submissions.

**Validates: Requirements 7.1**

### Property 24: High Fill Low Appearance Detection

*For any* field with fill rate >60% and appearance rate <30%, the system should identify it as frequently filled but rarely used.

**Validates: Requirements 7.2**

### Property 25: Critical Priority Validation

*For any* field marked with priority "critical", its impact score should be >60, otherwise a validation warning should be raised.

**Validates: Requirements 7.6**

### Property 26: Property Type Field Visibility

*For any* property type selection, if type is "apartment" or "townhouse", apartment-specific fields should be visible and house-specific fields should be hidden; if type is "house" or "villa", the opposite should be true.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

### Property 27: Balcony Dependency Visibility

*For any* form state, if hasBalcony is true, balcony area and direction fields should be visible; if false, they should be hidden and their values should be empty strings.

**Validates: Requirements 12.5, 12.6**

### Property 28: Required Field Validation

*For any* form submission, if any required field (based on property type) is empty, form submission should be prevented.

**Validates: Requirements 13.2**

### Property 29: Priority Checklist Real-Time Update

*For any* field value change, the priority checklist completion status should update immediately to reflect the new state.

**Validates: Requirements 13.4**

### Property 30: Priority Checklist Percentage Accuracy

*For any* priority checklist state, the displayed percentage should equal (completedCount / totalCount) * 100, rounded to nearest integer.

**Validates: Requirements 13.5**

### Property 31: Checklist Item Scroll-To

*For any* priority checklist item click, the corresponding form field should scroll into view and receive a temporary highlight.

**Validates: Requirements 13.6**

### Property 32: Required Field Asterisk Labeling

*For any* required field, its FormLabel should contain an asterisk (*) character.

**Validates: Requirements 14.3**

### Property 33: Pro Feature Badge Display

*For any* Pro-only feature (image upload, word count control, address lookup), there should be a visible "Pro" badge or lock icon.

**Validates: Requirements 14.5**

### Property 34: Chip Keyboard Navigation

*For any* chip in ChipSelector, pressing Space or Enter while focused should toggle its selection state.

**Validates: Requirements 15.6**

### Property 35: Interactive Element ARIA Labels

*For any* interactive element (button, input, chip), there should be an aria-label, aria-labelledby, or accessible name provided.

**Validates: Requirements 15.2**

### Property 36: Validation Error Announcement

*For any* field validation error, the error message should be associated with the field via aria-describedby or within an aria-live region.

**Validates: Requirements 15.3**

### Property 37: Mobile Touch Target Size

*For any* chip or button on mobile viewports, its touch target area should be at least 44x44 pixels.

**Validates: Requirements 9.4**

### Property 38: Draft Persistence Round-Trip

*For any* form state, saving to localStorage and then restoring should produce an equivalent form state (all field values preserved).

**Validates: Requirements 9.5**

### Property 39: Address Lookup Coverage

*For any* random sample of 100 valid Swedish addresses, at least 90 should return successful results from the address lookup API.

**Validates: Requirements 10.6**

### Property 40: Terminology Consistency

*For any* chip label, it should match the terminology used in generated texts (either exact match or via CANONICAL_RULES mapping).

**Validates: Requirements 8.5**


## Error Handling

### Analysis Phase Errors

**Platform API Unavailable:**
- Fallback to cached reference data from last successful fetch
- Log warning and continue with potentially stale data
- Display warning in optimization report

**Historical Data Insufficient:**
- Require minimum 100 submissions for statistical analysis
- If <100 submissions, skip usage-based recommendations
- Display data insufficiency warning in report

**Database Query Failures:**
- Retry with exponential backoff (3 attempts)
- If all retries fail, abort analysis and return error
- Log to Sentry with context about which query failed

### Form Runtime Errors

**Chip Selection State Corruption:**
- Validate chip arrays on every update
- If invalid state detected, reset to empty array
- Log error to Sentry with state snapshot

**LocalStorage Quota Exceeded:**
- Catch QuotaExceededError on draft save
- Clear old drafts (>7 days) and retry
- If still fails, disable draft persistence for session
- Show toast: "Utkast kunde inte sparas - rensa webbläsardata"

**Address Lookup API Failure:**
- Show user-friendly error message
- Preserve manually entered transport/neighborhood data
- Log error with address (sanitized) for debugging
- Fallback to manual entry

**Normalization Engine Errors:**
- If CANONICAL_RULES regex throws, skip that rule
- Continue with remaining normalization rules
- Log regex error to Sentry
- Ensure submission still succeeds with partial normalization

### Validation Errors

**Invalid Field Dependencies:**
- If dependency condition throws, default to showing field
- Log error with field name and condition
- Ensure form remains usable

**Priority Checklist Calculation Error:**
- If completion check throws, mark item as incomplete
- Log error with field name
- Ensure checklist still renders

**Form Submission Validation Failure:**
- Display all validation errors inline
- Scroll to first error field
- Prevent submission but allow continued editing
- Preserve all entered data

### Data Integrity Errors

**Disposition Building Failure:**
- If buildDispositionFromStructuredData throws, catch and log
- Attempt to build minimal disposition with required fields only
- If minimal disposition fails, show error and prevent submission
- Preserve form data for user to fix and retry

**Chip-Freetext Merge Conflict:**
- If merge logic throws, prefer freetext over chips
- Log conflict details to Sentry
- Show warning toast but allow submission
- Ensure no data loss


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests:

- **Unit tests**: Validate specific examples, edge cases, platform compliance checks, and integration points
- **Property tests**: Verify universal properties across all inputs, especially for analysis algorithms and normalization logic

Together, these provide comprehensive coverage: unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing

**Library:** fast-check (JavaScript/TypeScript property-based testing)

**Configuration:**
- Minimum 100 iterations per property test
- Each test must reference its design document property via comment tag
- Tag format: `// Feature: form-optimization, Property {number}: {property_text}`

**Key Property Tests:**

1. **Gap Analysis Properties (Properties 1-3, 7)**
   - Generate random form field sets and platform requirements
   - Verify gap reports correctly categorize missing/redundant fields
   - Verify all redundant fields have justifications

2. **Chip Analysis Properties (Properties 9-11)**
   - Generate random historical submission data
   - Verify frequency-based chip recommendations
   - Verify top-N coverage requirements

3. **Normalization Properties (Properties 12-14)**
   - Generate random chip+freetext combinations
   - Verify duplicate detection and merging
   - Verify canonical rule application
   - Verify uniqueness of normalized output

4. **Field Impact Properties (Properties 23-25)**
   - Generate random submission and quality score data
   - Verify correlation calculations
   - Verify impact score categorization
   - Verify priority-impact alignment

5. **Field Visibility Properties (Properties 26-27)**
   - Generate random property type selections
   - Verify correct field visibility based on dependencies
   - Verify value clearing on hide

6. **Validation Properties (Properties 28-31)**
   - Generate random form states
   - Verify required field enforcement
   - Verify priority checklist calculations
   - Verify percentage accuracy

7. **Accessibility Properties (Properties 34-36)**
   - Generate random form configurations
   - Verify ARIA labels presence
   - Verify keyboard navigation
   - Verify error announcements

### Unit Testing

**Test Organization:**
```
server/tests/
  form-optimization-analysis.test.ts    # Analysis engine tests
  form-optimization-normalization.test.ts # Normalization tests
  form-optimization-validation.test.ts   # Validation tests

client/src/components/
  PromptFormProfessional.test.tsx       # Form component tests
  PromptFormProfessional.a11y.test.tsx  # Accessibility tests
```

**Key Unit Tests:**

1. **Platform Compliance (Requirements 1.1-1.4)**
   - Test with known Hemnet/Booli field lists
   - Verify correct identification of mandatory vs recommended
   - Test field mapping accuracy

2. **Chip Coverage (Requirement 3.6)**
   - Test chip labels against Swedish real estate terminology dictionary
   - Verify no ambiguous or confusing labels

3. **Mobile Responsiveness (Requirements 9.1, 9.3, 9.6)**
   - Test rendering at 375px, 768px, 1024px widths
   - Measure load time with simulated 4G throttling
   - Verify priority fields fit in viewport

4. **Broker Workflow (Requirements 10.1-10.3, 10.5)**
   - Test quick entry workflow (minimal fields)
   - Test detailed entry workflow (all fields)
   - Verify form supports both patterns

5. **Integration Tests (Requirement 5.6)**
   - Test new fields integrate with buildDispositionFromStructuredData
   - Verify disposition structure matches expected format
   - Test with all property types

6. **Terminology Validation (Requirements 8.1-8.2)**
   - Test field labels against Hemnet/Booli terminology
   - Test against Swedish real estate law terms
   - Verify tooltip presence for technical terms

7. **Accessibility (Requirements 15.1, 15.4, 15.7)**
   - Test keyboard navigation flow
   - Test tab order matches visual order
   - Test WCAG 2.1 Level AA contrast ratios with automated tools

### Test Data

**Historical Submission Corpus:**
- Minimum 500 real submissions for analysis
- Anonymized property data
- Includes all property types
- Spans multiple months for temporal patterns

**Platform Reference Data:**
- Hemnet API field specifications (from documentation)
- Booli API field specifications (from documentation)
- Swedish real estate terminology dictionary
- Legal term definitions

**Quality Metrics:**
- Historical quality scores from generated texts
- Broker realism scores
- Forbidden phrase counts
- User ratings (if available)

### Performance Testing

**Analysis Performance:**
- Gap analysis should complete in <5 seconds for 1000 submissions
- Chip analysis should complete in <10 seconds for 1000 submissions
- Field impact analysis should complete in <15 seconds for 1000 submissions

**Form Performance:**
- Initial render <500ms
- Field updates <16ms (60fps)
- Draft save <100ms
- Normalization <200ms on submission

### Regression Testing

Add to existing regression test suite:
- Verify form changes don't break existing disposition building
- Verify chip normalization still works for known cases
- Verify priority checklist logic remains correct
- Verify mobile responsiveness maintained


## Implementation Approach

### Phase 1: Analysis Infrastructure (Week 1)

**Goal:** Build analysis tools to audit current form and generate optimization report.

**Tasks:**
1. Create `server/lib/form-auditor.ts`
   - Implement FormAuditor interface
   - Add Hemnet/Booli reference data (requires API documentation research)
   - Implement field mapping logic

2. Create `server/lib/gap-analyzer.ts`
   - Implement GapAnalyzer interface
   - Add redundancy detection algorithms
   - Add overlap detection logic

3. Create `server/lib/chip-analyzer.ts`
   - Implement ChipAnalyzer interface
   - Add historical data query functions
   - Add frequency analysis algorithms
   - Add terminology validation

4. Create `server/lib/field-impact-analyzer.ts`
   - Implement FieldImpactAnalyzer interface
   - Add correlation calculation functions
   - Add text parsing for field appearance detection
   - Add impact scoring algorithm

5. Create analysis script `script/analyze-form-optimization.ts`
   - Orchestrate all analyzers
   - Generate OptimizationReport
   - Output JSON and human-readable formats
   - Add CLI flags for selective analysis

**Deliverable:** Complete optimization report identifying all gaps, redundancies, and recommendations.

### Phase 2: Platform Compliance (Week 2)

**Goal:** Ensure form meets Hemnet and Booli mandatory requirements.

**Tasks:**
1. Add missing mandatory fields identified in Phase 1
   - Update PropertyFormData interface
   - Add form fields to PromptFormProfessional.tsx
   - Add to appropriate FieldGroups
   - Update buildDispositionFromStructuredData

2. Add missing recommended fields (high priority only)
   - Focus on fields with high quality impact
   - Add with appropriate priority levels
   - Ensure proper grouping and help text

3. Update validation rules
   - Add Hemnet/Booli mandatory field validation
   - Update required field logic per property type
   - Add contextual validation

4. Test platform compliance
   - Unit tests for all new fields
   - Integration tests with disposition builder
   - Verify no breaking changes to existing functionality

**Deliverable:** Form meets all Hemnet and Booli mandatory requirements.

### Phase 3: Chip Optimization (Week 3)

**Goal:** Optimize chip collections based on usage data and coverage analysis.

**Tasks:**
1. Add high-frequency chips identified in Phase 1
   - Update chip constant arrays
   - Add to appropriate ChipSelector components
   - Update CANONICAL_RULES for new chips

2. Remove or consolidate low-usage chips
   - Remove chips with <5% selection rate
   - Consolidate similar chips
   - Update existing form submissions if needed

3. Enhance chip terminology
   - Fix ambiguous labels
   - Add tooltips for unclear chips
   - Ensure Swedish real estate terminology compliance

4. Improve normalization engine
   - Expand CANONICAL_RULES based on analysis
   - Add semantic duplicate detection
   - Enhance conflict detection logic

5. Test chip functionality
   - Property tests for normalization
   - Unit tests for new chips
   - Regression tests for existing chips

**Deliverable:** Optimized chip collections with >90% coverage of common features.

### Phase 4: Field Consolidation (Week 4)

**Goal:** Remove redundant fields and consolidate overlapping fields.

**Tasks:**
1. Remove low-value fields identified in Phase 1
   - Remove from PropertyFormData interface
   - Remove from form component
   - Update disposition builder to handle missing fields gracefully
   - Add migration for existing data if needed

2. Consolidate overlapping fields
   - Merge fields collecting same data
   - Update form UI to reflect consolidation
   - Update validation rules
   - Migrate existing data

3. Convert appropriate fields to chip-only
   - Remove freetext option where chips provide >90% coverage
   - Add "Övrigt" fallback option
   - Update form UI

4. Update field metadata
   - Document all field changes
   - Update help text and tooltips
   - Update priority assignments based on impact analysis

5. Test field changes
   - Unit tests for removed/consolidated fields
   - Integration tests with disposition builder
   - Regression tests for existing functionality

**Deliverable:** Streamlined form with no redundant fields.

### Phase 5: UX Improvements (Week 5)

**Goal:** Improve form flow, mobile experience, and accessibility.

**Tasks:**
1. Reorder fields based on impact analysis
   - Move high-impact fields earlier
   - Group related fields together
   - Ensure critical fields visible without scrolling

2. Update priority checklist
   - Align with impact analysis results
   - Add new high-impact fields
   - Remove low-impact fields
   - Update completion thresholds

3. Enhance mobile experience
   - Optimize touch targets (44x44px minimum)
   - Improve responsive layout
   - Reduce scrolling for priority fields
   - Test on real devices

4. Improve accessibility
   - Audit ARIA labels
   - Fix keyboard navigation issues
   - Improve focus indicators
   - Test with screen readers
   - Verify WCAG 2.1 Level AA compliance

5. Add contextual help
   - Add tooltips for technical terms
   - Improve help text clarity
   - Add examples in placeholders
   - Explain field impact on generated text

6. Test UX improvements
   - User testing with real brokers
   - Accessibility testing with automated tools
   - Mobile device testing
   - Performance testing

**Deliverable:** Improved form UX with better flow, mobile support, and accessibility.

### Phase 6: Validation & Documentation (Week 6)

**Goal:** Comprehensive testing and documentation of all changes.

**Tasks:**
1. Write property-based tests
   - Implement all 40 correctness properties
   - Configure fast-check with 100+ iterations
   - Tag tests with property references

2. Write unit tests
   - Cover all new functionality
   - Test edge cases
   - Test error handling

3. Run regression tests
   - Verify no breaking changes
   - Test with historical data
   - Validate generated text quality maintained

4. Update documentation
   - Document all field changes
   - Update form usage guide
   - Document new validation rules
   - Create migration guide for API consumers

5. Performance optimization
   - Profile form rendering
   - Optimize re-renders
   - Optimize draft persistence
   - Measure and optimize load time

6. Create rollout plan
   - Feature flag for gradual rollout
   - A/B test plan
   - Monitoring and alerting
   - Rollback procedure

**Deliverable:** Fully tested and documented form optimization ready for production.

### Rollout Strategy

**Week 7: Staged Rollout**

1. **Internal Testing (Day 1-2)**
   - Deploy to staging environment
   - Internal team testing
   - Fix critical bugs

2. **Beta Testing (Day 3-5)**
   - Enable for 10% of Pro/Premium users
   - Monitor error rates and user feedback
   - Collect completion time metrics
   - Fix issues

3. **Gradual Rollout (Day 6-7)**
   - 25% of users
   - 50% of users
   - 100% of users
   - Monitor at each stage

4. **Post-Rollout Monitoring (Week 8)**
   - Track form completion rates
   - Monitor text quality metrics
   - Collect user feedback
   - Measure performance improvements

### Success Metrics

**Quantitative:**
- Form completion time reduced by >20%
- Priority field completion rate increased by >15%
- Mobile completion rate increased by >10%
- Text quality scores maintained or improved
- Zero critical bugs in production

**Qualitative:**
- Positive user feedback on form improvements
- Reduced support tickets about form confusion
- Broker workflow alignment validated
- Accessibility compliance verified


## Technical Considerations

### Backward Compatibility

**Existing Form Submissions:**
- All existing PropertyFormData structures must remain valid
- Removed fields should be handled gracefully in disposition builder
- Add null checks for new fields in backend processing
- Consider data migration for consolidated fields

**API Compatibility:**
- Maintain existing field names in PropertyFormData interface
- Add new fields as optional to avoid breaking changes
- Version the form schema if major changes needed
- Document all breaking changes clearly

**Draft Persistence:**
- Handle old draft format gracefully
- Migrate old drafts to new format on load
- Clear corrupted drafts rather than crashing
- Version draft format in localStorage

### Performance Optimization

**Form Rendering:**
- Memoize expensive computations (priority checklist, field visibility)
- Use React.memo for static components
- Debounce draft persistence (500ms)
- Lazy load expandable sections

**Analysis Performance:**
- Index database queries on userId, timestamp, propertyType
- Use database aggregations instead of in-memory processing
- Cache analysis results (24 hour TTL)
- Paginate large result sets

**Bundle Size:**
- Code-split analysis tools (not needed in production client)
- Tree-shake unused chip options
- Compress reference data
- Lazy load tooltips and help text

### Security Considerations

**Input Validation:**
- Sanitize all form inputs before storage
- Validate field types match expected types
- Prevent XSS in freetext fields
- Rate limit form submissions

**Data Privacy:**
- Anonymize property addresses in analysis
- Don't log sensitive broker information
- Comply with GDPR for historical data analysis
- Allow users to opt out of usage analytics

**Access Control:**
- Restrict analysis tools to admin users only
- Require authentication for all form endpoints
- Validate user permissions before data access
- Audit log all analysis runs

### Monitoring and Observability

**Metrics to Track:**
- Form completion rate (by property type, user tier)
- Field completion rates (identify unused fields)
- Chip selection rates (validate optimization)
- Form submission errors (by field, error type)
- Draft save/restore success rates
- Normalization conflict rates
- Address lookup success rate
- Mobile vs desktop completion rates

**Alerts:**
- Form completion rate drops >10%
- Error rate exceeds 5%
- Address lookup failure rate >20%
- Draft persistence failure rate >10%
- Disposition building failures

**Logging:**
- Log all form submissions (anonymized)
- Log all validation errors with context
- Log all normalization conflicts
- Log all analysis runs with parameters
- Log all field additions/removals

### Database Schema Changes

**New Tables:**

```sql
-- Track form field metadata
CREATE TABLE form_field_metadata (
  field_name VARCHAR(100) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  hemnet_required BOOLEAN DEFAULT FALSE,
  hemnet_recommended BOOLEAN DEFAULT FALSE,
  booli_required BOOLEAN DEFAULT FALSE,
  booli_recommended BOOLEAN DEFAULT FALSE,
  has_chips BOOLEAN DEFAULT FALSE,
  chip_category VARCHAR(50),
  impact_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track chip usage statistics
CREATE TABLE chip_usage_stats (
  id SERIAL PRIMARY KEY,
  chip_label VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  selection_count INTEGER DEFAULT 0,
  selection_rate DECIMAL(5,2),
  appears_in_text BOOLEAN DEFAULT FALSE,
  quality_impact DECIMAL(5,2),
  analysis_date DATE NOT NULL,
  UNIQUE(chip_label, category, analysis_date)
);

-- Track form optimization analysis runs
CREATE TABLE form_optimization_runs (
  id SERIAL PRIMARY KEY,
  run_date TIMESTAMP DEFAULT NOW(),
  submissions_analyzed INTEGER NOT NULL,
  fields_added TEXT[],
  fields_removed TEXT[],
  chips_added TEXT[],
  chips_removed TEXT[],
  report_json JSONB NOT NULL,
  executed_by INTEGER REFERENCES users(id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_chip_usage_category ON chip_usage_stats(category, analysis_date);
CREATE INDEX idx_chip_usage_rate ON chip_usage_stats(selection_rate DESC);
CREATE INDEX idx_field_metadata_priority ON form_field_metadata(priority);
CREATE INDEX idx_optimization_runs_date ON form_optimization_runs(run_date DESC);
```

### Configuration Management

**Feature Flags:**
```typescript
interface FormOptimizationFlags {
  enableNewFields: boolean;
  enableChipOptimization: boolean;
  enableFieldConsolidation: boolean;
  enableImprovedValidation: boolean;
  enableMobileOptimizations: boolean;
  rolloutPercentage: number; // 0-100
}
```

**Environment Variables:**
```bash
# Analysis configuration
FORM_ANALYSIS_MIN_SUBMISSIONS=100
FORM_ANALYSIS_CACHE_TTL=86400
CHIP_FREQUENCY_THRESHOLD=0.15
CHIP_REMOVAL_THRESHOLD=0.05
FIELD_IMPACT_HIGH_THRESHOLD=70
FIELD_IMPACT_LOW_THRESHOLD=40

# Feature flags
ENABLE_FORM_OPTIMIZATION=true
FORM_OPTIMIZATION_ROLLOUT_PERCENTAGE=100
```

### Dependencies

**New Dependencies:**
```json
{
  "dependencies": {
    "fast-check": "^3.15.0"
  },
  "devDependencies": {
    "@axe-core/react": "^4.8.0",
    "lighthouse": "^11.5.0"
  }
}
```

### Migration Plan

**Database Migrations:**
1. Add new form_field_metadata table
2. Add new chip_usage_stats table
3. Add new form_optimization_runs table
4. Populate form_field_metadata with current fields
5. Add indexes for performance

**Code Migrations:**
1. Add new fields to PropertyFormData interface
2. Update buildDispositionFromStructuredData to handle new fields
3. Add null checks for removed fields
4. Update validation schemas
5. Deploy backend changes
6. Deploy frontend changes
7. Run analysis and generate optimization report
8. Review and approve recommendations
9. Implement approved changes
10. Test thoroughly
11. Gradual rollout

### Risk Mitigation

**High Risk: Breaking Existing Functionality**
- Mitigation: Comprehensive regression testing
- Mitigation: Feature flags for gradual rollout
- Mitigation: Maintain backward compatibility
- Mitigation: Quick rollback procedure

**Medium Risk: Poor User Adoption**
- Mitigation: User testing before rollout
- Mitigation: Clear communication of changes
- Mitigation: Provide migration guide
- Mitigation: Collect and act on feedback

**Medium Risk: Performance Degradation**
- Mitigation: Performance testing before rollout
- Mitigation: Monitor metrics closely
- Mitigation: Optimize hot paths
- Mitigation: Cache analysis results

**Low Risk: Data Loss**
- Mitigation: Backup before migrations
- Mitigation: Test migrations on staging
- Mitigation: Graceful handling of old data formats
- Mitigation: Draft persistence with versioning


## Appendix: Current Form Analysis

### Current Form Structure (PromptFormProfessional.tsx)

**Total Lines:** 1894
**Total Fields:** 60+
**Chip Categories:** 10
**Total Chips:** 80+

**Field Categories:**
1. **Grundfakta (Basic Info):** 15 fields
   - propertyType, address, area, price, monthlyFee, livingArea
   - totalRooms, bedrooms, bathrooms, buildYear, condition
   - energyClass, floor, elevator, brfName

2. **Ytor (Areas):** 6 fields
   - balconyArea, balconyDirection, lotArea, biarea, storage
   - floors (number of floors in house)

3. **Rum (Rooms):** 3 fields
   - layoutDescription, kitchenDescription, bathroomDescription

4. **Material & Teknik:** 5 fields
   - flooring, heating, konstruktionMaterial, taktyp, specialFeatures

5. **Läge & Omgivning:** 5 fields
   - view, neighborhood, transport, parking, gardenDescription

6. **Säljpunkter:** 1 field
   - uniqueSellingPoints

7. **Juridiskt & Ekonomi:** 4 fields
   - fastighetsbeteckning, taxeringsvarde, tomtrattsavgald, renoveringsar

8. **Visning:** 3 fields
   - visningstid, maklarnamn, maklartelefon

9. **Övrigt:** 2 fields
   - otherInfo, tilltradesdag

10. **Meta:** 2 fields
    - platform, writingStyle

**Chip Collections:**
1. KITCHEN_CHIPS (9 options)
2. BATHROOM_CHIPS (6 options)
3. FLOORING_CHIPS (6 options)
4. HEATING_CHIPS (7 options)
5. SPECIAL_CHIPS (9 options)
6. GARDEN_CHIPS (8 options)
7. USP_CHIPS (12 options)
8. PARKING_CHIPS (8 options)
9. ROOF_CHIPS (5 options)
10. MATERIAL_CHIPS (6 options)

**Current Priority Checklist (7 items):**
1. Adress (critical)
2. Boarea (critical)
3. Rum & badrum (critical)
4. Kök & badrum (important)
5. Läge & transport (important)
6. Försäljningsargument (critical)
7. Planlösning & skick (important)

**Current Validation:**
- Required fields: address, area, livingArea (via rules prop)
- Priority field warning: <4 completed triggers dialog
- Field-level validation via React Hook Form
- No platform-specific validation

**Current Normalization:**
- 17 CANONICAL_RULES for alias mapping
- Conflict detection between chips and freetext
- Toast notification on duplicates
- Deduplication in normalizeListText()

**Current Dependencies:**
- Property type → apartment vs house fields
- hasBalcony → balcony detail fields
- No other conditional logic

**Current Accessibility:**
- Keyboard navigation via handleKeyDown in ChipSelector
- ARIA labels on chips (role="checkbox", aria-checked)
- Focus indicators via Tailwind focus: classes
- No comprehensive ARIA audit

**Current Mobile Support:**
- Responsive grid layouts
- Touch-friendly chip sizes (py-1 md:py-2)
- Sticky submit button on mobile
- Draft persistence for interruptions
- No specific mobile optimizations

**Known Issues:**
1. No Hemnet/Booli compliance validation
2. Some fields rarely used in generated texts
3. Chip coverage gaps for common features
4. Inconsistent terminology in some chips
5. No field impact tracking
6. Priority checklist not data-driven
7. Limited mobile optimization
8. Incomplete accessibility audit
9. No field grouping optimization
10. Redundancy between parking/special features

### Disposition Builder Integration

**Function:** `buildDispositionFromStructuredData(propertyData)`
**Location:** `server/routes.ts:2259`
**Purpose:** Transform form data into structured disposition for AI pipeline

**Key Mappings:**
- `propertyType` → `disposition.property.type`
- `address` → `disposition.property.address`
- `livingArea` → `disposition.property.size`
- `totalRooms` → `disposition.property.rooms`
- `kitchenDescription` → `disposition.property.kitchen`
- `uniqueSellingPoints` → `disposition.property.unique_selling_points`
- etc.

**Normalization in Disposition Builder:**
- `sanitizeStructuredText()` - removes invalid characters
- `sanitizeStructuredList()` - splits and cleans lists
- `normalizeOutdoorTerm()` - standardizes balkong/altan/uteplats
- `removeRedundantFeatureMentions()` - deduplicates across fields
- `detectConflictingYears()` - identifies year conflicts
- `deepClean()` - removes null/empty values

**Data Quality Notes:**
- Tracks missing required fields
- Identifies ambiguous data
- Flags conflicting information
- Provides emphasis notes for AI

**Integration Points:**
- All form fields must be handled in this function
- New fields require disposition mapping
- Removed fields need graceful null handling
- Field renames require alias support

