# Implementation Plan

## Phase 1: Exploration Tests (Before Fix)

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Critical Quality Errors Detection
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: For deterministic bugs, scope properties to concrete failing cases to ensure reproducibility
  - Test implementation details from Bug Condition in design:
    - Grammar errors: double punctuation (..), space before punctuation ( .), broken sentences
    - Emoji violations: emojis in Hemnet socialCopy/headline, >2 emojis in Instagram
    - Specific business names: "Kikka", "COME 2 EAT", "ChopChop Asian Express" in text
    - Mechanical style: bullet-point patterns like "X (type). Y (type)."
    - Unverifiable claims: "nyskick" without renovation evidence in disposition
  - The test assertions should match the Expected Behavior Properties from design
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found to understand root cause
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

## Phase 2: Preservation Tests (Before Fix)

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Quality Features
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (texts that already meet quality standards)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - Core generation quality: broker-realistic Swedish text without AI clichés
    - Forbidden phrase blocking: AI-specific phrases blocked
    - Platform-specific rules: Hemnet exclusions (price, avgift, energiklass)
    - Field-specific validation: headline max 9 words, showingInvitation requires "visning"
    - Post-processing transformations: placeholder removal, Swedish character normalization
    - Validation detection: forbidden phrases, platform violations detected
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

## Phase 3: Implementation

- [x] 3. Implement three-layer defense strategy

  - [x] 3.1 Layer 1: Enhance generator with reasoning mode and explicit rules
    - Add reasoning_effort parameter to OpenAI API call in SmartGenerationEngine.generate()
    - Use "medium" for main text generation (enables o1/o3 reasoning mode)
    - Use "low" for auxiliary fields (faster generation)
    - Enhance buildSystemPrompt() with explicit grammar rules section:
      - "ALDRIG dubbla punkter (.. → .)"
      - "ALDRIG mellanslag före punkt/komma/utropstecken"
      - "Varje mening måste ha korrekt interpunktion mellan satser"
    - Add emoji rules to platform-specific sections:
      - Hemnet: "INGA emojis i headline, socialCopy, showingInvitation, shortAd"
      - Instagram: "MAX 2 emojis i instagramCaption"
    - Add business name generalization instruction:
      - "Använd ALDRIG specifika restaurangnamn - skriv 'restauranger', 'kaféer', 'matställen'"
    - Add pre-flight validation in generate() before returning:
      - Check for grammar errors (double punctuation, space before punctuation)
      - Check for emoji violations
      - Check for specific business names
      - Throw GeneratorValidationError if violations found
    - _Bug_Condition: isBugCondition(generatedText) from design_
    - _Expected_Behavior: expectedBehavior(result) from design - no grammar errors, emoji-compliant, generic terms_
    - _Preservation: Preservation Requirements from design - existing quality features unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Layer 2: Strengthen post-processor cleanup rules
    - Add cleanupGrammarErrors() method to DeterministicPostProcessor:
      - Remove double punctuation: text.replace(/\.{2,}/g, '.')
      - Remove space before punctuation: text.replace(/\s+([.!?,;:])/g, '$1')
      - Detect broken sentences and log warnings
    - Enhance enforceFieldQualityRules() for emoji removal:
      - For Hemnet: remove ALL emojis from headline, socialCopy, showingInvitation, shortAd
      - For Instagram: limit to exactly 2 emojis (keep first 2, remove rest)
      - Log all emoji removals as transformations
    - Enhance generalizeAndDeduplicate() with restaurant name patterns:
      - Add pattern: /\b(kikka|come 2 eat|chopchop asian express)\b/gi → "restauranger"
      - Add pattern: /Restaurang\s+[A-ZÅÄÖ][a-zåäö]+/gi → "restauranger"
      - Add pattern: /Kafé\s+[A-ZÅÄÖ][a-zåäö]+/gi → "kaféer"
    - Add detectBrokenSentences() method:
      - Detect missing punctuation between clauses
      - Log warnings for manual review
    - _Bug_Condition: isBugCondition(generatedText) from design_
    - _Expected_Behavior: expectedBehavior(result) from design - aggressive cleanup applied_
    - _Preservation: Preservation Requirements from design - existing transformations unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.7, 3.8_

  - [x] 3.3 Layer 3: Add pre-flight validation gates
    - Add validatePreFlight() function to text-validation.ts:
      - Check grammar errors before post-processing
      - Check emoji violations before post-processing
      - Check specific business names before post-processing
      - Return violations array for logging
    - Enhance findRuleViolations() with grammar error detection:
      - Pattern: /\.{2,}/ → "Double punctuation detected"
      - Pattern: /\s+[.!?,;:]/ → "Space before punctuation detected"
      - Pattern for broken sentences (complex heuristic)
    - Add mechanical text style detection:
      - Pattern: /\w+\s+\([^)]+\)\.\s+\w+\s+\([^)]+\)\./ → "Mechanical bullet-point style detected"
      - Pattern: /^\s*[-•]\s+/m → "Bullet points detected in prose"
    - _Bug_Condition: isBugCondition(generatedText) from design_
    - _Expected_Behavior: expectedBehavior(result) from design - validation catches issues_
    - _Preservation: Preservation Requirements from design - existing validation unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.8, 2.9, 3.9, 3.10_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Critical Quality Errors Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bugs are fixed)
    - _Requirements: Expected Behavior Properties from design - 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Quality Features Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: Preservation Requirements from design - 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

## Phase 4: Checkpoint

- [x] 4. Checkpoint - Ensure all tests pass
  - Run complete test suite: npm run test
  - Run regression tests: npm run test:regression
  - Run canary quality tests: npm run test:canary
  - Verify all exploration tests pass (bugs fixed)
  - Verify all preservation tests pass (no regressions)
  - Verify integration tests pass (complete pipeline works)
  - Ask user if questions arise or if manual review is needed for edge cases
