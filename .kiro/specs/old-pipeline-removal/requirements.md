# Requirements Document: Old Pipeline Removal

## Introduction

OptiPrompt currently maintains two complete text generation pipelines running side-by-side. The OLD pipeline (routes.ts, lines 3200-6100, ~2900 lines) was built for GPT-3.5 limitations with extensive workarounds, multiple AI calls, and complex repair logic. The NEW pipeline (PerfectSwedishOrchestrator, ~300 lines) was built for GPT-5.2 with reasoning capabilities, using a clean 3-step architecture with a single AI call.

The OLD pipeline code remains in the codebase despite the NEW pipeline being active in production. This creates maintenance burden, confusion, higher costs, and unnecessary complexity. This feature removes ALL old pipeline code and migrates fully to the Perfect Swedish Pipeline.

## Glossary

- **OLD_Pipeline**: The 7-step pipeline in routes.ts (lines 3200-6100) built for GPT-3.5
- **NEW_Pipeline**: PerfectSwedishOrchestrator with 3-step architecture built for GPT-5.2
- **System**: OptiPrompt text generation system
- **Broker_Text**: Swedish real estate listing text (mäklartext)
- **Disposition**: Structured property data input
- **Post_Processor**: Component that applies deterministic transformations to generated text
- **Fallback_Template**: Deterministic template for emergency text generation
- **Repair_Function**: Function that fixes AI-generated text artifacts
- **Quality_Gate**: Validation checkpoint in the pipeline
- **A/B_Test**: Controlled experiment comparing OLD vs NEW pipeline performance
- **Migration**: Process of transitioning from OLD to NEW pipeline
- **Rollback**: Reverting to OLD pipeline if NEW pipeline fails

## Requirements

### Requirement 1: Verify NEW Pipeline Production Readiness

**User Story:** As a system operator, I want to verify that the NEW pipeline is production-ready, so that I can safely remove the OLD pipeline.

#### Acceptance Criteria

1. THE System SHALL verify that PerfectSwedishOrchestrator is currently active in production
2. THE System SHALL verify that all NEW pipeline components exist and are functional
3. THE System SHALL verify that NEW pipeline has monitoring and alerting configured
4. THE System SHALL verify that NEW pipeline has error handling and retry logic
5. THE System SHALL verify that NEW pipeline has graceful degradation for post-processing and analysis failures
6. THE System SHALL verify that NEW pipeline saves generation metrics to database
7. THE System SHALL verify that NEW pipeline integrates with WebSocket progress updates
8. THE System SHALL verify that NEW pipeline respects user plan limits and word count targets

### Requirement 2: Identify OLD Pipeline Functions to Preserve

**User Story:** As a developer, I want to identify which OLD pipeline functions are still needed, so that I don't lose critical functionality during removal.

#### Acceptance Criteria

1. THE System SHALL analyze all functions in OLD pipeline code (lines 3200-6100)
2. THE System SHALL identify functions called by NEW pipeline or other active code
3. THE System SHALL identify functions used in active tests
4. THE System SHALL categorize functions as: preserve, migrate, or remove
5. WHEN a function is categorized as "preserve", THE System SHALL document why it's needed
6. WHEN a function is categorized as "migrate", THE System SHALL specify where it should move
7. THE System SHALL verify that `buildDeterministicFallbackDescription` is still needed for emergency fallback
8. THE System SHALL verify that `finalizeMainMarketingText` is not used by NEW pipeline

### Requirement 3: Create Fallback Mechanism for NEW Pipeline

**User Story:** As a system operator, I want the NEW pipeline to have an emergency fallback, so that text generation never completely fails.

#### Acceptance Criteria

1. WHEN NEW pipeline fails after all retries, THE System SHALL attempt emergency fallback generation
2. THE Emergency_Fallback SHALL use `buildDeterministicFallbackDescription` to generate basic text
3. THE Emergency_Fallback SHALL log the failure with full context to Sentry
4. THE Emergency_Fallback SHALL mark the generation as "fallback" in database
5. THE Emergency_Fallback SHALL return valid Broker_Text that passes platform rules
6. THE Emergency_Fallback SHALL preserve user's style preference (factual/balanced/selling)
7. THE Emergency_Fallback SHALL respect platform-specific rules (Hemnet vs Booli)
8. IF Emergency_Fallback also fails, THEN THE System SHALL return user-friendly error message

### Requirement 4: Migrate Utility Functions to Appropriate Modules

**User Story:** As a developer, I want utility functions moved to appropriate modules, so that the codebase is organized and maintainable.

#### Acceptance Criteria

1. WHEN a function is used by multiple components, THE System SHALL move it to `server/lib/` directory
2. THE System SHALL move `buildDeterministicFallbackDescription` to `server/lib/perfect-swedish-fallback.ts`
3. THE System SHALL move `buildDispositionFromStructuredData` to `server/lib/disposition-builder.ts` if not already modular
4. THE System SHALL update all imports to reference new locations
5. THE System SHALL verify that all tests still pass after migration
6. THE System SHALL verify that TypeScript compilation succeeds after migration
7. THE System SHALL remove any functions that are only used by OLD pipeline
8. THE System SHALL document the purpose of each preserved function

### Requirement 5: Remove OLD Pipeline Code from routes.ts

**User Story:** As a developer, I want to remove all OLD pipeline code, so that the codebase is simpler and easier to maintain.

#### Acceptance Criteria

1. THE System SHALL remove lines 3200-6100 from routes.ts (OLD pipeline implementation)
2. THE System SHALL remove `finalizeMainMarketingText` function and all its calls
3. THE System SHALL remove all OLD pipeline repair functions not used elsewhere
4. THE System SHALL remove all OLD pipeline quality gates not used elsewhere
5. THE System SHALL remove all OLD pipeline retry logic not used elsewhere
6. THE System SHALL remove all OLD pipeline validation logic not used elsewhere
7. THE System SHALL remove all OLD pipeline observability code specific to 7-step architecture
8. THE System SHALL preserve the NEW pipeline code that is currently active

### Requirement 6: Update Tests to Remove OLD Pipeline Dependencies

**User Story:** As a developer, I want tests updated to remove OLD pipeline dependencies, so that the test suite remains valid after removal.

#### Acceptance Criteria

1. THE System SHALL identify all tests that import OLD pipeline functions
2. WHEN a test imports `finalizeMainMarketingText`, THE System SHALL remove or update the test
3. WHEN a test validates OLD pipeline behavior, THE System SHALL remove the test
4. WHEN a test validates shared utility functions, THE System SHALL update imports to new locations
5. THE System SHALL verify that `buildDeterministicFallbackDescription` tests remain valid
6. THE System SHALL verify that all regression tests still pass
7. THE System SHALL verify that all integration tests still pass
8. THE System SHALL add tests for NEW pipeline emergency fallback mechanism

### Requirement 7: Verify Production Deployment Safety

**User Story:** As a system operator, I want to verify deployment safety, so that removing OLD pipeline doesn't break production.

#### Acceptance Criteria

1. THE System SHALL verify that NEW pipeline is handling 100% of production traffic
2. THE System SHALL verify that no code paths still reference OLD pipeline functions
3. THE System SHALL verify that all environment variables are correctly configured
4. THE System SHALL verify that database schema supports NEW pipeline metrics
5. THE System SHALL verify that monitoring dashboards show NEW pipeline metrics
6. THE System SHALL verify that alerting rules cover NEW pipeline failures
7. THE System SHALL create deployment checklist for OLD pipeline removal
8. THE System SHALL document rollback procedure in case of issues

### Requirement 8: Measure Impact of OLD Pipeline Removal

**User Story:** As a product manager, I want to measure the impact of removal, so that I can verify the migration was successful.

#### Acceptance Criteria

1. THE System SHALL measure codebase size reduction (lines of code removed)
2. THE System SHALL measure routes.ts file size reduction
3. THE System SHALL measure test suite execution time before and after removal
4. THE System SHALL measure TypeScript compilation time before and after removal
5. THE System SHALL measure average generation cost per text (AI API calls)
6. THE System SHALL measure average generation time per text
7. THE System SHALL measure generation success rate before and after removal
8. THE System SHALL measure emergency fallback usage rate

### Requirement 9: Document Migration and Architecture Changes

**User Story:** As a developer, I want comprehensive documentation, so that I understand the new architecture and can maintain it.

#### Acceptance Criteria

1. THE System SHALL document the NEW pipeline architecture in detail
2. THE System SHALL document the emergency fallback mechanism
3. THE System SHALL document which OLD pipeline functions were preserved and why
4. THE System SHALL document which OLD pipeline functions were removed and why
5. THE System SHALL update architecture diagrams to show only NEW pipeline
6. THE System SHALL document the migration process and timeline
7. THE System SHALL document lessons learned from maintaining two pipelines
8. THE System SHALL create troubleshooting guide for NEW pipeline issues

### Requirement 10: Implement Gradual Rollout Strategy

**User Story:** As a system operator, I want a gradual rollout strategy, so that I can safely remove OLD pipeline code without risk.

#### Acceptance Criteria

1. THE System SHALL implement feature flag for OLD pipeline code removal
2. WHEN feature flag is disabled, THE System SHALL keep OLD pipeline code (no-op state)
3. WHEN feature flag is enabled, THE System SHALL use only NEW pipeline
4. THE System SHALL monitor error rates during rollout
5. THE System SHALL monitor generation success rates during rollout
6. THE System SHALL monitor emergency fallback usage during rollout
7. IF error rate increases by >5%, THEN THE System SHALL automatically disable feature flag
8. THE System SHALL log all rollout state changes to Sentry with full context

### Requirement 11: Verify Platform-Specific Rules Preservation

**User Story:** As a compliance officer, I want to verify that platform rules are preserved, so that generated texts remain compliant with Hemnet and Booli requirements.

#### Acceptance Criteria

1. THE System SHALL verify that Hemnet price/fee/energiklass restrictions are enforced
2. THE System SHALL verify that Booli allows price/fee/energiklass mentions
3. THE System SHALL verify that headline rules are enforced (max 9 words, no punctuation)
4. THE System SHALL verify that showing invitation contains "visning" keyword
5. THE System SHALL verify that Instagram caption has max 2 emojis
6. THE System SHALL verify that forbidden phrases are removed from all fields
7. THE System SHALL verify that paragraph breaks are enforced in main text
8. THE System SHALL run platform compliance tests for both Hemnet and Booli

### Requirement 12: Implement Comprehensive Monitoring

**User Story:** As a system operator, I want comprehensive monitoring, so that I can detect issues immediately after OLD pipeline removal.

#### Acceptance Criteria

1. THE System SHALL monitor NEW pipeline success rate (target: >=95%)
2. THE System SHALL monitor NEW pipeline average duration (target: <10 seconds)
3. THE System SHALL monitor emergency fallback usage rate (target: <1%)
4. THE System SHALL monitor generation cost per text (target: <50% of OLD pipeline)
5. THE System SHALL alert when success rate drops below 90%
6. THE System SHALL alert when average duration exceeds 15 seconds
7. THE System SHALL alert when emergency fallback rate exceeds 5%
8. THE System SHALL create dashboard showing OLD vs NEW pipeline metrics comparison

## Special Requirements Guidance

### Parser and Serializer Requirements

This feature does not involve parsers or serializers, so round-trip testing is not applicable.

### Critical Quality Requirements

1. **Grammatical Correctness**: All generated Swedish text MUST be grammatically perfect
2. **Platform Compliance**: All texts MUST comply with Hemnet/Booli rules
3. **Broker Authenticity**: All texts MUST sound like authentic broker language, not AI
4. **Zero Downtime**: Migration MUST NOT cause any production downtime
5. **Rollback Safety**: System MUST be able to rollback instantly if issues occur

### Migration Risk Mitigation

1. **Gradual Rollout**: Use feature flags to enable removal gradually
2. **Comprehensive Testing**: Run full test suite before and after removal
3. **Monitoring**: Monitor all metrics closely during and after removal
4. **Emergency Fallback**: Ensure fallback mechanism works before removing OLD pipeline
5. **Documentation**: Document everything for future maintenance

## Acceptance Criteria Quality Standards

All acceptance criteria in this document follow EARS patterns and INCOSE quality rules:
- Active voice with clear system responsibilities
- No vague terms or escape clauses
- Measurable and verifiable conditions
- One testable requirement per criterion
- Positive statements (what system SHALL do)
- Consistent terminology from Glossary
