# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Analyzer Detects All Validation Violations
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test concrete failing cases (forbidden phrases, Hemnet violations, unverifiable claims, grammar errors) to ensure reproducibility
  - Test implementation details from Bug Condition in design:
    - Generate text with "erbjuds" in improvedPrompt → expect analyzer to return critical improvement
    - Generate text with "i nyskick" in socialCopy → expect analyzer to return critical improvement
    - Generate text with "Kontakta mäklaren för ekonomisk information" → expect analyzer to return critical improvement
    - Generate text with double period ".." in headline → expect analyzer to return critical improvement
    - Generate violations across multiple fields → expect analyzer to detect all violations
  - The test assertions should match the Expected Behavior Properties from design:
    - Assert analyzer returns improvement items with severity: "critical" for each violation
    - Assert legalCheck.compliant is false when violations exist
    - Assert legalCheck.issues contains violation types
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause:
    - Does AI return empty improvements array?
    - Does AI return non-critical suggestions but miss critical violations?
    - Does AI miss violations in specific fields?
    - Does legalCheck.compliant remain true despite violations?
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Violation Analysis Quality
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Run analyzer on clean text (no violations) → observe quality score, strengths, suggestions
    - Run analyzer on text with only non-critical style issues → observe suggestions
    - Run analyzer on timeout scenario → observe basic analysis return
    - Run analyzer on text where post-processor removed violations → observe no violations detected
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - For all clean texts (no violations), analyzer returns quality analysis with strengths
    - For all texts with non-critical issues, analyzer returns appropriate suggestions
    - For all timeout scenarios, analyzer returns basic analysis with overallQuality: 7.0
    - For all texts where violations were removed, analyzer finds no violations
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [-] 3. Fix for Expert Analyzer validation detection

  - [x] 3.1 Add validation imports and enhance buildAnalysisPrompt
    - Import `findRuleViolations` from `./text-validation`
    - Import `UNVERIFIABLE_CLAIMS`, `HEMNET_FORBIDDEN_PATTERNS` from `./text-rules`
    - Enhance `buildAnalysisPrompt()` method to include missing rule categories:
      - Add UNVERIFIABLE_CLAIMS section with evidence requirements
      - Add explicit HEMNET_FORBIDDEN_PATTERNS list (not just generic description)
      - Strengthen severity language: "MUST flag as critical" instead of "should check"
      - Add instruction to check EVERY field for violations
    - _Bug_Condition: isBugCondition(input) where validation detects violations but AI returns empty improvements_
    - _Expected_Behavior: AI prompt includes all rule categories and emphasizes critical severity_
    - _Preservation: Existing prompt quality and structure preserved_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Implement runDeterministicValidation method
    - Add private method `runDeterministicValidation(request: AnalysisRequest): ValidationResult`
    - Extract all text fields from request (improvedPrompt, headline, socialCopy, instagramCaption, showingInvitation, shortAd)
    - For each non-empty field, call `findRuleViolations(text, request.platform, request.style)`
    - Store violations in map: `{ field: string, violations: string[] }`
    - Return `{ violations: Record<string, string[]>, totalCount: number }`
    - _Bug_Condition: Validation system detects violations that AI misses_
    - _Expected_Behavior: Deterministic validation catches all violations before AI analysis_
    - _Preservation: No impact on existing analysis flow_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.3 Implement mergeValidationViolations method
    - Add private method `mergeValidationViolations(analysis: ExpertAnalysis, validation: ValidationResult): ExpertAnalysis`
    - For each field with violations, check if AI already detected them
    - Detection logic: check if improvement.location matches field AND improvement.issue contains violation substring
    - For violations NOT detected by AI, add them as FeedbackItem:
      - id: uuidv4()
      - issue: violation message from findRuleViolations
      - location: field name
      - suggestion: generate appropriate suggestion based on violation type
      - category: categorize violation (grammar/style/legal/clarity)
      - severity: "critical"
      - expert: determine expert (broker/lawyer) based on violation type
      - actionable: false
    - Return merged analysis with all violations included
    - _Bug_Condition: AI misses violations that validation detects_
    - _Expected_Behavior: All validation violations appear in improvements array_
    - _Preservation: AI-detected improvements preserved_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.4 Add helper methods for violation processing
    - Add `generateSuggestionForViolation(violation: string): string` - maps violation to actionable suggestion
    - Add `categorizeViolation(violation: string): FeedbackItem['category']` - determines category based on violation text
    - Add `determineExpert(violation: string): 'broker' | 'lawyer'` - determines expert based on violation type
    - Implement logic:
      - Forbidden phrases → category: "style", expert: "broker", suggestion: "Ersätt med naturligt mäklarspråk"
      - Hemnet violations → category: "legal", expert: "lawyer", suggestion: "Ta bort enligt Hemnet-regler"
      - Unverifiable claims → category: "legal", expert: "lawyer", suggestion: "Lägg till bevis eller ta bort påståendet"
      - Grammar errors → category: "grammar", expert: "broker", suggestion: "Korrigera grammatikfel"
    - _Bug_Condition: Violations need proper categorization and suggestions_
    - _Expected_Behavior: Each violation has appropriate category, expert, and suggestion_
    - _Preservation: Existing categorization logic preserved_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [x] 3.5 Update analyze method to use hybrid approach
    - Modify `analyze()` method to implement hybrid validation flow:
      1. Run `runDeterministicValidation(request)` BEFORE calling OpenAI
      2. Pass validation context to `buildAnalysisPrompt()` (optional enhancement)
      3. Call OpenAI with enhanced prompt
      4. Parse AI response as usual
      5. Call `mergeValidationViolations(aiAnalysis, validationResult)`
      6. Update legalCheck based on merged violations
    - Update legalCheck logic:
      - If any critical violations exist (from validation OR AI), set `legalCheck.compliant = false`
      - Populate `legalCheck.issues` with list of violation types
      - Add note if violations were caught by deterministic validation
    - _Bug_Condition: AI-only analysis misses violations_
    - _Expected_Behavior: Hybrid approach guarantees all violations are caught_
    - _Preservation: Existing analyze flow structure preserved, timeout handling unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Analyzer Detects All Validation Violations
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify all assertions pass:
      - Analyzer returns critical improvements for forbidden phrases
      - Analyzer returns critical improvements for Hemnet violations
      - Analyzer returns critical improvements for unverifiable claims
      - Analyzer returns critical improvements for grammar errors
      - Analyzer detects violations across all fields
      - legalCheck.compliant is false when violations exist
      - legalCheck.issues contains violation types
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Violation Analysis Quality
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Verify all preservation properties hold:
      - Clean texts (no violations) get quality analysis with strengths
      - Non-critical style suggestions continue to be generated
      - Quality scoring reflects detected issues
      - Timeout handling returns basic analysis
      - Text span identification works correctly
      - Auto-fix generation works for actionable items
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all tests: `npm run test`
  - Verify bug condition test passes (task 3.6)
  - Verify preservation tests pass (task 3.7)
  - Verify no regressions in existing analyzer tests
  - Verify integration with orchestrator works correctly
  - Verify ExpertFeedbackPanel displays violations correctly
  - If any tests fail, investigate and fix before proceeding
  - Ask the user if questions arise
