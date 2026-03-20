# Implementation Plan: Ultimate Cleanup & Optimization

## Översikt

Detta är en omfattande cleanup och optimering av OptiPrompt-systemet. Projektet tar bort det gamla 7-stegs pipelinen helt, eliminerar A/B-test infrastrukturen, och gör den nya 3-stegs pipelinen till standard. Målet är ett enklare, snabbare och mer underhållbart system med garanterad prestanda <20s och 98%+ success rate.

Implementation följer 6 faser: Preparation, Backend Cleanup, Database Migration, Documentation Cleanup, Testing & Validation, och Deployment.

## Tasks

### Fas 1: Preparation (1 dag)

- [ ] 1. Skapa säkerhetskopior och dokumentera nuvarande system
  - Skapa full backup av databas med `pg_dump`
  - Tagga nuvarande version i git: `v1.0-pre-cleanup`
  - Dokumentera alla aktiva feature flags i CLEANUP_PREPARATION.md
  - Exportera A/B-test metrics från databas för analys
  - Kör full testsvit och verifiera att alla tester passerar
  - _Requirements: 24.1, 24.2, 24.3_

### Fas 2: Backend Cleanup (2 dagar)

- [x] 2. Ta bort gamla pipeline-komponenter
  - [x] 2.1 Ta bort gamla 7-stegs pipeline-filer
    - Ta bort `server/lib/listing-orchestrator.ts`
    - Ta bort `server/lib/listing-agent-iteration.ts`
    - Ta bort `server/lib/listing-loop-coordinator.ts`
    - Ta bort `server/lib/listing-decision-engine.ts`
    - Ta bort `server/lib/listing-quality-guards.ts`
    - Ta bort `server/lib/listing-refinement-coordinator.ts`
    - Ta bort `server/lib/listing-final-audit-subflow.ts`
    - Ta bort `server/lib/listing-broker-realism-scorecard.ts`
    - Ta bort `server/lib/listing-pipeline-observability.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_
  
  - [x] 2.2 Ta bort A/B-test infrastruktur
    - Ta bort `server/lib/perfect-swedish-ab-test.ts`
    - Ta bort alla A/B test imports från `server/routes.ts`
    - Ta bort `forceVariant` parameter från PipelineRequest interface
    - Ta bort `variant` och `fallbackUsed` fields från PipelineResult interface
    - Ta bort alla referenser till gamla Listing_Orchestrator i routes.ts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 2.3 Ta bort gamla tester
    - Ta bort `server/tests/listing-orchestrator.test.ts`
    - Ta bort `server/tests/listing-decision-engine.test.ts`
    - Uppdatera `server/tests/forbidden-phrases-integration.test.ts` för nya regler
    - _Requirements: 1.1, 2.1_
  
  - [x] 2.4 Ta bort frontend exempel-komponenter
    - Ta bort `client/src/components/EditingToolsExample.tsx`
    - _Requirements: 21.6_

- [x] 3. Optimera token budget och thresholds
  - [x] 3.1 Höj token budget i routes.ts
    - Ändra minimum token budget från 4800 till 5500
    - Ändra maximum token budget från 7000 till 8000
    - Uppdatera formel: `targetWordMax * 2.4 + 1200`
    - Verifiera att budget clampar korrekt mellan 5500-8000
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 3.2 Höj minimalFields threshold i routes.ts
    - Ändra threshold från 26000 till 30000 characters
    - Verifiera att alla aux-fält genereras även för längre texter
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Optimera validation rules
  - [x] 4.1 Uppdatera text-validation.ts med context-aware gränser
    - Höj "det finns" gräns från 2 till 3 (med wordCount < 300 check)
    - Höj "den har" gräns från 3 till 4 (med wordCount < 300 check)
    - Höj "ligger [distance]" gräns från 2 till 3
    - Höj "vilket" gräns från 2 till 3
    - Höj monoton meningsstart gräns från 4 till 5 occurrences
    - Höj minimum sentences från 8 till 10 för monoton check
    - Lägg till exempt words: "brf", "avgift", "bostaden", "lägenheten", "köket", "badrummet"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [x] 4.2 Reducera forbidden phrases i text-rules.ts
    - Ta bort "kommunikationer" från forbidden phrases
    - Ta bort "närhet till service" från forbidden phrases
    - Ta bort "smidig pendling" från forbidden phrases
    - Ta bort "i mycket gott skick" från forbidden phrases
    - Ta bort "gott om utrymme" från forbidden phrases
    - Ta bort "ligger centralt i" från forbidden phrases
    - Ta bort "natur och stadsliv" från forbidden phrases
    - Ta bort "det finns även" från forbidden phrases
    - Ta bort "det finns också" från forbidden phrases
    - Behåll ~20 rena AI-klyschor (välkommen till, erbjuder, bjuder på, etc.)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10-7.19_

- [ ] 5. Förbättra post-processor
  - [x] 5.1 Implementera restaurangnamn-validering i perfect-swedish-post-processor.ts
    - Lägg till regex pattern `/\b(restaurang|café|fik)\s+([A-ZÅÄÖ][a-zåäö]+)/gi`
    - Validera restaurangnamn mot disposition data
    - Ersätt overifierade namn med generisk "restauranger"
    - Logga alla transformationer
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [ ] 5.2 Implementera narrativ integritet check i perfect-swedish-post-processor.ts
    - Detektera ofullständiga meningar med pattern matching
    - Detektera saknade bullet points
    - Detektera abrupta endings
    - Fixa narrativ integritet där möjligt
    - Logga alla fixes
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 5.3 Implementera saknade fakta detection i perfect-swedish-post-processor.ts
    - Detektera saknad energiklass i text
    - Detektera saknat värmesystem i text
    - Lägg till saknade fakta från disposition i naturlig språk
    - Logga alla tillagda fakta
    - Graceful degradation om fakta inte kan läggas till
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 6. Uppdatera orchestrator
  - [ ] 6.1 Förenkla perfect-swedish-orchestrator.ts
    - Ta bort `fallbackToOldPipeline()` method
    - Ta bort `forceVariant` parameter från PipelineRequest
    - Ta bort `variant` tracking från PipelineResult
    - Ta bort `fallbackUsed` flag från PipelineResult
    - Förbättra error messages för tydligare debugging
    - _Requirements: 2.3, 2.4, 2.5, 2.7, 14.7_
  
  - [ ] 6.2 Förbättra error handling i orchestrator
    - Implementera graceful degradation för Post_Processor failures
    - Implementera graceful degradation för Expert_Analyzer failures
    - Logga warnings till Sentry med context
    - Markera graceful degradation i metrics
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.8, 15.3, 15.4_

- [ ] 7. Checkpoint - Verifiera backend cleanup
  - Kör alla tester och verifiera att de passerar
  - Verifiera att inga imports till borttagna filer finns kvar
  - Verifiera att token budget är 5500-8000
  - Verifiera att minimalFields threshold är 30000
  - Verifiera att validation rules är uppdaterade
  - Fråga användaren om allt ser bra ut innan migration

### Fas 3: Database Migration (1 dag)

- [ ] 8. Skapa och testa database migration
  - [ ] 8.1 Skapa migration script för schema cleanup
    - Skapa backup-tabeller för alla tabeller som ska tas bort
    - DROP TABLE `ab_test_assignments`
    - DROP TABLE `pipeline_metrics_v2`
    - DROP TABLE `user_feedback`
    - DROP TABLE `expert_feedback_items`
    - DROP TABLE `experiment_assignments`
    - DROP TABLE `experiment_results`
    - ALTER TABLE `pipeline_generations` DROP COLUMN `variant`
    - ALTER TABLE `pipeline_generations` DROP COLUMN `fallback_used`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
  
  - [ ] 8.2 Testa migration på staging
    - Kör migration script på staging databas
    - Verifiera data integrity med SELECT queries
    - Verifiera att applikationen fungerar med nya schemat
    - Dokumentera eventuella problem
    - _Requirements: 3.10, 24.2_
  
  - [ ] 8.3 Kör migration på production
    - Skapa full backup innan migration
    - Kör migration script på production
    - Verifiera data integrity
    - Behåll backup-tabeller i 30 dagar
    - _Requirements: 3.9, 24.3, 24.4_

### Fas 4: Documentation Cleanup (0.5 dag)

- [ ] 9. Ta bort obsolet dokumentation
  - [ ] 9.1 Ta bort gamla planerings-dokument från root
    - Ta bort `ACTION_PLAN.md`
    - Ta bort `AI_FIRST_REDESIGN.md`
    - Ta bort `DEEP_THINKING_PROMPT_STRATEGY.md`
    - Ta bort `FINAL_COMPLETE_FIX.md`
    - Ta bort `FINAL_DEEP_ANALYSIS.md`
    - Ta bort `FINAL_FIX_COMPLETE.md`
    - Ta bort `FINAL_IMPLEMENTATION_PLAN.md`
    - Ta bort `FULLSTÄNDIG_ANALYS.md`
    - Ta bort `OPTIMIZATION_COMPLETE.md`
    - Ta bort `OPTIMIZATION_STATUS.md`
    - Ta bort `PIPELINE_OPTIMIZATION_PLAN.md`
    - Ta bort `PRODUCTION_ANALYSIS.md`
    - Ta bort `REAL_SOLUTION.md`
    - Ta bort `DEEP_ANALYSIS.md`
    - Ta bort `DIAGNOSTIK.md`
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 20.10, 20.11, 20.12, 20.13_
  
  - [ ] 9.2 Ta bort gamla task completion summaries
    - Ta bort alla `TASK_*_COMPLETION_SUMMARY.md` från `.kiro/specs/perfect-swedish-pipeline/`
    - Ta bort `TASKS_*_IMPLEMENTATION.md` från `.kiro/specs/perfect-swedish-pipeline/`
    - Ta bort `IMPLEMENTATION_COMPLETE.md` från `.kiro/specs/perfect-swedish-pipeline/`
    - Ta bort `ROUTES_INTEGRATION_TODO.md` från `.kiro/specs/perfect-swedish-pipeline/`
    - Behåll operationella dokument (DEPLOYMENT_GUIDE, OPERATIONS_RUNBOOK, etc.)
    - _Requirements: 20.14-20.20_
  
  - [ ] 9.3 Skapa cleanup changelog
    - Skapa `CLEANUP_CHANGELOG.md` med sammanfattning av alla ändringar
    - Dokumentera borttagna filer (kod, tester, dokumentation)
    - Dokumentera optimeringar (token budget, validation rules)
    - Dokumentera database schema changes
    - Dokumentera breaking changes (inga för frontend)
    - _Requirements: 21.1, 21.5_

### Fas 5: Testing & Validation (1 dag)

- [ ] 10. Skriv och kör unit tests
  - [ ] 10.1 Skriv unit tests för Smart_Generator
    - Test: ska generera alla 6 required fields
    - Test: ska kasta error om fält saknas
    - Test: ska använda korrekt token budget
    - Test: ska hantera minimal fields mode korrekt
    - Mock OpenAI responses för testbarhet
    - _Requirements: 13.1-13.9, 22.1_
  
  - [ ] 10.2 Skriv unit tests för Post_Processor
    - Test: ska validera och ersätta restaurangnamn
    - Test: ska fixa narrativ integritet
    - Test: ska lägga till saknade fakta
    - Test: ska logga alla transformationer
    - Test: ska hantera graceful degradation
    - _Requirements: 8.1-8.7, 9.1-9.6, 10.1-10.7, 22.2_
  
  - [ ] 10.3 Skriv unit tests för validation functions
    - Test: ska tillåta legitima mäklarfraser
    - Test: ska flagga verkliga AI-klyschor
    - Test: ska använda context-aware gränser
    - Test: ska exempta specifika ord från monoton check
    - Test: ska vara idempotent
    - _Requirements: 6.1-6.8, 7.1-7.19, 22.4_
  
  - [ ] 10.4 Skriv unit tests för token budget calculation
    - Test: ska returnera minimum 5500 tokens
    - Test: ska returnera maximum 8000 tokens
    - Test: ska beräkna korrekt för olika targetWordMax
    - Test: ska clampa korrekt
    - _Requirements: 4.1-4.7, 22.5_

- [ ] 11. Skriv och kör integration tests
  - [ ] 11.1 Skriv integration test för komplett pipeline
    - Test: ska komplettera full pipeline i <20s
    - Test: ska generera alla aux-fält
    - Test: ska inte ha referenser till gamla systemet
    - Test: ska spara metrics korrekt
    - _Requirements: 11.1-11.9, 13.1-13.9, 22.6_
  
  - [ ] 11.2 Skriv integration test för retry logic
    - Test: ska retry upp till 2 gånger vid retryable errors
    - Test: ska använda exponential backoff
    - Test: ska inte retry vid non-retryable errors
    - Test: ska logga retry count i metrics
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 22.7_
  
  - [ ] 11.3 Skriv integration test för graceful degradation
    - Test: ska fortsätta med unprocessed text om Post_Processor failar
    - Test: ska fortsätta utan analysis om Expert_Analyzer failar
    - Test: ska logga warnings till Sentry
    - Test: ska markera degradation i metrics
    - _Requirements: 14.1-14.8, 22.8_

- [ ] 12. Skriv och kör regression tests
  - [ ] 12.1 Skriv regression test för gamla pipeline removal
    - Test: ska inte använda gamla pipeline-komponenter
    - Test: ska inte ha variant eller fallbackUsed i result
    - Test: ska alltid använda Perfect_Swedish_Orchestrator
    - _Requirements: 1.1-1.10, 2.1-2.7, 22.9_
  
  - [ ] 12.2 Skriv regression test för aux fields generation
    - Test: ska alltid generera alla 6 aux-fält
    - Test: ska ha 100% aux fields coverage
    - Test: ska generera aux-fält även i minimal mode
    - _Requirements: 13.1-13.9, 22.10_
  
  - [ ] 12.3 Kör befintliga regression tests
    - Kör `npm run test:regression`
    - Kör `npm run test:canary`
    - Verifiera att alla tester passerar
    - _Requirements: 22.11_

- [ ] 13. Kör performance benchmarking
  - [ ] 13.1 Kör load tests med k6
    - Kör `npm run test:load` med k6 script
    - Mät p50, p95, p99 latency
    - Mät success rate
    - Mät throughput (requests/minute)
    - Verifiera att p95 < 20s
    - _Requirements: 11.1-11.9, 23.1-23.6_
  
  - [ ] 13.2 Analysera performance results
    - Använd `server/tests/load/analyze-results.ts`
    - Verifiera att success rate > 98%
    - Verifiera att p95 duration < 20s
    - Dokumentera resultat i test report
    - _Requirements: 12.1, 12.8, 23.7, 23.8_

- [ ] 14. Manual testing av kritiska flöden
  - Testa basic text generation (factual, balanced, selling styles)
  - Testa att alla aux-fält genereras
  - Testa validation rules (legitima fraser tillåts)
  - Testa post-processing (restaurangnamn, narrativ integritet)
  - Testa expert analysis och feedback
  - Testa WebSocket progress events
  - Verifiera att frontend fungerar utan ändringar
  - _Requirements: 17.1-17.9, 21.1-21.6_

- [ ] 15. Checkpoint - Verifiera test results
  - Verifiera att alla unit tests passerar
  - Verifiera att alla integration tests passerar
  - Verifiera att alla regression tests passerar
  - Verifiera att performance benchmarks uppfyller mål
  - Verifiera att manual testing är godkänd
  - Skapa test report med alla resultat
  - Fråga användaren om godkännande för production deploy

### Fas 6: Deployment (0.5 dag)

- [ ] 16. Deploy till staging
  - [ ] 16.1 Förbered staging deployment
    - Verifiera att alla tester passerar
    - Verifiera att database migration är testad
    - Verifiera att rollback plan finns
    - Konfigurera monitoring dashboards
    - _Requirements: 24.1, 24.2, 24.4_
  
  - [ ] 16.2 Deploy och testa på staging
    - Push till staging branch (Render auto-deploy)
    - Kör smoke tests på staging
    - Verifiera success rate och performance
    - Verifiera att alla features fungerar
    - _Requirements: 24.2_

- [ ] 17. Deploy till production
  - [ ] 17.1 Förbered production deployment
    - Skapa full database backup
    - Verifiera att on-call engineer är tillgänglig
    - Kommunicera deployment till team
    - Förbered rollback plan
    - _Requirements: 24.1, 24.3, 24.4, 24.5_
  
  - [ ] 17.2 Kör production deployment
    - Push till main branch (Render auto-deploy)
    - Monitora deployment logs
    - Verifiera att applikationen startar korrekt
    - Kör smoke tests på production
    - _Requirements: 24.5_
  
  - [ ] 17.3 Post-deployment monitoring (2 timmar)
    - Monitora success rate (måste vara >98%)
    - Monitora p95 latency (måste vara <25s)
    - Monitora error rate (måste vara <2%)
    - Monitora CPU usage (måste vara <70%)
    - Monitora memory usage (måste vara <80%)
    - Monitora aux fields coverage (måste vara 100%)
    - Trigger rollback alert om metrics försämras
    - _Requirements: 11.1-11.9, 12.1, 16.1-16.10, 24.5, 24.6, 24.7_
  
  - [ ] 17.4 Kommunicera till användare
    - Skicka email om nya förbättringar
    - Uppdatera changelog på hemsidan
    - Informera support team om ändringar
    - _Requirements: 24.5_

- [ ] 18. Post-deployment validation
  - Verifiera att success rate är >98% efter 2 timmar
  - Verifiera att p95 latency är <20s
  - Verifiera att aux fields coverage är 100%
  - Verifiera att inga kritiska errors loggas
  - Skapa post-deployment report
  - Markera deployment som successful
  - _Requirements: 11.1-11.9, 12.1, 13.1-13.9, 24.5_

## Notes

- Tasks markerade med `*` är optional (inga i denna plan - alla tasks är required)
- Varje task refererar till specifika requirements för traceability
- Checkpoints säkerställer att användaren är involverad vid kritiska punkter
- Total estimerad tid: 5.5 dagar
- Deployment använder Render auto-deploy (git push)
- Rollback plan finns i `.kiro/specs/perfect-swedish-pipeline/ROLLBACK_PLAN.md`
- Monitoring setup finns i `.kiro/specs/perfect-swedish-pipeline/MONITORING_SETUP.md`
