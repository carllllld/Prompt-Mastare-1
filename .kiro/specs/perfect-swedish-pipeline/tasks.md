# Implementation Plan: Perfect Swedish Pipeline

## Overview

This implementation plan transforms OptiPrompt's text generation from a 7-step architecture to an optimized 3-step pipeline (Smart Generation → Post-Processing → Expert Analysis), complemented by powerful frontend editing tools. The implementation follows a 5-week roadmap with incremental validation and gradual rollout.

**Key Goals:**
- 95%+ success rate (up from 70%)
- <25s generation time (down from 65s)
- Zero spelling errors in Swedish
- Intuitive editing tools for brokers

## Tasks

- [x] 1. Set up database schema and A/B testing infrastructure
  - Create pipeline_generations table for tracking all generation attempts
  - Create ab_test_assignments table for session consistency
  - Create pipeline_metrics table for aggregated metrics
  - Create user_feedback table for satisfaction tracking
  - Create expert_feedback_items table for analytics
  - Add database indexes for performance
  - Set up Redis cache schema for session assignments and prompt templates
  - _Requirements: 9.1, 9.2, 9.6, 10.1-10.8_

- [x] 2. Implement Smart Generation Engine
  - [x] 2.1 Create core Smart Generation module with OpenAI integration
    - Create `server/lib/perfect-swedish-generator.ts` with SmartGenerationEngine class
    - Implement OpenAI GPT-5.2 API integration with reasoning:medium
    - Add connection pooling and timeout configuration
    - Implement streaming support for progress updates
    - Add error handling for API failures
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Build optimized prompt with Swedish language rules
    - Implement buildPrompt() method with structured sections
    - Add system role prompt defining expert Swedish broker persona
    - Include explicit Swedish spelling rules with examples
    - Add grammar rules (tempus, genus, plural, adjective agreement)
    - Include punctuation rules (periods, commas, capitalization)
    - Add natural language guidelines (active verbs, concrete descriptions)
    - Include 10-15 concrete examples of correct vs incorrect Swedish
    - Add mandatory self-check checklist
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.3 Write property test for Smart Generation performance
    - **Property 1: Generation Performance Constraint**
    - **Validates: Requirements 1.2**
    - Test that generation completes within 15-18 seconds across various dispositions
    - Use fast-check with 100 iterations

  - [ ]* 2.4 Write property test for zero spelling errors
    - **Property 2: Zero Spelling Errors**
    - **Validates: Requirements 1.3**
    - Test generated Swedish text with spell checker across random inputs
    - Verify 100% correct spelling

  - [ ]* 2.5 Write unit tests for Smart Generation
    - Test prompt building includes Swedish language rules
    - Test prompt includes self-check instructions
    - Test error logging on generation failure
    - Test OpenAI API integration with mock responses
    - _Requirements: 1.7_

- [x] 3. Implement Deterministic Post-Processor
  - [x] 3.1 Create Post-Processor module with transformation pipeline
    - Create `server/lib/perfect-swedish-post-processor.ts` with DeterministicPostProcessor class
    - Implement process() method that applies all transformations sequentially
    - Add transformation logging for debugging
    - Ensure deterministic behavior (same input → same output)
    - _Requirements: 2.1, 2.7, 2.8_

  - [x] 3.2 Implement placeholder removal and replacement
    - Remove [TID], [KONTAKT], [MÄKLARE] placeholders completely
    - Replace [ADRESS] with actual address from disposition
    - Log all placeholder transformations
    - _Requirements: 2.3_

  - [x] 3.3 Implement formatting fixes
    - Add missing periods between sentences (regex: /([a-zåäö])\s+([A-ZÅÄÖ])/)
    - Remove periods from headlines
    - Normalize multiple spaces to single space
    - Fix capitalization after periods
    - _Requirements: 2.4_

  - [x] 3.4 Implement forbidden phrase removal with style awareness
    - Load forbidden phrases from existing text-rules.ts
    - Apply style-specific exemptions (balanced, selling can use some phrases)
    - Use pre-compiled regex patterns for performance
    - Log each phrase removal
    - _Requirements: 2.5_

  - [x] 3.5 Implement Swedish character normalization
    - Ensure UTF-8 encoding for å, ä, ö
    - Fix common encoding issues
    - Normalize character representations
    - _Requirements: 2.6_

  - [ ]* 3.6 Write property test for post-processing idempotence
    - **Property 12: Post-Processing Idempotence**
    - **Validates: Requirements 2.7**
    - Test that running post-processor twice produces identical output
    - Use fast-check with 100 iterations

  - [ ]* 3.7 Write property test for placeholder removal
    - **Property 8: Placeholder Removal**
    - **Validates: Requirements 2.3**
    - Test that all placeholders are removed across random text inputs

  - [ ]* 3.8 Write unit tests for Post-Processor
    - Test placeholder removal for all placeholder types
    - Test forbidden phrase removal respects style exemptions
    - Test formatting fixes (missing periods, headline periods)
    - Test performance completes within 1 second
    - Test transformation logging
    - _Requirements: 2.2, 2.8_

- [ ] 4. Checkpoint - Verify backend core components
  - Ensure all tests pass for Smart Generation and Post-Processor
  - Test integration between the two components
  - Verify performance targets (Smart Gen: 15-18s, Post-Proc: <1s)
  - Ask the user if questions arise

- [x] 5. Implement Expert AI Analyzer
  - [x] 5.1 Create Expert Analyzer module with dual-perspective analysis
    - Create `server/lib/perfect-swedish-analyzer.ts` with ExpertAIAnalyzer class
    - Implement OpenAI GPT-5.2 integration with reasoning:low for speed
    - Build analysis prompt with broker + lawyer perspectives
    - Add structured JSON output parsing
    - Implement error handling and graceful degradation
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Implement text span identification and feedback generation
    - Parse feedback items from AI response
    - Identify text spans (start, end, field) for location-specific feedback
    - Generate actionable auto-fix suggestions where possible
    - Validate feedback structure (categories, severity levels)
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ]* 5.3 Write property test for analysis structure validation
    - **Property 16: Structured JSON Output**
    - **Validates: Requirements 3.4**
    - Test that analysis output conforms to ExpertAnalysis schema
    - Verify all required fields present

  - [ ]* 5.4 Write property test for dual perspective analysis
    - **Property 15: Dual Perspective Analysis**
    - **Validates: Requirements 3.3**
    - Test that feedback includes both broker and lawyer perspectives

  - [ ]* 5.5 Write unit tests for Expert Analyzer
    - Test analysis returns valid ExpertAnalysis structure
    - Test feedback includes both broker and lawyer perspectives
    - Test text spans for location-specific feedback
    - Test only allowed categories and severity levels used
    - Test performance completes within 7 seconds
    - _Requirements: 3.2_

- [x] 6. Implement Pipeline Orchestrator
  - [x] 6.1 Create orchestrator with 3-step pipeline execution
    - Create `server/lib/perfect-swedish-orchestrator.ts` with PerfectSwedishOrchestrator class
    - Implement execute() method coordinating all three steps
    - Add sequential execution: Smart Gen → Post-Proc → Expert Analysis
    - Collect metrics for each step (duration, success/failure)
    - Emit WebSocket progress events at each step
    - _Requirements: 4.1, 4.7_

  - [x] 6.2 Implement retry logic with exponential backoff
    - Add retryWithBackoff() utility function
    - Implement exponential backoff (1s, 2s, 4s delays)
    - Classify errors as retryable vs non-retryable
    - Retry up to 2 times for retryable errors
    - Track retry count in metrics
    - _Requirements: 4.3, 4.4_

  - [x] 6.3 Implement fallback to old 7-step pipeline
    - Add fallbackToOldPipeline() method
    - Trigger fallback after all retries exhausted
    - Log fallback events with reason
    - Emit WebSocket fallback notification
    - Set fallbackUsed flag in response
    - _Requirements: 12.1, 12.5, 12.6_

  - [x] 6.4 Add graceful degradation for Post-Processor and Expert Analyzer
    - Continue with unprocessed text if Post-Processor fails
    - Return text without analysis if Expert Analyzer fails
    - Log all degradation events
    - Never return empty/null results
    - _Requirements: 12.2, 12.3, 12.4_

  - [ ]* 6.5 Write property test for total pipeline performance
    - **Property 22: Total Pipeline Performance**
    - **Validates: Requirements 4.1**
    - Test that complete pipeline executes in <25 seconds

  - [ ]* 6.6 Write unit tests for Pipeline Orchestrator
    - Test retry logic on retryable errors
    - Test no retry on non-retryable errors
    - Test fallback to old pipeline after retries exhausted
    - Test graceful degradation for step failures
    - Test WebSocket progress events emitted
    - Test metrics collection
    - _Requirements: 4.6, 4.7_

- [x] 7. Implement A/B Testing Infrastructure
  - [x] 7.1 Create A/B test manager with variant assignment
    - Create `server/lib/perfect-swedish-ab-test.ts` with ABTestManager class
    - Implement feature flag management (enable/disable new pipeline)
    - Add random variant assignment (50/50 split)
    - Implement session consistency (same variant per session)
    - Add manual override support (forceVariant parameter)
    - Cache assignments in Redis for fast lookup
    - _Requirements: 9.1, 9.2, 9.5, 9.6_

  - [x] 7.2 Implement metrics tracking per variant
    - Track success rate, generation time, user satisfaction per variant
    - Store metrics in pipeline_metrics table
    - Aggregate daily metrics per variant
    - Add regeneration rate tracking
    - _Requirements: 9.3, 9.4, 9.7_

  - [ ]* 7.3 Write property test for session consistency
    - **Property 60: Session Consistency**
    - **Validates: Requirements 9.6**
    - Test that same user session always gets same variant

  - [ ]* 7.4 Write unit tests for A/B Testing
    - Test variant assignment consistency within session
    - Test manual override respects forceVariant
    - Test feature flag disables new pipeline when off
    - Test metrics tracked separately per variant
    - _Requirements: 9.1, 9.5_

- [x] 8. Integrate pipeline with API routes
  - Update existing `/api/optimize` endpoint or create `/api/optimize-v2`
  - Integrate PerfectSwedishOrchestrator with routes
  - Add backward compatibility checks (same API interface)
  - Implement error handling and user-facing error messages
  - Add Sentry integration for error monitoring
  - Integrate with existing quota system
  - Test with existing frontend to ensure compatibility
  - _Requirements: 11.1, 11.2, 11.5_

- [x] 9. Checkpoint - Verify complete backend pipeline
  - Run end-to-end integration tests with real dispositions
  - Verify all three steps execute correctly
  - Test A/B variant assignment and consistency
  - Test fallback mechanism works correctly
  - Verify performance targets met (<25s total)
  - Test with 20+ different property types
  - Ask the user if questions arise

- [x] 10. Implement InlineHighlights frontend component
  - [x] 10.1 Create InlineHighlights component with text span rendering
    - Create `client/src/components/InlineHighlights.tsx`
    - Implement text parsing to identify feedback spans
    - Render visual markers on text with feedback
    - Support multiple overlapping highlights
    - _Requirements: 5.1, 5.6_

  - [x] 10.2 Add color coding and tooltip display
    - Implement severity-based color coding (red=critical, yellow=important, blue=suggestion)
    - Add hover tooltip with feedback details
    - Display category icon in tooltip
    - Add "Fix" button for actionable feedback
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 10.3 Implement real-time highlight updates
    - Update highlights when text is edited
    - Recalculate text span positions
    - Synchronize with feedback list
    - Update within 100ms of text change
    - _Requirements: 5.7_

  - [ ]* 10.4 Write unit tests for InlineHighlights
    - Test highlights render for all feedback items
    - Test correct color for each severity level
    - Test tooltip shows on hover
    - Test Fix button appears for actionable feedback

- [x] 11. Implement ExpertFeedbackPanel frontend component
  - [x] 11.1 Create ExpertFeedbackPanel with category grouping
    - Create `client/src/components/ExpertFeedbackPanel.tsx`
    - Group feedback items by category
    - Display category counts
    - Add category filtering
    - _Requirements: 6.1, 6.2_

  - [x] 11.2 Add navigation and action buttons
    - Implement click-to-scroll to text span
    - Highlight corresponding text on click
    - Add action buttons: "Fix automatically", "Get AI suggestion", "Dismiss"
    - Display severity level and expert attribution
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

  - [x] 11.3 Implement real-time panel updates
    - Update panel when feedback is resolved
    - Remove feedback items when applied or dismissed
    - Update counts in real-time
    - Animate changes smoothly
    - _Requirements: 6.7_

  - [ ]* 11.4 Write unit tests for ExpertFeedbackPanel
    - Test feedback grouped by category
    - Test correct count per category
    - Test onFeedbackClick called when item clicked
    - Test action buttons present for each item

- [x] 12. Implement OneClickFix functionality
  - [ ] 12.1 Create OneClickFix component with automatic fix application
    - Create `client/src/components/OneClickFix.tsx`
    - Implement automatic text replacement using autoFix
    - Apply fix to correct text span
    - Remove feedback item on success
    - Update inline highlights
    - _Requirements: 7.1, 7.3, 7.4_

  - [ ] 12.2 Add undo/redo support
    - Implement undo stack for applied fixes
    - Support Ctrl+Z (Cmd+Z) to undo
    - Restore previous text and feedback
    - _Requirements: 7.2_

  - [ ] 12.3 Add error handling and logging
    - Display error message if fix cannot be applied
    - Log all applied fixes for analytics
    - Handle text changes that invalidate fix
    - _Requirements: 7.5, 7.6_

  - [ ]* 12.4 Write unit tests for OneClickFix
    - Test automatic fix application
    - Test undo support restores previous text
    - Test feedback removal on success
    - Test error handling for unapplicable fixes

- [x] 13. Implement AIAssistedSelectionEdit functionality
  - [x] 13.1 Create AIAssistedSelectionEdit component with selection detection
    - Create `client/src/components/AIAssistedSelectionEdit.tsx`
    - Detect text selection in editor
    - Show "Improve with AI" button on selection
    - _Requirements: 8.1_

  - [x] 13.2 Implement AI suggestion generation
    - Send selected text + full context to backend API
    - Create backend endpoint `/api/selection-edit` for AI suggestions
    - Use GPT-5.2 with reasoning:low for 3-5s response time
    - Return 2-3 alternative suggestions
    - _Requirements: 8.2, 8.3, 8.4, 8.8_

  - [x] 13.3 Add suggestion preview and replacement
    - Display suggestions in popover with preview
    - Allow user to select suggestion
    - Replace selected text with chosen suggestion
    - Support undo functionality
    - _Requirements: 8.5, 8.6, 8.7_

  - [ ]* 13.4 Write unit tests for AIAssistedSelectionEdit
    - Test "Improve with AI" button appears on selection
    - Test API call sent with selected text and context
    - Test suggestions displayed in popover
    - Test text replacement on suggestion selection

- [x] 14. Integrate editing tools into ResultSection
  - Update `client/src/components/ResultSection.tsx` to include new components
  - Add InlineHighlights overlay on text fields
  - Add ExpertFeedbackPanel in sidebar or expandable section
  - Wire up OneClickFix and AIAssistedSelectionEdit
  - Add loading states during AI operations
  - Implement error handling and user notifications
  - Add animations and transitions for smooth UX
  - _Requirements: 5.1-5.7, 6.1-6.7, 7.1-7.6, 8.1-8.8_

- [x] 15. Checkpoint - Verify complete frontend integration
  - Test all editing tools work together
  - Verify real-time updates and synchronization
  - Test undo/redo functionality
  - Test with various feedback scenarios
  - Verify accessibility (keyboard navigation, screen readers)
  - Ask the user if questions arise

- [x] 16. Implement monitoring and alerting infrastructure
  - [x] 16.1 Set up Sentry integration for error monitoring
    - Configure Sentry for backend and frontend
    - Add error context (user_id, generation_id, pipeline_step)
    - Set up error grouping and filtering
    - _Requirements: 12.7_

  - [x] 16.2 Implement metrics collection and export
    - Track success rate, generation time, user satisfaction
    - Track regeneration rate and edit types
    - Export metrics to monitoring dashboard
    - Generate daily summary reports
    - _Requirements: 10.1-10.8_

  - [x] 16.3 Configure alerting thresholds
    - Alert if success rate drops below 95%
    - Alert if generation time exceeds 25 seconds
    - Alert if fallback rate exceeds 10%
    - Set up notification channels (email, Slack)
    - _Requirements: 10.1, 10.2_

- [x] 17. Write comprehensive integration tests
  - [ ]* 17.1 Write property test for success rate threshold
    - **Property 23: Success Rate Threshold**
    - **Validates: Requirements 4.2**
    - Test that 95+ out of 100 consecutive executions succeed

  - [ ]* 17.2 Write property tests for backward compatibility
    - **Property 70-76: Backward Compatibility**
    - **Validates: Requirements 11.1-11.7**
    - Test API interface compatibility
    - Test response structure compatibility
    - Test property type support
    - Test personal style respect
    - Test quota integration
    - Test WebSocket compatibility
    - Test PDF export compatibility

  - [x] 17.3 Write end-to-end integration tests
    - Test complete pipeline with real dispositions
    - Test A/B variant assignment and metrics tracking
    - Test fallback mechanism
    - Test editing tools workflow
    - Test error handling and recovery
    - _Requirements: 4.1-4.7, 9.1-9.7, 12.1-12.7_

- [x] 18. Perform load testing and performance optimization
  - Set up k6 load testing with realistic scenarios
  - Test with 10-20 concurrent users
  - Identify performance bottlenecks
  - Optimize slow operations (caching, query optimization)
  - Verify performance targets met under load
  - Document performance characteristics
  - _Requirements: 4.1_

- [x] 19. Create deployment and operations documentation
  - Write deployment guide for staging and production
  - Create runbook for common operations tasks
  - Document troubleshooting procedures
  - Write rollback plan for critical issues
  - Document monitoring and alerting setup
  - Create post-mortem template

- [ ] 20. Deploy to staging and run smoke tests
  - Deploy complete pipeline to staging environment
  - Run smoke tests with staging data
  - Verify monitoring and alerts work
  - Test with internal team members
  - Gather feedback and fix issues
  - Verify rollback procedure works

- [ ] 21. Gradual production rollout - Canary (10%)
  - Enable feature flag for 10% of users
  - Monitor success rate and performance closely
  - Collect user feedback
  - Analyze A/B test metrics (control vs treatment)
  - Fix any critical issues immediately
  - Verify rollback works if needed
  - _Requirements: 9.1-9.7, 10.1-10.8_

- [ ] 22. Gradual production rollout - Expanded (50%)
  - Increase to 50% of users
  - Continue monitoring metrics
  - Analyze comparative performance
  - Gather more user feedback
  - Optimize based on findings
  - _Requirements: 9.1-9.7, 10.1-10.8_

- [ ] 23. Full production rollout (100%)
  - Enable for all users
  - Monitor for 24 hours continuously
  - Analyze final metrics and compare to targets
  - Verify all success criteria met
  - Document lessons learned
  - Plan next iteration improvements
  - _Requirements: 1.1-1.7, 2.1-2.8, 3.1-3.9, 4.1-4.7, 5.1-5.7, 6.1-6.7, 7.1-7.6, 8.1-8.8, 9.1-9.7, 10.1-10.8, 11.1-11.7, 12.1-12.7_

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user feedback
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- The implementation follows a 5-week roadmap with gradual rollout
- A/B testing infrastructure allows safe comparison with old pipeline
- Fallback mechanism ensures reliability during rollout
- All editing tools support undo for user confidence
