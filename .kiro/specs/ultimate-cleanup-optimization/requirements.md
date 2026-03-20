# Requirements Document: Ultimate Cleanup & Optimization

## Introduktion

Detta dokument specificerar kraven för en omfattande cleanup och optimering av OptiPrompt-systemet. Projektet tar bort det gamla 7-stegs pipelinen helt, eliminerar A/B-test infrastrukturen, och gör den nya 3-stegs pipelinen till standard. Målet är ett enklare, snabbare och mer underhållbart system med garanterad prestanda <20s och 98%+ success rate.

Systemet har blivit komplext med både gamla och nya pipelines körande samtidigt, vilket skapar förvirring och prestandaproblem. Genom att ta bort allt som inte används och optimera kvarvarande kod får vi ett system som är lätt att förstå, underhålla och vidareutveckla.

## Ordlista

- **Pipeline**: Den AI-drivna processen som genererar mäklartexter
- **Perfect_Swedish_Orchestrator**: Huvudorkestrering för 3-stegs pipelinen
- **Smart_Generator**: Komponent som genererar text och aux-fält i ett anrop
- **Post_Processor**: Komponent för deterministisk textbearbetning
- **Expert_Analyzer**: Komponent för AI-driven kvalitetsanalys
- **Listing_Orchestrator**: Gammal 7-stegs pipeline (ska tas bort)
- **AB_Test_Manager**: A/B-test infrastruktur (ska tas bort)
- **Aux_Fields**: Hjälpfält (headline, socialCopy, instagramCaption, showingInvitation, shortAd)
- **Token_Budget**: Max antal tokens för AI-generering
- **Validation_Rules**: Regler för att validera genererad text
- **Forbidden_Phrases**: Lista över förbjudna AI-klyschor
- **Disposition**: Indata med property-information
- **Writing_Style**: Skrivstil (factual, balanced, selling)
- **Broker_Realism**: Hur autentisk texten låter för en mäklare
- **Minimal_Fields**: Läge där färre aux-fält genereras (ska minimeras)

## Krav

### Requirement 1: Borttagning av Gamla Pipeline-komponenter

**User Story:** Som systemutvecklare vill jag ta bort alla gamla pipeline-komponenter, så att systemet blir enklare och lättare att underhålla.

#### Acceptance Criteria

1. THE System SHALL remove all old 7-step pipeline files from server/lib/
2. THE System SHALL remove listing-orchestrator.ts completely
3. THE System SHALL remove listing-agent-iteration.ts completely
4. THE System SHALL remove listing-loop-coordinator.ts completely
5. THE System SHALL remove listing-decision-engine.ts completely
6. THE System SHALL remove listing-quality-guards.ts completely
7. THE System SHALL remove listing-refinement-coordinator.ts completely
8. THE System SHALL remove listing-final-audit-subflow.ts completely
9. THE System SHALL remove listing-broker-realism-scorecard.ts completely
10. THE System SHALL remove listing-pipeline-observability.ts completely

### Requirement 2: Borttagning av A/B-Test Infrastruktur

**User Story:** Som systemutvecklare vill jag ta bort A/B-test infrastrukturen, så att systemet bara kör den nya pipelinen.

#### Acceptance Criteria

1. THE System SHALL remove perfect-swedish-ab-test.ts completely
2. THE System SHALL remove all A/B test logic from routes.ts
3. THE System SHALL remove forceVariant parameter from PipelineRequest interface
4. THE System SHALL remove variant field from PipelineResult interface
5. THE System SHALL remove fallbackUsed field from PipelineResult interface
6. WHEN executing pipeline THEN THE System SHALL always use Perfect_Swedish_Orchestrator
7. THE System SHALL remove all references to old Listing_Orchestrator

### Requirement 3: Database Schema Förenkling

**User Story:** Som systemadministratör vill jag förenkla databas-schemat, så att oanvända tabeller tas bort.

#### Acceptance Criteria

1. THE System SHALL drop table ab_test_assignments
2. THE System SHALL drop table pipeline_metrics_v2
3. THE System SHALL drop table user_feedback
4. THE System SHALL drop table expert_feedback_items
5. THE System SHALL drop table experiment_assignments
6. THE System SHALL drop table experiment_results
7. THE System SHALL remove variant column from pipeline_generations table
8. THE System SHALL remove fallback_used column from pipeline_generations table
9. WHEN dropping tables THEN THE System SHALL create backup tables first
10. THE System SHALL maintain data integrity for remaining tables

### Requirement 4: Token Budget Optimering

**User Story:** Som systemutvecklare vill jag optimera token budget, så att fler aux-fält genereras och färre trunkerings-fel uppstår.

#### Acceptance Criteria

1. WHEN calculating token budget THEN THE System SHALL use minimum 5500 tokens
2. WHEN calculating token budget THEN THE System SHALL use maximum 8000 tokens
3. WHEN targetWordMax is 250 THEN THE Token_Budget SHALL be at least 5500
4. WHEN targetWordMax is 800 THEN THE Token_Budget SHALL be at most 8000
5. THE System SHALL compute token budget as targetWordMax * 2.4 + 1200
6. WHEN token budget exceeds 8000 THEN THE System SHALL cap at 8000
7. WHEN token budget is below 5500 THEN THE System SHALL set to 5500

### Requirement 5: MinimalFields Threshold Optimering

**User Story:** Som systemutvecklare vill jag höja minimalFields threshold, så att fler aux-fält genereras även för längre texter.

#### Acceptance Criteria

1. WHEN total prompt size exceeds 30000 characters THEN THE System SHALL use minimal fields mode
2. WHEN total prompt size is 30000 or less THEN THE System SHALL generate all aux fields
3. THE System SHALL calculate total prompt size as systemPrompt length plus userPrompt length
4. WHEN using minimal fields mode THEN THE System SHALL still generate all required fields
5. THE System SHALL prioritize complete aux field generation over minimal mode

### Requirement 6: Validation Rules Optimering

**User Story:** Som systemutvecklare vill jag optimera validation rules, så att legitim mäklarprosa inte blockeras.

#### Acceptance Criteria

1. WHEN text contains "det finns" more than 3 times AND word count is less than 300 THEN THE System SHALL flag violation
2. WHEN text contains "den har" more than 4 times AND word count is less than 300 THEN THE System SHALL flag violation
3. WHEN text contains "ligger [distance]" more than 3 times THEN THE System SHALL flag violation
4. WHEN text contains "vilket" more than 3 times THEN THE System SHALL flag violation
5. WHEN checking monotone sentence starts THEN THE System SHALL require 5 occurrences before flagging
6. WHEN checking monotone sentence starts THEN THE System SHALL require at least 10 sentences total
7. THE System SHALL exempt words "brf", "avgift", "bostaden", "lägenheten", "köket", "badrummet" from monotone checks
8. WHEN word count is 300 or more THEN THE System SHALL use higher thresholds for repetition checks

### Requirement 7: Forbidden Phrases Reducering

**User Story:** Som systemutvecklare vill jag reducera listan över förbjudna fraser, så att bara verkliga AI-klyschor blockeras.

#### Acceptance Criteria

1. THE System SHALL remove "kommunikationer" from forbidden phrases list
2. THE System SHALL remove "närhet till service" from forbidden phrases list
3. THE System SHALL remove "smidig pendling" from forbidden phrases list
4. THE System SHALL remove "i mycket gott skick" from forbidden phrases list
5. THE System SHALL remove "gott om utrymme" from forbidden phrases list
6. THE System SHALL remove "ligger centralt i" from forbidden phrases list
7. THE System SHALL remove "natur och stadsliv" from forbidden phrases list
8. THE System SHALL remove "det finns även" from forbidden phrases list
9. THE System SHALL remove "det finns också" from forbidden phrases list
10. THE System SHALL keep "välkommen till" in forbidden phrases list
11. THE System SHALL keep "erbjuder" in forbidden phrases list
12. THE System SHALL keep "bjuder på" in forbidden phrases list
13. THE System SHALL keep "präglas av" in forbidden phrases list
14. THE System SHALL keep "för den som" in forbidden phrases list
15. THE System SHALL keep "vilket gör" in forbidden phrases list
16. THE System SHALL keep "skapar en känsla av" in forbidden phrases list
17. THE System SHALL keep "i hjärtat av" in forbidden phrases list
18. THE System SHALL keep "missa inte" in forbidden phrases list
19. THE System SHALL maintain approximately 20 forbidden phrases total

### Requirement 8: Restaurangnamn-validering

**User Story:** Som användare vill jag att systemet validerar restaurangnamn, så att inga påhittade restauranger nämns i texten.

#### Acceptance Criteria

1. WHEN text contains restaurant pattern "restaurang [Name]" THEN THE Post_Processor SHALL validate against disposition
2. WHEN text contains café pattern "café [Name]" THEN THE Post_Processor SHALL validate against disposition
3. WHEN text contains fik pattern "fik [Name]" THEN THE Post_Processor SHALL validate against disposition
4. WHEN restaurant name is not verified in disposition THEN THE Post_Processor SHALL replace with generic "restauranger"
5. WHEN restaurant name is verified in disposition THEN THE Post_Processor SHALL keep the specific name
6. THE Post_Processor SHALL log all restaurant name transformations
7. THE Post_Processor SHALL use regex pattern /\b(restaurang|café|fik)\s+([A-ZÅÄÖ][a-zåäö]+)/gi

### Requirement 9: Narrativ Integritet

**User Story:** Som användare vill jag att texten har narrativ integritet, så att inga meningar eller punkter saknas.

#### Acceptance Criteria

1. WHEN text has incomplete sentences THEN THE Post_Processor SHALL fix narrative integrity
2. WHEN text has missing bullet points THEN THE Post_Processor SHALL complete the narrative
3. WHEN text has abrupt endings THEN THE Post_Processor SHALL ensure proper conclusion
4. THE Post_Processor SHALL detect incomplete narratives using pattern matching
5. THE Post_Processor SHALL log all narrative integrity fixes
6. WHEN narrative cannot be fixed THEN THE Post_Processor SHALL log warning but continue

### Requirement 10: Saknade Fakta

**User Story:** Som användare vill jag att viktiga fakta inkluderas, så att texten är komplett och informativ.

#### Acceptance Criteria

1. WHEN disposition contains energiklass AND text lacks energiklass THEN THE Post_Processor SHALL add it
2. WHEN disposition contains värmesystem AND text lacks värmesystem THEN THE Post_Processor SHALL add it
3. WHEN disposition contains important facts AND text lacks them THEN THE Post_Processor SHALL add them
4. THE Post_Processor SHALL detect missing facts by comparing text with disposition
5. THE Post_Processor SHALL add missing facts in natural language
6. THE Post_Processor SHALL log all added facts
7. WHEN facts cannot be added naturally THEN THE Post_Processor SHALL skip and log warning

### Requirement 11: Pipeline Execution Performance

**User Story:** Som användare vill jag att textgenerering är snabb, så att jag får resultat inom 20 sekunder.

#### Acceptance Criteria

1. WHEN executing pipeline THEN THE System SHALL complete in less than 20 seconds for 95% of requests
2. WHEN measuring duration THEN THE System SHALL track total pipeline duration
3. WHEN measuring duration THEN THE System SHALL track step 1 duration separately
4. WHEN measuring duration THEN THE System SHALL track step 2 duration separately
5. WHEN measuring duration THEN THE System SHALL track step 3 duration separately
6. THE System SHALL emit progress events via WebSocket for each step
7. WHEN step 1 completes THEN THE System SHALL emit progress event with 33% completion
8. WHEN step 2 completes THEN THE System SHALL emit progress event with 66% completion
9. WHEN step 3 completes THEN THE System SHALL emit progress event with 100% completion

### Requirement 12: Pipeline Success Rate

**User Story:** Som användare vill jag att textgenerering lyckas konsekvent, så att jag sällan får fel.

#### Acceptance Criteria

1. THE System SHALL achieve 98% or higher success rate
2. WHEN pipeline fails THEN THE System SHALL retry up to 2 times
3. WHEN retrying THEN THE System SHALL use exponential backoff with factor 2
4. WHEN retrying THEN THE System SHALL use minimum timeout 1000ms
5. WHEN retrying THEN THE System SHALL use maximum timeout 4000ms
6. WHEN error is not retryable THEN THE System SHALL fail immediately without retry
7. THE System SHALL log retry count in metrics
8. THE System SHALL track success rate per user plan

### Requirement 13: Komplett Aux-fält Generering

**User Story:** Som användare vill jag att alla hjälpfält genereras, så att jag får komplett innehåll för alla kanaler.

#### Acceptance Criteria

1. WHEN generating text THEN THE Smart_Generator SHALL generate improvedPrompt field
2. WHEN generating text THEN THE Smart_Generator SHALL generate headline field
3. WHEN generating text THEN THE Smart_Generator SHALL generate socialCopy field
4. WHEN generating text THEN THE Smart_Generator SHALL generate instagramCaption field
5. WHEN generating text THEN THE Smart_Generator SHALL generate showingInvitation field
6. WHEN generating text THEN THE Smart_Generator SHALL generate shortAd field
7. WHEN any field is missing THEN THE Smart_Generator SHALL throw error
8. THE System SHALL achieve 100% aux fields coverage
9. WHEN using minimal fields mode THEN THE System SHALL still generate all 6 fields

### Requirement 14: Graceful Degradation

**User Story:** Som användare vill jag att systemet fungerar även om vissa komponenter misslyckas, så att jag åtminstone får grundläggande resultat.

#### Acceptance Criteria

1. WHEN Post_Processor fails THEN THE System SHALL continue with unprocessed text
2. WHEN Post_Processor fails THEN THE System SHALL log warning to Sentry
3. WHEN Expert_Analyzer fails THEN THE System SHALL continue without analysis
4. WHEN Expert_Analyzer fails THEN THE System SHALL log warning to Sentry
5. WHEN Smart_Generator fails THEN THE System SHALL retry according to retry policy
6. WHEN all retries fail THEN THE System SHALL throw error to client
7. THE System SHALL never fallback to old Listing_Orchestrator
8. WHEN graceful degradation occurs THEN THE System SHALL mark it in metrics

### Requirement 15: Error Handling och Logging

**User Story:** Som systemutvecklare vill jag ha tydlig error handling, så att jag kan debugga problem effektivt.

#### Acceptance Criteria

1. WHEN OpenAI API times out THEN THE System SHALL log to Sentry with context
2. WHEN generation is incomplete THEN THE System SHALL throw descriptive error
3. WHEN post-processing fails THEN THE System SHALL log warning with details
4. WHEN expert analysis fails THEN THE System SHALL log warning with details
5. THE System SHALL capture all errors in Sentry
6. THE System SHALL include request context in error logs
7. THE System SHALL anonymize addresses in logs for privacy
8. WHEN logging disposition THEN THE System SHALL redact personal information

### Requirement 16: Metrics och Monitoring

**User Story:** Som systemadministratör vill jag ha omfattande metrics, så att jag kan övervaka systemhälsa.

#### Acceptance Criteria

1. WHEN pipeline completes THEN THE System SHALL save metrics to database
2. THE System SHALL track total duration in metrics
3. THE System SHALL track step durations in metrics
4. THE System SHALL track retry count in metrics
5. THE System SHALL track success status in metrics
6. THE System SHALL track error type in metrics
7. THE System SHALL emit Sentry metrics for pipeline duration
8. THE System SHALL emit Sentry metrics for success count
9. THE System SHALL emit Sentry metrics for failure count
10. THE System SHALL tag metrics with user plan and style

### Requirement 17: WebSocket Progress Events

**User Story:** Som användare vill jag se progress i realtid, så att jag vet att systemet arbetar.

#### Acceptance Criteria

1. WHEN pipeline starts THEN THE System SHALL emit progress event for smart_generation step
2. WHEN smart generation completes THEN THE System SHALL emit 100% progress for that step
3. WHEN post-processing starts THEN THE System SHALL emit progress event for post_processing step
4. WHEN post-processing completes THEN THE System SHALL emit 100% progress for that step
5. WHEN expert analysis starts THEN THE System SHALL emit progress event for expert_analysis step
6. WHEN expert analysis completes THEN THE System SHALL emit 100% progress for that step
7. WHEN pipeline completes THEN THE System SHALL emit completion event
8. THE System SHALL include timestamp in all progress events
9. THE System SHALL include session ID in all progress events

### Requirement 18: Input Validation

**User Story:** Som systemutvecklare vill jag validera all input, så att systemet är säkert och robust.

#### Acceptance Criteria

1. WHEN receiving request THEN THE System SHALL validate disposition with Zod schema
2. WHEN receiving request THEN THE System SHALL validate style is one of factual, balanced, selling
3. WHEN receiving request THEN THE System SHALL validate platform is one of hemnet, booli, egen
4. WHEN receiving request THEN THE System SHALL validate targetWordMin is between 150 and 600
5. WHEN receiving request THEN THE System SHALL validate targetWordMax is between 250 and 800
6. WHEN receiving request THEN THE System SHALL validate userId exists in database
7. WHEN receiving request THEN THE System SHALL validate sessionId is non-empty
8. WHEN validation fails THEN THE System SHALL return 400 error with descriptive message
9. THE System SHALL sanitize all user inputs before processing

### Requirement 19: Output Sanitization

**User Story:** Som systemutvecklare vill jag sanitera all output, så att ingen skadlig kod kan injiceras.

#### Acceptance Criteria

1. WHEN saving generated text THEN THE System SHALL sanitize HTML
2. WHEN saving generated text THEN THE System SHALL remove JavaScript
3. WHEN saving generated text THEN THE System SHALL validate UTF-8 encoding
4. THE System SHALL log all outputs for audit trail
5. WHEN output contains invalid characters THEN THE System SHALL clean them
6. THE System SHALL preserve legitimate Swedish characters (å, ä, ö)

### Requirement 20: Documentation Cleanup

**User Story:** Som systemutvecklare vill jag ta bort obsolet dokumentation, så att bara relevant dokumentation finns kvar.

#### Acceptance Criteria

1. THE System SHALL remove ACTION_PLAN.md
2. THE System SHALL remove AI_FIRST_REDESIGN.md
3. THE System SHALL remove DEEP_THINKING_PROMPT_STRATEGY.md
4. THE System SHALL remove FINAL_COMPLETE_FIX.md
5. THE System SHALL remove FINAL_DEEP_ANALYSIS.md
6. THE System SHALL remove FINAL_FIX_COMPLETE.md
7. THE System SHALL remove FINAL_IMPLEMENTATION_PLAN.md
8. THE System SHALL remove FULLSTÄNDIG_ANALYS.md
9. THE System SHALL remove OPTIMIZATION_COMPLETE.md
10. THE System SHALL remove OPTIMIZATION_STATUS.md
11. THE System SHALL remove PIPELINE_OPTIMIZATION_PLAN.md
12. THE System SHALL remove PRODUCTION_ANALYSIS.md
13. THE System SHALL remove REAL_SOLUTION.md
14. THE System SHALL keep DEPLOYMENT_GUIDE.md
15. THE System SHALL keep OPERATIONS_RUNBOOK.md
16. THE System SHALL keep TROUBLESHOOTING_GUIDE.md
17. THE System SHALL keep ROLLBACK_PLAN.md
18. THE System SHALL keep MONITORING_SETUP.md
19. THE System SHALL keep LOAD_TESTING_QUICK_START.md
20. THE System SHALL keep PERFORMANCE_CHARACTERISTICS.md

### Requirement 21: Frontend Compatibility

**User Story:** Som användare vill jag att frontend fortsätter fungera, så att jag inte märker några breaking changes.

#### Acceptance Criteria

1. THE System SHALL maintain API compatibility with existing frontend
2. THE System SHALL keep InlineHighlights component unchanged
3. THE System SHALL keep ExpertFeedbackPanel component unchanged
4. THE System SHALL keep use-one-click-fix hook unchanged
5. WHEN API response changes THEN THE System SHALL maintain backward compatibility
6. THE System SHALL remove EditingToolsExample.tsx as it is example code only
7. THE System SHALL not require any frontend code changes for deployment

### Requirement 22: Test Coverage

**User Story:** Som systemutvecklare vill jag ha god test coverage, så att jag kan vara säker på att systemet fungerar.

#### Acceptance Criteria

1. THE System SHALL have unit tests for Smart_Generator
2. THE System SHALL have unit tests for Post_Processor
3. THE System SHALL have unit tests for Expert_Analyzer
4. THE System SHALL have unit tests for validation functions
5. THE System SHALL have unit tests for token budget calculation
6. THE System SHALL have integration tests for complete pipeline execution
7. THE System SHALL have integration tests for retry logic
8. THE System SHALL have integration tests for graceful degradation
9. THE System SHALL have regression tests for old pipeline removal
10. THE System SHALL have regression tests for aux fields generation
11. THE System SHALL achieve 80% or higher code coverage

### Requirement 23: Performance Benchmarking

**User Story:** Som systemadministratör vill jag kunna benchmarka prestanda, så att jag kan verifiera förbättringar.

#### Acceptance Criteria

1. THE System SHALL support load testing with k6
2. WHEN running load test THEN THE System SHALL measure p50 latency
3. WHEN running load test THEN THE System SHALL measure p95 latency
4. WHEN running load test THEN THE System SHALL measure p99 latency
5. WHEN running load test THEN THE System SHALL measure success rate
6. WHEN running load test THEN THE System SHALL measure throughput
7. THE System SHALL provide performance profiling tools
8. THE System SHALL provide result analysis tools

### Requirement 24: Deployment Safety

**User Story:** Som systemadministratör vill jag ha säker deployment, så att jag kan rulla tillbaka vid problem.

#### Acceptance Criteria

1. WHEN deploying THEN THE System SHALL create database backup first
2. WHEN deploying THEN THE System SHALL test migration on staging first
3. WHEN deploying THEN THE System SHALL keep backup tables for 30 days
4. WHEN deploying THEN THE System SHALL have rollback plan ready
5. WHEN deploying THEN THE System SHALL monitor metrics for 2 hours
6. WHEN success rate drops below 95% THEN THE System SHALL trigger rollback alert
7. WHEN p95 latency exceeds 25s THEN THE System SHALL trigger rollback alert
8. THE System SHALL support git-based rollback

### Requirement 25: Cost Monitoring

**User Story:** Som systemadministratör vill jag övervaka OpenAI costs, så att jag kan kontrollera utgifter.

#### Acceptance Criteria

1. WHEN making OpenAI API call THEN THE System SHALL track token usage
2. WHEN making OpenAI API call THEN THE System SHALL calculate cost
3. THE System SHALL save cost data to database
4. THE System SHALL tag costs with user ID and model
5. THE System SHALL provide cost reports per user
6. THE System SHALL provide cost reports per model
7. WHEN costs increase by more than 20% THEN THE System SHALL send alert
8. THE System SHALL set budget alerts in OpenAI dashboard
