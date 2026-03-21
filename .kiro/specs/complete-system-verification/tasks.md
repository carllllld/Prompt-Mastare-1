# Implementation Plan: Complete System Verification

## Overview

This implementation plan ensures ALL 6 generated text fields (improvedPrompt, headline, socialCopy, instagramCaption, showingInvitation, shortAd) comply with platform rules, are free from forbidden phrases, and meet field-specific quality requirements. The system currently only verifies the main text (improvedPrompt), leaving 5 auxiliary fields unverified.

**Implementation Language:** TypeScript

**Key Components:**
- SmartGenerationEngine (server/lib/perfect-swedish-generator.ts)
- DeterministicPostProcessor (server/lib/perfect-swedish-post-processor.ts)
- ExpertAIAnalyzer (server/lib/perfect-swedish-analyzer.ts)

**Testing Approach:**
- Property-based tests (12 properties) using fast-check
- Unit tests for each component
- Integration tests for full pipeline
- Regression tests for known issues

---

## Tasks

- [x] 1. Generator enhancements - Add auxiliary field validation
  - [x] 1.1 Update system prompt with platform-specific rules for all 6 fields
    - Add Hemnet-specific instructions for headline, socialCopy, instagramCaption, showingInvitation, shortAd
    - Add field-specific quality rules (headline max 9 words, no punctuation, etc.)
    - Add examples for each field showing compliant vs non-compliant output
    - Update buildSystemPrompt() method in server/lib/perfect-swedish-generator.ts
    - _Requirements: 1.1.1, 1.1.2, 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 2.1.1_

  - [x] 1.2 Implement validateGeneratedOutput() method
    - Create validation method that checks all 6 fields for platform violations
    - Check Hemnet: no price/fee/energiklass in ANY field
    - Check field-specific rules: headline max 9 words, no trailing punctuation, showingInvitation contains "visning"
    - Throw GeneratorValidationError with detailed violations list
    - Add to generate() method before returning result
    - _Requirements: 1.1.1, 1.1.2, 1.3.1, 1.3.4, 2.1.2_

  - [x] 1.3 Add logging and error handling for validation failures
    - Log validation failures with platform, violations, and timestamp
    - Increment metrics counter for generator validation failures
    - Integrate with Sentry for production error tracking
    - _Requirements: 2.1.2, 3.2.1_

  - [x] 1.4 Bump PROMPT_VERSION to 2.9.0
    - Update PROMPT_VERSION constant in generator
    - Clear Redis cache for prompt caching
    - Document version change in code comments
    - _Requirements: 2.1.1_

  - [ ]* 1.5 Write unit tests for generator validation
    - Test validateGeneratedOutput() catches Hemnet violations in each field
    - Test field-specific quality rules (headline word count, punctuation, etc.)
    - Test error messages contain correct violation details
    - _Requirements: 3.1.1, 3.1.3_

- [x] 2. Post-processor enhancements - Filter all fields for platform rules
  - [x] 2.1 Implement removePlatformForbiddenPatterns() method
    - Create method that removes Hemnet-forbidden patterns from ALL 6 fields
    - Remove price patterns: pris, utgångspris, avgift, driftkostnad, kr/mån
    - Remove energiklass patterns: energiklass, energiprestanda
    - Log transformations for each removal
    - Add to process() pipeline after removeForbiddenPhrases()
    - Update server/lib/perfect-swedish-post-processor.ts
    - _Requirements: 1.1.1, 1.1.2, 2.2.3_

  - [x] 2.2 Implement enforceFieldQualityRules() method
    - Remove trailing punctuation from headline (already exists, verify coverage)
    - Ensure socialCopy ends with period
    - Limit instagramCaption to max 2 emojis
    - Log transformations for each fix
    - Add to process() pipeline after removePlatformForbiddenPatterns()
    - _Requirements: 1.3.1, 1.3.2, 1.3.3, 2.2.1_

  - [x] 2.3 Update process() pipeline to include new filtering steps
    - Add removePlatformForbiddenPatterns() step
    - Add enforceFieldQualityRules() step
    - Ensure proper ordering: forbidden phrases → platform patterns → field quality
    - Wrap each step in safeTransform() for graceful degradation
    - _Requirements: 2.2.1, 2.2.2, 2.2.3_

  - [x] 2.4 Add comprehensive logging for violations removed
    - Log violations by field and pattern type
    - Update metrics counters (hemnetViolations.byField, hemnetViolations.total)
    - Log to console with [PLATFORM_VIOLATIONS_REMOVED] prefix
    - _Requirements: 3.2.1_

  - [ ]* 2.5 Write unit tests for post-processor filtering
    - Test removePlatformForbiddenPatterns() removes price/fee/energiklass from all fields
    - Test enforceFieldQualityRules() fixes headline punctuation, socialCopy period, Instagram emojis
    - Test transformations are logged correctly
    - Test graceful degradation if step fails
    - _Requirements: 3.1.1, 3.1.3_

- [x] 3. Analyzer enhancements - Analyze all 6 fields
  - [x] 3.1 Update AnalysisRequest interface to include missing fields
    - Add instagramCaption: string
    - Add showingInvitation: string
    - Add shortAd: string
    - Update interface in server/lib/perfect-swedish-analyzer.ts
    - _Requirements: 2.3.1_

  - [x] 3.2 Update buildAnalysisPrompt() to include all 6 fields in prompt
    - Add Instagram, Visningsinbjudan, Kort annons sections to prompt
    - Add field-specific validation instructions for each field
    - Add platform rule checks for all fields
    - Update prompt to return feedback with location field for all 6 fields
    - _Requirements: 2.3.1, 2.3.2_

  - [x] 3.3 Update identifyTextSpans() to handle all 6 fields
    - Add instagramCaption, showingInvitation, shortAd to texts object
    - Ensure text span identification works for all fields
    - Update location matching to handle new field names
    - _Requirements: 2.3.1_

  - [x] 3.4 Add timeout handling for analyzer
    - Implement Promise.race() with 30-second timeout
    - Return partial analysis if timeout occurs
    - Log timeout events for monitoring
    - _Requirements: 3.2.2_

  - [ ]* 3.5 Write unit tests for analyzer coverage
    - Test analyzer receives all 6 fields as input
    - Test analyzer returns feedback for violations in auxiliary fields
    - Test Hemnet violations in auxiliary fields flagged as critical severity
    - Test timeout handling returns graceful fallback
    - _Requirements: 3.1.1, 3.1.3_

- [x] 4. Checkpoint - Verify core implementation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Property-based testing - Verify universal correctness properties
  - [x] 5.1 Set up property-based testing infrastructure
    - Install fast-check if not already installed
    - Create server/tests/complete-system-verification-properties.test.ts
    - Create arbitrary data generators (arbitraryPropertyData, arbitraryStyle, arbitraryPlatform)
    - Set up test configuration with 100 iterations per property
    - _Requirements: 3.1.1_

  - [ ]* 5.2 Write property test for Hemnet platform rules compliance
    - **Property 1: Hemnet Platform Rules Compliance**
    - **Validates: Requirements 1.1.1, 1.1.2**
    - Test that ALL 6 fields are free from price/fee/energiklass for Hemnet platform
    - Use arbitraryPropertyData() and arbitraryStyle() generators
    - Run 100+ iterations
    - _Requirements: 3.1.1_

  - [ ]* 5.3 Write property test for Booli platform flexibility
    - **Property 2: Booli Platform Flexibility**
    - **Validates: Requirements 1.1.3**
    - Test that price/fee can appear in appropriate fields for Booli
    - Verify format is correct when present
    - _Requirements: 3.1.1_

  - [ ]* 5.4 Write property test for forbidden phrases elimination
    - **Property 3: Forbidden Phrases Elimination**
    - **Validates: Requirements 1.2.1**
    - Test that ALL 6 fields are free from forbidden phrases (respecting style exemptions)
    - Use arbitraryForbiddenPhrase() generator
    - _Requirements: 3.1.1_

  - [ ]* 5.5 Write property test for headline quality requirements
    - **Property 4: Headline Quality Requirements**
    - **Validates: Requirements 1.3.1**
    - Test headline: max 9 words, no trailing punctuation, no emojis
    - _Requirements: 3.1.3_

  - [ ]* 5.6 Write property test for social copy quality requirements
    - **Property 5: Social Copy Quality Requirements**
    - **Validates: Requirements 1.3.2**
    - Test socialCopy: 1-3 sentences, ends with period, no aggressive CTAs
    - _Requirements: 3.1.3_

  - [ ]* 5.7 Write property test for Instagram caption quality requirements
    - **Property 6: Instagram Caption Quality Requirements**
    - **Validates: Requirements 1.3.3**
    - Test instagramCaption: 1-2 emojis, max 2200 chars, ends with punctuation
    - _Requirements: 3.1.3_

  - [ ]* 5.8 Write property test for showing invitation quality requirements
    - **Property 7: Showing Invitation Quality Requirements**
    - **Validates: Requirements 1.3.4**
    - Test showingInvitation: contains "visning", 1-2 sentences
    - _Requirements: 3.1.3_

  - [ ]* 5.9 Write property test for short ad quality requirements
    - **Property 8: Short Ad Quality Requirements**
    - **Validates: Requirements 1.3.5**
    - Test shortAd: max 2 sentences, contains property type and area
    - _Requirements: 3.1.3_

  - [ ]* 5.10 Write property test for post-processor field coverage
    - **Property 9: Post-Processor Field Coverage**
    - **Validates: Requirements 2.2.1**
    - Test that post-processor processes all 6 fields
    - _Requirements: 3.1.1_

  - [ ]* 5.11 Write property test for post-processor forbidden phrase removal
    - **Property 10: Post-Processor Forbidden Phrase Removal**
    - **Validates: Requirements 2.2.2**
    - Test that post-processor removes forbidden phrases from all fields
    - Inject forbidden phrases and verify removal
    - _Requirements: 3.1.1_

  - [ ]* 5.12 Write property test for post-processor platform pattern removal
    - **Property 11: Post-Processor Platform Pattern Removal**
    - **Validates: Requirements 2.2.3**
    - Test that post-processor removes Hemnet-forbidden patterns from all fields
    - Inject price/fee/energiklass and verify removal
    - _Requirements: 3.1.1_

  - [ ]* 5.13 Write property test for analyzer field coverage
    - **Property 12: Analyzer Field Coverage**
    - **Validates: Requirements 2.3.1, 2.3.2**
    - Test that analyzer can flag violations in all 6 fields
    - Test that platform violations are marked as critical severity
    - _Requirements: 3.1.1_

- [x] 6. Integration testing - Verify full pipeline
  - [ ]* 6.1 Write integration test for complete Hemnet pipeline
    - Test full pipeline: generate → post-process → analyze
    - Verify all 6 fields present and compliant
    - Verify no Hemnet violations in any field
    - Verify field-specific quality requirements met
    - Create server/tests/complete-system-verification-integration.test.ts
    - _Requirements: 4.1, 4.2_

  - [ ]* 6.2 Write integration test for Booli pipeline
    - Test that Booli allows price/fee in appropriate fields
    - Verify format is correct
    - _Requirements: 4.1_

  - [ ]* 6.3 Write regression test for auxiliary field violations
    - Load fixture data that previously caused violations
    - Verify fixes prevent violations
    - Test with real property data
    - _Requirements: 4.3_

- [x] 7. Checkpoint - Verify all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Monitoring and observability - Track violations in production
  - [x] 8.1 Implement metrics collection for system verification
    - Create SystemVerificationMetrics interface
    - Track hemnetViolations by field and pattern
    - Track forbiddenPhraseOccurrences by field and phrase
    - Track fieldQualityViolations by field and rule
    - Track pipeline health (generatorValidationFailures, postProcessorErrors, analyzerTimeouts)
    - Create server/lib/system-verification-metrics.ts
    - _Requirements: 3.2.1, 3.2.2_

  - [x] 8.2 Set up alerting thresholds
    - Define ALERT_THRESHOLDS constant
    - hemnetViolationsPerHour: 10
    - generatorFailuresPerHour: 5
    - forbiddenPhrasesPerHour: 20
    - analyzerTimeoutsPerHour: 3
    - Implement checkAlertThresholds() function
    - _Requirements: 3.2.2_

  - [x] 8.3 Integrate metrics with existing monitoring system
    - Add metrics to perfect-swedish-monitoring.ts
    - Add alerts to perfect-swedish-alerts.ts
    - Update monitoring dashboard to show new metrics
    - _Requirements: 3.2.1, 3.2.2_

  - [ ]* 8.4 Write tests for monitoring and alerting
    - Test metrics are incremented correctly
    - Test alerts trigger at correct thresholds
    - Test dashboard displays metrics
    - _Requirements: 3.2.1, 3.2.2_

- [x] 9. Documentation and deployment preparation
  - [x] 9.1 Update API documentation
    - Document updated AnalysisRequest interface
    - Document new validation errors
    - Document new metrics and alerts
    - _Requirements: 4.2_

  - [x] 9.2 Create deployment checklist
    - Verify all tests pass
    - Verify PROMPT_VERSION bumped to 2.9.0
    - Verify Redis cache cleared
    - Verify monitoring configured
    - Document rollback plan
    - _Requirements: 4.2, 4.3_

  - [x] 9.3 Prepare staging deployment
    - Deploy to staging environment
    - Run canary tests with real property data
    - Monitor metrics for 24 hours
    - Verify 0 Hemnet violations
    - _Requirements: 4.1, 4.3_

- [x] 10. Final checkpoint - Production readiness
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties across randomized inputs
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end pipeline behavior
- Monitoring ensures production visibility into violations
- Checkpoints ensure incremental validation at key milestones

## Success Criteria

- 100% of Hemnet texts have 0 price/fee/energiklass violations in ALL 6 fields
- 100% of texts have 0 forbidden phrases in ALL 6 fields
- 95%+ of texts meet field-specific quality requirements
- All 12 correctness properties pass with 100+ iterations
- Generator validation catches violations before post-processor
- Post-processor successfully filters all fields
- Analyzer analyzes all 6 fields and flags violations as critical
- Monitoring provides real-time visibility into violations
- 0 production incidents related to platform violations

## Rollback Plan

If critical issues discovered after deployment:

**Immediate Rollback (< 5 minutes):**
1. Revert PROMPT_VERSION to 2.8.0
2. Clear Redis cache
3. Monitor for 15 minutes

**Partial Rollback (< 15 minutes):**
- Generator issues: Revert generator changes only
- Post-processor issues: Disable new filtering steps
- Analyzer issues: Revert analyzer changes only

**Full Rollback (< 30 minutes):**
1. Revert all code changes
2. Clear Redis cache
3. Restart services
4. Verify system returns to previous behavior
