# Implementation Plan: Old Pipeline Removal

## Overview

This implementation removes the OLD 7-step pipeline (~2900 lines in routes.ts) and fully migrates to the NEW 3-step PerfectSwedishOrchestrator pipeline. The migration follows a 4-phase strategy over 5 weeks with gradual rollout, comprehensive monitoring, and automatic rollback capability.

**Key Objectives:**
- Remove ~2900 lines of obsolete OLD pipeline code
- Preserve critical utility functions (emergency fallback)
- Ensure zero production downtime
- Maintain or improve quality, speed, and cost metrics
- Enable instant rollback if issues occur

**Migration Strategy:**
- Phase 1: Preparation (Week 1) - Create new modules and tests
- Phase 2: Gradual Rollout (Week 2-3) - Enable feature flag gradually with monitoring
- Phase 3: Code Removal (Week 4) - Remove OLD pipeline code
- Phase 4: Measurement (Week 5) - Document impact and lessons learned

## Tasks

- [x] 1. Create emergency fallback module
  - [x] 1.1 Create `server/lib/perfect-swedish-fallback.ts` with fallback interfaces and class
    - Define `FallbackRequest` and `FallbackResult` interfaces
    - Implement `PerfectSwedishFallback` class with `generate()` method
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7_
  
  - [x] 1.2 Migrate `buildDeterministicFallbackDescription` from routes.ts to fallback module
    - Copy function from routes.ts (preserve exact logic)
    - Migrate helper functions: `buildFallbackLocationSentence`, `formatFallbackValue`
    - Update function to use new interfaces
    - _Requirements: 2.7, 4.2_
  
  - [x] 1.3 Implement emergency fallback generation logic
    - Generate all required fields (headline, socialCopy, instagramCaption, showingInvitation, shortAd)
    - Preserve user style preference (factual/balanced/selling)
    - Respect platform-specific rules (Hemnet vs Booli)
    - Return valid broker text that passes platform rules
    - _Requirements: 3.5, 3.6, 3.7_
  
  - [ ]* 1.4 Write unit tests for fallback module
    - Test fallback generation with various property types (apartment, house, villa)
    - Test style preservation (factual, balanced, selling)
    - Test platform rules (Hemnet restrictions, Booli allowances)
    - Test edge cases (missing data, invalid input)
    - _Requirements: 3.5, 3.6, 3.7_
  
  - [ ]* 1.5 Write property test for emergency fallback activation
    - **Property 6: Emergency Fallback Activation**
    - **Validates: Requirements 3.1, 3.2**
    - Test that fallback activates for any input causing NEW pipeline failure
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 1.6 Write property test for fallback output validity
    - **Property 8: Fallback Output Validity**
    - **Validates: Requirements 3.5, 3.6, 3.7**
    - Test that fallback output passes platform validation for any property data
    - _Requirements: 3.5, 3.6, 3.7_

- [ ] 2. Create feature flag system
  - [ ] 2.1 Create `server/lib/feature-flags.ts` with feature flag interfaces and manager
    - Define `FeatureFlags` interface with rollout configuration
    - Implement `FeatureFlagManager` class with get/set methods
    - Add auto-rollback logic with metric thresholds
    - _Requirements: 10.1, 10.2, 10.3, 10.7_
  
  - [ ] 2.2 Create database migration for feature_flags table
    - Create table with columns: id, flag_name, enabled, metadata, updated_at, updated_by
    - Add unique index on flag_name
    - Insert initial flag: oldPipelineRemovalEnabled = false
    - _Requirements: 10.1, 10.2_
  
  - [ ] 2.3 Implement automatic rollback logic
    - Check error rate threshold (>5% increase triggers rollback)
    - Check success rate threshold (<90% triggers rollback)
    - Check fallback rate threshold (>5% triggers rollback)
    - Log rollback events to Sentry with full context
    - _Requirements: 10.7, 10.8_
  
  - [ ]* 2.4 Write unit tests for feature flag system
    - Test flag get/set operations
    - Test auto-rollback triggers (error rate, success rate, fallback rate)
    - Test rollback logging
    - _Requirements: 10.7, 10.8_
  
  - [ ]* 2.5 Write property test for feature flag control
    - **Property 13: Feature Flag Control**
    - **Validates: Requirements 10.3**
    - Test that system uses only NEW pipeline when flag enabled
    - _Requirements: 10.3_

- [ ] 3. Create disposition builder module
  - [ ] 3.1 Create `server/lib/disposition-builder.ts` with builder function
    - Define `DispositionBuilderResult` interface
    - Implement `buildDispositionFromStructuredData()` function
    - Migrate logic from routes.ts if not already modular
    - _Requirements: 4.3_
  
  - [ ]* 3.2 Write unit tests for disposition builder
    - Test with various property data structures
    - Test metadata generation (source, hasAddress, hasPropertyType)
    - Test edge cases (missing fields, invalid data)
    - _Requirements: 4.3_

- [ ] 4. Create database migrations for rollout tracking
  - [ ] 4.1 Create migration to add columns to pipeline_generations table
    - Add `is_fallback BOOLEAN DEFAULT FALSE`
    - Add `fallback_reason TEXT`
    - Add `pipeline_version VARCHAR(50) DEFAULT 'new'`
    - _Requirements: 3.4, 8.7_
  
  - [ ] 4.2 Create migration for rollout_metrics table
    - Create table with columns: id, timestamp, metric_name, metric_value, metadata
    - Add indexes on timestamp and metric_name
    - _Requirements: 10.4, 10.5, 10.6, 12.1, 12.2, 12.3, 12.4_
  
  - [ ] 4.3 Test migrations in development environment
    - Run migrations and verify schema changes
    - Test rollback of migrations
    - Verify indexes are created correctly
    - _Requirements: 7.4_

- [x] 5. Enhance PerfectSwedishOrchestrator with fallback integration
  - [x] 5.1 Add emergency fallback integration to orchestrator
    - Import `PerfectSwedishFallback` class
    - Wrap pipeline execution in try-catch
    - Call fallback on pipeline failure after retries
    - _Requirements: 3.1, 3.2_
  
  - [x] 5.2 Add fallback logging to Sentry
    - Log fallback activation with full context (userId, sessionId, error)
    - Tag with component='pipeline', fallback_triggered='true'
    - Include original error details
    - _Requirements: 3.3_
  
  - [x] 5.3 Add fallback database marking
    - Save generation with is_fallback=true
    - Save fallback_reason with error message
    - Save pipeline_version='new'
    - _Requirements: 3.4_
  
  - [x] 5.4 Implement graceful degradation for post-processor failures
    - Catch post-processor errors
    - Continue execution with raw generated text
    - Mark post-processor as unavailable in result
    - _Requirements: 1.5_
  
  - [x] 5.5 Implement graceful degradation for analyzer failures
    - Catch analyzer errors
    - Continue execution without expert feedback
    - Mark analyzer as unavailable in result
    - _Requirements: 1.5_
  
  - [ ]* 5.6 Write integration test for fallback flow
    - Test end-to-end generation with forced pipeline failure
    - Verify fallback activation and valid output
    - Verify Sentry logging and database marking
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 5.7 Write property test for graceful degradation
    - **Property 2: Graceful Degradation**
    - **Validates: Requirements 1.5**
    - Test that pipeline continues when post-processor or analyzer fails
    - _Requirements: 1.5_
  
  - [ ]* 5.8 Write property test for fallback logging and marking
    - **Property 7: Fallback Logging and Marking**
    - **Validates: Requirements 3.3, 3.4**
    - Test that fallback events are logged and marked correctly
    - _Requirements: 3.3, 3.4_

- [ ] 6. Implement monitoring and metrics collection
  - [ ] 6.1 Add metrics collection to orchestrator
    - Track success rate, average duration, fallback rate, generation cost
    - Save metrics to rollout_metrics table
    - Calculate per-generation cost based on tokens and model pricing
    - _Requirements: 8.5, 8.6, 12.1, 12.2, 12.3, 12.4_
  
  - [ ] 6.2 Create monitoring dashboard queries
    - Query for real-time metrics (last 15 minutes)
    - Query for historical metrics (last 24 hours)
    - Query for OLD vs NEW comparison metrics
    - _Requirements: 12.8_
  
  - [ ] 6.3 Configure alerting rules
    - Alert when success rate drops below 90%
    - Alert when average duration exceeds 15 seconds
    - Alert when fallback rate exceeds 5%
    - _Requirements: 12.5, 12.6, 12.7_
  
  - [ ]* 6.4 Write property test for metrics persistence
    - **Property 3: Metrics Persistence**
    - **Validates: Requirements 1.6**
    - Test that metrics are saved for any generation request
    - _Requirements: 1.6_
  
  - [ ]* 6.5 Write property test for monitoring metrics collection
    - **Property 16: Monitoring Metrics Collection**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
    - Test that all required metrics are collected and exposed
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 7. Write comprehensive property-based tests
  - [ ]* 7.1 Write property test for error handling with retry
    - **Property 1: Error Handling with Retry**
    - **Validates: Requirements 1.4**
    - Test retry logic for transient errors (network timeout, rate limit)
    - _Requirements: 1.4_
  
  - [ ]* 7.2 Write property test for WebSocket progress updates
    - **Property 4: WebSocket Progress Updates**
    - **Validates: Requirements 1.7**
    - Test progress events for each pipeline step
    - _Requirements: 1.7_
  
  - [ ]* 7.3 Write property test for plan limits enforcement
    - **Property 5: Plan Limits Enforcement**
    - **Validates: Requirements 1.8**
    - Test quota enforcement for free/pro/premium plans
    - _Requirements: 1.8_
  
  - [ ]* 7.4 Write property test for Hemnet platform compliance
    - **Property 9: Platform Compliance - Hemnet**
    - **Validates: Requirements 11.1, 11.3, 11.4, 11.5**
    - Test that Hemnet restrictions are enforced for any property data
    - _Requirements: 11.1, 11.3, 11.4, 11.5_
  
  - [ ]* 7.5 Write property test for Booli platform compliance
    - **Property 10: Platform Compliance - Booli**
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5**
    - Test that Booli rules are enforced for any property data
    - _Requirements: 11.2, 11.3, 11.4, 11.5_
  
  - [ ]* 7.6 Write property test for forbidden phrase removal
    - **Property 11: Forbidden Phrase Removal**
    - **Validates: Requirements 11.6**
    - Test that forbidden phrases are removed from all fields
    - _Requirements: 11.6_
  
  - [ ]* 7.7 Write property test for paragraph structure enforcement
    - **Property 12: Paragraph Structure Enforcement**
    - **Validates: Requirements 11.7**
    - Test that main text has proper paragraph breaks
    - _Requirements: 11.7_
  
  - [ ]* 7.8 Write property test for rollout metrics tracking
    - **Property 14: Rollout Metrics Tracking**
    - **Validates: Requirements 10.4, 10.5, 10.6**
    - Test that rollout metrics are tracked and persisted
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [ ]* 7.9 Write property test for rollout state change logging
    - **Property 15: Rollout State Change Logging**
    - **Validates: Requirements 10.8**
    - Test that flag changes and rollbacks are logged to Sentry
    - _Requirements: 10.8_
  
  - [ ]* 7.10 Write property test for generation cost tracking
    - **Property 17: Generation Cost Tracking**
    - **Validates: Requirements 8.5**
    - Test that cost is calculated and recorded for any generation
    - _Requirements: 8.5_
  
  - [ ]* 7.11 Write property test for generation duration tracking
    - **Property 18: Generation Duration Tracking**
    - **Validates: Requirements 8.6**
    - Test that duration is measured and recorded for any generation
    - _Requirements: 8.6_
  
  - [ ]* 7.12 Write property test for fallback usage rate calculation
    - **Property 19: Fallback Usage Rate Calculation**
    - **Validates: Requirements 8.8**
    - Test that fallback rate can be calculated from database records
    - _Requirements: 8.8_

- [ ] 8. Checkpoint - Verify all preparation complete
  - Ensure all tests pass (unit + property + integration)
  - Ensure TypeScript compilation succeeds
  - Ensure database migrations work correctly
  - Ask the user if questions arise before proceeding to rollout

- [ ] 9. Phase 2: Gradual rollout (Week 2-3)
  - [ ] 9.1 Deploy Phase 1 changes to production
    - Deploy new modules (fallback, feature flags, disposition builder)
    - Deploy database migrations
    - Deploy enhanced orchestrator
    - Verify deployment successful
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ] 9.2 Enable feature flag for 10% of traffic (Day 1-2)
    - Update feature_flags table: oldPipelineRemovalEnabled = true, metadata = {"percentage": 10}
    - Monitor metrics every 4 hours
    - Verify success rate >= 95%, duration < 10s, fallback rate < 1%
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 10.6_
  
  - [ ] 9.3 Increase to 25% of traffic (Day 3-4)
    - Update feature flag percentage to 25%
    - Monitor metrics every 4 hours
    - Verify no regressions in success rate, duration, or fallback rate
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [ ] 9.4 Increase to 50% of traffic (Day 5-7)
    - Update feature flag percentage to 50%
    - Monitor metrics every 4 hours
    - Verify metrics remain stable
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [ ] 9.5 Increase to 75% of traffic (Day 8-10)
    - Update feature flag percentage to 75%
    - Monitor metrics every 4 hours
    - Verify metrics remain stable
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [ ] 9.6 Increase to 100% of traffic (Day 11-14)
    - Update feature flag percentage to 100%
    - Monitor metrics every 4 hours for 7 days
    - Verify all metrics are stable and good
    - _Requirements: 7.1, 10.4, 10.5, 10.6_

- [ ] 10. Checkpoint - Verify 100% rollout stable
  - Verify NEW pipeline handling 100% of traffic for 7 days
  - Verify success rate >= 95%, duration < 10s, fallback rate < 1%
  - Verify no critical Sentry alerts
  - Verify zero user complaints
  - Ask the user if questions arise before proceeding to code removal

- [x] 11. Phase 3: Remove OLD pipeline code (Week 4)
  - [x] 11.1 Identify all OLD pipeline functions to remove
    - Analyze routes.ts lines 3200-6100
    - List all functions: finalizeMainMarketingText, repair functions, quality gates, retry logic
    - Verify none are called by NEW pipeline or active code
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 11.2 Remove OLD pipeline code from routes.ts
    - Delete lines 3200-6100 (OLD pipeline implementation)
    - Remove finalizeMainMarketingText function and all calls
    - Remove OLD pipeline repair functions not used elsewhere
    - Remove OLD pipeline quality gates not used elsewhere
    - Remove OLD pipeline retry logic not used elsewhere
    - Remove OLD pipeline validation logic not used elsewhere
    - Remove OLD pipeline observability code specific to 7-step architecture
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [x] 11.3 Update all imports to reference new module locations
    - Update imports for buildDeterministicFallbackDescription (now in perfect-swedish-fallback.ts)
    - Update imports for buildDispositionFromStructuredData (now in disposition-builder.ts)
    - Verify no broken imports remain
    - _Requirements: 4.4_
  
  - [x] 11.4 Update or remove tests that depend on OLD pipeline
    - Remove tests that import finalizeMainMarketingText
    - Remove tests that validate OLD pipeline behavior
    - Update tests for shared utilities to use new import paths
    - Verify buildDeterministicFallbackDescription tests remain valid
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 11.5 Run full test suite and verify all tests pass
    - Run unit tests: npm run test
    - Run property tests: npm run test (property tests included)
    - Run regression tests: npm run test:regression
    - Run integration tests: npm run test (integration tests included)
    - Verify TypeScript compilation: npm run check
    - _Requirements: 4.5, 4.6, 6.6, 6.7_
  
  - [x] 11.6 Deploy OLD pipeline removal to production
    - Deploy code changes
    - Verify deployment successful
    - Monitor metrics closely for 48 hours
    - Verify no regressions in success rate, duration, or fallback rate
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

- [ ] 12. Checkpoint - Verify production stability after removal
  - Verify all metrics stable for 48 hours post-removal
  - Verify no critical errors or alerts
  - Verify zero user complaints
  - Ask the user if questions arise before proceeding to measurement

- [ ] 13. Phase 4: Measure impact and document (Week 5)
  - [ ] 13.1 Measure codebase impact
    - Count lines of code removed (~2900 expected)
    - Measure routes.ts size reduction (~43% expected)
    - Measure test suite execution time before/after
    - Measure TypeScript compilation time before/after
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 13.2 Measure performance impact
    - Calculate average generation cost per text (OLD vs NEW)
    - Calculate average generation time per text (OLD vs NEW)
    - Calculate generation success rate (OLD vs NEW)
    - Calculate emergency fallback usage rate
    - _Requirements: 8.5, 8.6, 8.7, 8.8_
  
  - [ ] 13.3 Create architecture documentation
    - Document NEW pipeline architecture in detail
    - Document emergency fallback mechanism
    - Update architecture diagrams to show only NEW pipeline
    - Document which OLD pipeline functions were preserved and why
    - Document which OLD pipeline functions were removed and why
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 13.4 Create operational documentation
    - Document migration process and timeline
    - Document lessons learned from maintaining two pipelines
    - Create troubleshooting guide for NEW pipeline issues
    - Document rollback procedures
    - _Requirements: 7.7, 9.6, 9.7, 9.8_
  
  - [ ] 13.5 Verify all requirements met
    - Review all 12 requirements and 96 acceptance criteria
    - Verify NEW pipeline production readiness (Requirement 1)
    - Verify OLD pipeline functions properly categorized (Requirement 2)
    - Verify emergency fallback mechanism works (Requirement 3)
    - Verify utility functions migrated (Requirement 4)
    - Verify OLD pipeline code removed (Requirement 5)
    - Verify tests updated (Requirement 6)
    - Verify deployment safety (Requirement 7)
    - Verify impact measured (Requirement 8)
    - Verify documentation complete (Requirement 9)
    - Verify gradual rollout successful (Requirement 10)
    - Verify platform rules preserved (Requirement 11)
    - Verify monitoring comprehensive (Requirement 12)
    - _Requirements: 1-12_

- [ ] 14. Final checkpoint - Migration complete
  - Ensure all tasks completed successfully
  - Ensure all metrics show improvement or stability
  - Ensure documentation is comprehensive
  - Ask the user if questions arise or if any follow-up work is needed

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user involvement
- Property tests validate universal correctness properties (19 properties total)
- Unit tests validate specific examples and edge cases
- The 4-phase migration strategy ensures zero production downtime
- Automatic rollback protects against metrics degradation
- Emergency fallback ensures text generation never completely fails

## Success Criteria

**Technical:**
- ~2900 lines of OLD pipeline code removed
- All tests pass (unit + property + integration + regression)
- TypeScript compilation succeeds with zero errors
- Success rate >= 95%, duration < 10s, fallback rate < 1%

**Business:**
- Zero production downtime during migration
- Zero user complaints
- Reduced AI costs (single GPT-5.2 call vs multiple)
- Faster generation (3 steps vs 7 steps)
- Simpler, more maintainable codebase
