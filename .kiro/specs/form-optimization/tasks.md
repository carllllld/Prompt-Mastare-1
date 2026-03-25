# Implementation Plan: Form Optimization

## Overview

This plan optimizes OptiPrompt's property data collection form (PromptFormProfessional.tsx) through systematic analysis and refactoring. The implementation follows a 6-phase approach: building analysis infrastructure, ensuring platform compliance, optimizing chip collections, consolidating fields, improving UX, and comprehensive validation.

The target is a 1894-line form with 60+ fields, 10 chip categories, and 80+ chips that needs alignment with Hemnet/Booli requirements, elimination of redundancies, improved mobile UX, and validation of field impact on text quality.

## Tasks

- [x] 1. Phase 1: Analysis Infrastructure
  - [x] 1.1 Create Form Auditor module
    - Create `server/lib/form-auditor.ts` with FormAuditor interface
    - Implement Hemnet/Booli reference data structures (HEMNET_REQUIRED_FIELDS, HEMNET_RECOMMENDED_FIELDS, BOOLI_REQUIRED_FIELDS, BOOLI_RECOMMENDED_FIELDS)
    - Implement auditHemnetCompliance() and auditBooliCompliance() functions
    - Implement getCurrentFormFields() to extract PropertyFormData field names
    - Implement mapFormFieldToPlatformField() for field name mapping
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.2 Write property test for Form Auditor
    - **Property 1: Platform Compliance Completeness**
    - **Validates: Requirements 1.5, 1.6**

  - [x] 1.3 Create Gap Analyzer module
    - Create `server/lib/gap-analyzer.ts` with GapAnalyzer interface
    - Implement analyzeGaps() to compare current fields against platform requirements
    - Implement identifyRedundantFields() to detect chip-to-field redundancy
    - Implement identifyOverlappingFields() to detect semantic overlaps
    - Return FieldGap[] with gapType, priority, reason, and recommendation
    - _Requirements: 1.5, 1.7, 1.8, 2.1, 2.2, 2.3_

  - [ ]* 1.4 Write property tests for Gap Analyzer
    - **Property 2: Recommended Field Priority Assignment**
    - **Property 3: Unused Field Identification**
    - **Property 7: Redundant Field Justification**
    - **Validates: Requirements 1.7, 1.8, 2.5**

  - [x] 1.5 Create Chip Analyzer module
    - Create `server/lib/chip-analyzer.ts` with ChipAnalyzer interface
    - Implement analyzeChipUsage() to calculate selection rates from historical data
    - Implement identifyMissingChips() to find frequently-entered features not covered by chips
    - Implement identifyRarelyUsedChips() with <5% threshold
    - Implement validateChipCoverage() to check top-10 feature coverage
    - Implement analyzeChipTerminology() for Swedish real estate terminology validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 1.6 Write property tests for Chip Analyzer
    - **Property 9: Frequent Feature Chip Recommendation**
    - **Property 10: Rare Chip Identification**
    - **Property 11: Top Feature Coverage**
    - **Validates: Requirements 3.2, 3.3, 3.5**

  - [x] 1.7 Create Field Impact Analyzer module
    - Create `server/lib/field-impact-analyzer.ts` with FieldImpactAnalyzer interface
    - Implement analyzeFieldImpact() to calculate fillRate, appearanceRate, qualityCorrelation
    - Implement Pearson correlation calculation for field completion vs quality scores
    - Implement composite impact score: (fillRate * 0.3) + (appearanceRate * 0.4) + (qualityCorrelation * 0.3)
    - Implement identifyHighImpactFields() (score >70) and identifyLowImpactFields() (score <40)
    - Implement validatePriorityAlignment() to check critical fields have high impact
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 1.8 Write property tests for Field Impact Analyzer
    - **Property 23: Field Impact Correlation Calculation**
    - **Property 24: High Fill Low Appearance Detection**
    - **Property 25: Critical Priority Validation**
    - **Validates: Requirements 7.1, 7.2, 7.6**

  - [x] 1.9 Create analysis orchestration script
    - Create `script/analyze-form-optimization.ts` to orchestrate all analyzers
    - Query historical form submissions and generated texts from database
    - Run FormAuditor, GapAnalyzer, ChipAnalyzer, and FieldImpactAnalyzer
    - Generate OptimizationReport with all findings and recommendations
    - Output JSON report and human-readable summary
    - Add CLI flags for selective analysis (--audit-only, --chips-only, --impact-only)
    - _Requirements: 1.5_

  - [ ]* 1.10 Write unit tests for analysis script
    - Test with mock historical data (minimum 100 submissions)
    - Test report generation and formatting
    - Test CLI flag handling
    - _Requirements: 1.5_

- [x] 2. Checkpoint - Review analysis results
  - Run analysis script on production data
  - Review OptimizationReport findings
  - Validate recommendations with stakeholders
  - Ensure all tests pass, ask the user if questions arise

- [x] 3. Phase 2: Platform Compliance
  - [x] 3.1 Add missing Hemnet mandatory fields
    - Update PropertyFormData interface with missing Hemnet-required fields from analysis
    - Add form fields to PromptFormProfessional.tsx in appropriate FieldGroups
    - Mark fields as required with asterisk (*) in FormLabel
    - Add field validation rules
    - Update buildDispositionFromStructuredData() in server/routes.ts to map new fields
    - _Requirements: 1.1, 5.2, 5.6_

  - [ ]* 3.2 Write property test for Hemnet compliance
    - **Property 18: Missing Critical Field Addition**
    - **Validates: Requirements 5.2, 5.3**

  - [x] 3.3 Add missing Booli mandatory fields
    - Update PropertyFormData interface with missing Booli-required fields from analysis
    - Add form fields to PromptFormProfessional.tsx
    - Add field validation rules
    - Update buildDispositionFromStructuredData() to map new fields
    - _Requirements: 1.2, 5.3, 5.6_

  - [x] 3.4 Add high-priority recommended fields
    - Add Hemnet/Booli recommended fields with high quality impact (from Field Impact Analyzer)
    - Mark as "important" priority in FieldGroup components
    - Add contextual help text explaining field importance
    - Update disposition builder
    - _Requirements: 1.3, 1.4, 5.4_

  - [ ]* 3.5 Write property test for new field disposition integration
    - **Property 19: New Field Disposition Integration**
    - **Validates: Requirements 5.6**

  - [x] 3.6 Update validation engine for platform compliance
    - Implement dynamic required fields based on property type and platform
    - Add Hemnet-specific validation rules
    - Add Booli-specific validation rules
    - Update priority checklist to include new mandatory fields
    - _Requirements: 13.1, 13.2_

  - [ ]* 3.7 Write unit tests for platform compliance
    - Test all new fields render correctly
    - Test validation rules enforce mandatory fields
    - Test disposition builder handles new fields
    - Test with all property types (apartment, house, townhouse, villa)
    - _Requirements: 1.1, 1.2, 5.6_

- [ ] 4. Phase 3: Chip Optimization
  - [x] 4.1 Add high-frequency chips
    - Update chip constant arrays (KITCHEN_CHIPS, BATHROOM_CHIPS, etc.) with chips recommended by Chip Analyzer (>15% frequency)
    - Add new chips to appropriate ChipSelector components
    - Add tooltips for new chips if terminology is unclear
    - Update CANONICAL_RULES to include new chip aliases
    - _Requirements: 3.2, 3.5_

  - [x] 4.2 Remove low-usage chips
    - Remove chips with <5% selection rate identified by Chip Analyzer
    - Update chip constant arrays
    - Remove from ChipSelector components
    - Update CANONICAL_RULES to remove obsolete mappings
    - _Requirements: 3.3_

  - [ ] 4.3 Enhance chip terminology
    - Fix ambiguous chip labels identified by analyzeChipTerminology()
    - Add tooltips for technical or unclear chips
    - Ensure all chips use standard Swedish real estate terminology
    - Update chip labels to match terminology in generated texts
    - _Requirements: 3.6, 8.1, 8.2, 8.5_

  - [ ] 4.4 Expand normalization engine
    - Expand CANONICAL_RULES based on Chip Analyzer findings
    - Add semantic duplicate detection (e.g., "laddbox" vs "laddplats elbil")
    - Improve conflict detection in mergeChipsAndText() to catch semantic duplicates
    - Add logging for normalization events
    - _Requirements: 11.1, 11.2, 11.5_

  - [ ]* 4.5 Write property tests for chip normalization
    - **Property 12: Chip-Freetext Duplicate Normalization**
    - **Property 13: Canonical Alias Mapping**
    - **Property 14: Duplicate Detection Toast**
    - **Validates: Requirements 3.7, 11.1, 11.2, 11.3, 11.4, 11.6**

  - [ ]* 4.6 Write unit tests for chip optimization
    - Test new chips render and toggle correctly
    - Test removed chips no longer appear
    - Test updated terminology displays correctly
    - Test expanded normalization rules
    - _Requirements: 3.2, 3.3, 3.6, 11.2_

- [ ] 5. Phase 4: Field Consolidation
  - [ ] 5.1 Remove low-value fields
    - Remove fields with impact score <40 and low appearance rate identified by Field Impact Analyzer
    - Remove from PropertyFormData interface
    - Remove from PromptFormProfessional.tsx
    - Update buildDispositionFromStructuredData() to handle missing fields gracefully with null checks
    - _Requirements: 2.2, 2.4, 2.6_

  - [ ]* 5.2 Write property test for high-impact field preservation
    - **Property 8: High-Impact Field Preservation**
    - **Validates: Requirements 2.6**

  - [ ] 5.3 Consolidate overlapping fields
    - Merge fields collecting same data identified by identifyOverlappingFields()
    - Update PropertyFormData interface
    - Update form UI to reflect consolidation
    - Update validation rules
    - Update disposition builder to map consolidated fields
    - _Requirements: 2.3_

  - [ ]* 5.4 Write property test for field overlap detection
    - **Property 6: Field Overlap Detection**
    - **Validates: Requirements 2.3**

  - [ ] 5.5 Convert appropriate fields to chip-only
    - Identify fields with <20 distinct values and >90% chip coverage
    - Remove freetext option for these fields
    - Add "Övrigt" (Other) chip with optional text field as fallback
    - Update form UI
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ]* 5.6 Write property tests for chip-only conversion
    - **Property 15: Chip-Only Candidate Evaluation**
    - **Property 16: Chip-Only Coverage Validation**
    - **Property 17: Chip-Only Fallback Option**
    - **Validates: Requirements 4.1, 4.3, 4.5**

  - [ ] 5.7 Update field metadata and documentation
    - Document all field changes (added, removed, consolidated)
    - Update help text and tooltips for modified fields
    - Update priority assignments based on Field Impact Analyzer results
    - Create migration guide for API consumers
    - _Requirements: 2.5, 6.6_

  - [ ]* 5.8 Write unit tests for field consolidation
    - Test removed fields no longer appear in form
    - Test consolidated fields work correctly
    - Test chip-only fields enforce selection
    - Test disposition builder handles all changes
    - _Requirements: 2.2, 2.3, 4.1_

- [ ] 6. Checkpoint - Validate field changes
  - Test form with all property types
  - Verify disposition builder handles all changes
  - Run regression tests
  - Ensure all tests pass, ask the user if questions arise

- [ ] 7. Phase 5: UX Improvements
  - [ ] 7.1 Reorder fields based on impact analysis
    - Move high-impact fields (score >70) earlier in form
    - Group related fields together in same FieldGroup
    - Ensure critical fields visible without scrolling on mobile
    - Update FieldGroup order in PromptFormProfessional.tsx
    - _Requirements: 6.1, 6.2, 6.3, 9.3_

  - [ ]* 7.2 Write property tests for field ordering
    - **Property 20: High-Impact Field Prioritization**
    - **Property 21: Related Field Grouping**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ] 7.3 Update priority checklist
    - Align priority checklist items with Field Impact Analyzer results
    - Add new high-impact fields to checklist
    - Remove low-impact fields from checklist
    - Update completion threshold (currently <4 triggers warning)
    - Implement scroll-to-field on checklist item click with temporary highlight
    - _Requirements: 6.4, 6.5, 13.3, 13.4, 13.5, 13.6_

  - [ ]* 7.4 Write property tests for priority checklist
    - **Property 22: Priority Field Warning**
    - **Property 29: Priority Checklist Real-Time Update**
    - **Property 30: Priority Checklist Percentage Accuracy**
    - **Property 31: Checklist Item Scroll-To**
    - **Validates: Requirements 6.4, 13.3, 13.4, 13.5, 13.6**

  - [ ] 7.5 Enhance mobile experience
    - Optimize touch targets to minimum 44x44px for all chips and buttons
    - Improve responsive layout for priority fields
    - Reduce scrolling required for critical fields on mobile viewports (≥375px)
    - Test on real mobile devices (iOS Safari, Android Chrome)
    - Verify draft persistence works on mobile browser interruptions
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 7.6 Write property test for mobile touch targets
    - **Property 37: Mobile Touch Target Size**
    - **Validates: Requirements 9.4**

  - [ ]* 7.7 Write property test for draft persistence
    - **Property 38: Draft Persistence Round-Trip**
    - **Validates: Requirements 9.5**

  - [ ] 7.8 Improve accessibility
    - Audit all interactive elements for ARIA labels (aria-label, aria-labelledby)
    - Ensure all chips support keyboard navigation (Space/Enter to toggle)
    - Associate validation errors with fields via aria-describedby
    - Verify logical tab order through all fields
    - Add visible focus indicators for all interactive elements
    - Test with screen readers (NVDA, JAWS, VoiceOver)
    - Verify WCAG 2.1 Level AA contrast ratios with automated tools
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [ ]* 7.9 Write property tests for accessibility
    - **Property 32: Required Field Asterisk Labeling**
    - **Property 34: Chip Keyboard Navigation**
    - **Property 35: Interactive Element ARIA Labels**
    - **Property 36: Validation Error Announcement**
    - **Validates: Requirements 14.3, 15.2, 15.3, 15.6**

  - [ ] 7.10 Add contextual help and guidance
    - Add tooltips for technical terms (fastighetsbeteckning, taxeringsvärde, etc.)
    - Improve help text clarity in FieldGroup components
    - Add examples in field placeholders
    - Add FieldImpactBadge components to show which texts each field affects
    - Explain field impact on generated text quality
    - _Requirements: 6.6, 8.4_

  - [ ]* 7.11 Write unit tests for UX improvements
    - Test field reordering displays correctly
    - Test priority checklist updates in real-time
    - Test mobile responsive layout at 375px, 768px, 1024px
    - Test keyboard navigation flow
    - Test contextual help displays correctly
    - _Requirements: 6.1, 6.6, 9.1, 15.1_

- [ ] 8. Phase 6: Validation & Documentation
  - [ ] 8.1 Implement field dependency logic
    - Implement property type-based field visibility (apartment vs house fields)
    - Implement balcony toggle dependency (show/hide balcony detail fields)
    - Clear dependent field values when hidden
    - Update field visibility immediately on dependency changes
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ]* 8.2 Write property tests for field dependencies
    - **Property 26: Property Type Field Visibility**
    - **Property 27: Balcony Dependency Visibility**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**

  - [ ] 8.3 Enhance validation engine
    - Implement dynamic required fields based on property type
    - Prevent form submission when required fields empty
    - Show warning dialog when <4 priority fields completed
    - Update priority checklist completion status in real-time
    - Display field-level validation errors inline with FormMessage
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.7_

  - [ ]* 8.4 Write property test for validation
    - **Property 28: Required Field Validation**
    - **Validates: Requirements 13.2**

  - [ ] 8.5 Optimize field grouping and labeling
    - Group fields into logical sections with clear headers
    - Use consistent labeling patterns across all fields
    - Indicate required fields with asterisk (*)
    - Indicate optional fields with "(valfritt)" label
    - Indicate Pro-only fields with "Pro" badge or lock icon
    - Use FieldGroup component consistently for all collapsible sections
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.7_

  - [ ]* 8.6 Write property test for Pro feature badges
    - **Property 33: Pro Feature Badge Display**
    - **Validates: Requirements 14.5**

  - [ ] 8.7 Validate address lookup coverage
    - Test address lookup API with sample of 100 valid Swedish addresses
    - Verify >90% success rate
    - Test fallback to manual entry on API failure
    - Preserve manually entered transport/neighborhood data on failure
    - _Requirements: 10.6_

  - [ ]* 8.8 Write property test for address lookup
    - **Property 39: Address Lookup Coverage**
    - **Validates: Requirements 10.6**

  - [ ] 8.9 Validate terminology consistency
    - Verify all chip labels match terminology in generated texts
    - Check against CANONICAL_RULES mappings
    - Ensure consistency with Hemnet/Booli terminology
    - Ensure consistency with Swedish real estate law terms
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [ ]* 8.10 Write property test for terminology
    - **Property 40: Terminology Consistency**
    - **Validates: Requirements 8.5**

  - [ ] 8.11 Write remaining property tests
    - **Property 4: Chip Redundancy Detection** (Requirements 2.1)
    - **Property 5: Low-Value Field Identification** (Requirements 2.2)
    - _Requirements: 2.1, 2.2_

  - [ ] 8.12 Run comprehensive regression tests
    - Run all existing form tests
    - Test with historical submission data
    - Validate generated text quality maintained
    - Test disposition builder with all property types
    - Verify no breaking changes to existing functionality
    - _Requirements: All_

  - [ ] 8.13 Performance optimization
    - Profile form rendering performance
    - Memoize expensive computations (priority checklist, field visibility)
    - Use React.memo for static components
    - Debounce draft persistence (500ms)
    - Lazy load expandable sections
    - Measure and optimize initial load time (<500ms target)
    - _Requirements: 9.6_

  - [ ]* 8.14 Write unit tests for performance
    - Test form renders within 500ms
    - Test field updates complete within 16ms (60fps)
    - Test draft save completes within 100ms
    - Test normalization completes within 200ms
    - _Requirements: 9.6_

  - [ ] 8.15 Create database schema for tracking
    - Create form_field_metadata table
    - Create chip_usage_stats table
    - Create form_optimization_runs table
    - Add indexes for performance
    - Write migration scripts
    - _Requirements: 7.1, 7.5_

  - [ ] 8.16 Update documentation
    - Document all field changes (added, removed, consolidated)
    - Update form usage guide
    - Document new validation rules
    - Create migration guide for API consumers
    - Document chip normalization rules
    - Document field impact methodology
    - _Requirements: All_

- [ ] 9. Final checkpoint - Production readiness
  - Run all tests (unit, property, regression)
  - Verify performance metrics meet targets
  - Review documentation completeness
  - Create rollout plan with feature flags
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (40 total)
- Unit tests validate specific examples and edge cases
- The form uses TypeScript/React with React Hook Form and Zod validation
- All new fields must integrate with buildDispositionFromStructuredData() in server/routes.ts
- Chip normalization uses CANONICAL_RULES for alias mapping
- Priority checklist drives user guidance toward high-impact fields
- Mobile optimization targets ≥375px viewports with 44x44px touch targets
- Accessibility compliance targets WCAG 2.1 Level AA
- Analysis phase requires minimum 100 historical submissions for statistical validity
