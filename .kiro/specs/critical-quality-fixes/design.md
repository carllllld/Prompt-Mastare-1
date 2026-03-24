# Critical Quality Fixes Bugfix Design

## Overview

The AI text generator is producing unacceptable output with critical quality errors: grammatical errors (double punctuation, space before punctuation, broken sentences), emoji violations in Hemnet fields, specific restaurant names, mechanical bullet-point style, and unverifiable claims. This bugfix implements a comprehensive quality pipeline overhaul with three layers of defense: (1) enhanced generator prompts with explicit grammar rules and reasoning effort parameter for o1/o3 reasoning mode, (2) aggressive post-processor cleanup rules, and (3) pre-flight validation gates that catch issues before returning to the user.

The strategy is ROOT CAUSE PREVENTION: fix the generator to produce correct output from the start, rather than relying solely on post-processing cleanup.

## Glossary

- **Bug_Condition (C)**: The condition that triggers quality errors - when the generator produces text with grammar errors, emoji violations, specific business names, mechanical style, or unverifiable claims
- **Property (P)**: The desired behavior - all generated text must be grammatically correct, emoji-compliant, use generic terms, flow naturally, and be evidence-based
- **Preservation**: Existing quality features that must remain unchanged - forbidden phrase blocking, platform-specific rules, field validation, and core generation quality
- **Generator (perfect-swedish-generator.ts)**: The AI text generation engine using OpenAI GPT-5.2
- **Post-Processor (perfect-swedish-post-processor.ts)**: Deterministic cleanup engine that applies transformations after generation
- **Validator (text-validation.ts)**: Quality gate that detects rule violations before returning output
- **Reasoning Effort**: OpenAI parameter for o1/o3 models that controls depth of reasoning (low/medium/high)
- **Pre-flight Validation**: Quality checks performed by the generator before returning output

## Bug Details

### Bug Condition

The bug manifests when the generator produces text that violates critical quality standards. The system is either (1) not instructing the model clearly enough about grammar rules, (2) not using reasoning mode for quality-critical generation, (3) not catching errors in post-processing, or (4) not validating output before returning to the user.

**Formal Specification:**
```
FUNCTION isBugCondition(generatedText)
  INPUT: generatedText of type GenerationResult
  OUTPUT: boolean
  
  RETURN hasGrammarErrors(generatedText)
         OR hasEmojiViolations(generatedText, platform)
         OR hasSpecificBusinessNames(generatedText)
         OR hasMechanicalStyle(generatedText)
         OR hasUnverifiableClaims(generatedText, disposition)
END FUNCTION

FUNCTION hasGrammarErrors(text)
  RETURN text.match(/\.\.+/)  // double punctuation
         OR text.match(/\s+[.!?,;:]/)  // space before punctuation
         OR hasBrokenSentences(text)  // missing punctuation between clauses
END FUNCTION

FUNCTION hasEmojiViolations(text, platform)
  IF platform == "hemnet" THEN
    RETURN (text.socialCopy OR text.headline OR text.showingInvitation OR text.shortAd).match(/[\u{1F300}-\u{1F9FF}]/u)
  END IF
  RETURN text.instagramCaption.match(/[\u{1F300}-\u{1F9FF}]/gu).length > 2
END FUNCTION

FUNCTION hasSpecificBusinessNames(text)
  RETURN text.match(/\b(kikka|come 2 eat|chopchop asian express|restaurang\s+[A-ZÅÄÖ]\w+)\b/i)
END FUNCTION

FUNCTION hasMechanicalStyle(text)
  RETURN text.match(/\w+\s+\([^)]+\)\.\s+\w+\s+\([^)]+\)\./)  // "X (type). Y (type)."
         OR text.match(/^\s*[-•]\s+/m)  // bullet points
END FUNCTION

FUNCTION hasUnverifiableClaims(text, disposition)
  claims = ["nyskick", "genomgående nyskick", "toppskick", "perfekt skick"]
  FOR EACH claim IN claims DO
    IF text.includes(claim) AND NOT hasEvidence(disposition, claim) THEN
      RETURN true
    END IF
  END FOR
  RETURN false
END FUNCTION
```

### Examples

**Grammar Errors:**
- Input: Generator produces "Slussen.." → Expected: "Slussen."
- Input: Generator produces "visning ." → Expected: "visning."
- Input: Generator produces "Nya fönster och tjärpappstak är två tydliga plus prioriterar långsiktigt underhåll." → Expected: "Nya fönster och tjärpappstak är två tydliga plus som prioriterar långsiktigt underhåll."

**Emoji Violations:**
- Input: Hemnet platform, socialCopy contains "🌞" → Expected: No emojis in socialCopy for Hemnet
- Input: Instagram caption contains "🌞🛁🏡✨" (4 emojis) → Expected: Max 2 emojis

**Specific Business Names:**
- Input: "Kikka och COME 2 EAT finns runt hörnet" → Expected: "Restauranger finns runt hörnet"
- Input: "ChopChop Asian Express ligger 200 meter bort" → Expected: "Restauranger ligger 200 meter bort"

**Mechanical Style:**
- Input: "Willys Värmdö (matbutik). Kikka (restaurang)." → Expected: "Matbutik och restauranger finns i närområdet."

**Unverifiable Claims:**
- Input: "Bostaden är i genomgående nyskick" (no renovation data) → Expected: "Bostaden är välskött" OR specific renovation facts

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Core generation quality: broker-realistic Swedish text without AI clichés must continue to work
- Forbidden phrase blocking: AI-specific phrases like "välkommen till", "erbjuder", "bjuder på" must continue to be blocked
- Platform-specific rules: Hemnet exclusions (price, avgift, energiklass) and Booli allowances must continue to work
- Field-specific validation: headline max 9 words, showingInvitation requires "visning", etc. must continue to work
- Post-processing transformations: placeholder removal, Swedish character normalization, narrative integrity checks must continue to work
- Validation detection: forbidden phrases, platform violations, field-specific rule violations must continue to be detected

**Scope:**
All inputs that do NOT trigger the bug condition (already producing correct output) should be completely unaffected by this fix. This includes:
- Texts that already have correct grammar
- Texts that already comply with emoji rules
- Texts that already use generic business terms
- Texts that already flow naturally
- Texts that already make evidence-based claims

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Generator Not Using Reasoning Mode**: The generator uses gpt-5.2 with temperature 0.7 but does not set the reasoning_effort parameter, so it's not using o1/o3 reasoning mode which would catch grammar errors during generation

2. **Insufficient Grammar Instructions**: The system prompt does not explicitly warn about double punctuation, space before punctuation, or broken sentence structures

3. **Post-Processor Not Aggressive Enough**: The post-processor has some cleanup rules but they don't catch all grammar errors (e.g., double punctuation cleanup exists but may not be comprehensive)

4. **No Pre-flight Validation in Generator**: The generator does not validate its own output before returning, so errors pass through to post-processing

5. **Emoji Rules Not Enforced Early Enough**: Emoji removal happens in post-processing but the generator is not instructed to avoid emojis in Hemnet fields

6. **Business Name Generalization Too Weak**: The post-processor has generalization patterns but they may not catch all specific restaurant names

7. **No Mechanical Style Detection**: The system does not detect or prevent mechanical bullet-point style text

8. **Unverifiable Claims Not Checked**: The generator is not instructed to only make claims supported by disposition data

## Correctness Properties

Property 1: Bug Condition - Grammar, Emoji, and Quality Correctness

_For any_ generated text where quality errors exist (grammar errors, emoji violations, specific business names, mechanical style, or unverifiable claims), the fixed generation pipeline SHALL produce grammatically correct text with proper punctuation, emoji-compliant fields, generic business terms, natural prose style, and evidence-based claims only.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 2: Preservation - Existing Quality Features

_For any_ generated text that already meets quality standards, the fixed generation pipeline SHALL produce exactly the same quality output as before, preserving all existing quality features including forbidden phrase blocking, platform-specific rules, field validation, post-processing transformations, and validation detection.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `server/lib/perfect-swedish-generator.ts`

**Function**: `SmartGenerationEngine.generate()` and `buildSystemPrompt()`

**Specific Changes**:

1. **Add Reasoning Effort Parameter**: Add reasoning_effort parameter to OpenAI API call
   - For main text generation: use `reasoning_effort: "medium"` to enable o1/o3 reasoning mode
   - For auxiliary fields: use `reasoning_effort: "low"` for faster generation
   - This enables the model to self-correct grammar errors during generation

2. **Enhance System Prompt with Explicit Grammar Rules**: Add dedicated grammar section to system prompt
   - Explicitly warn about double punctuation: "ALDRIG dubbla punkter (.. → .)"
   - Explicitly warn about space before punctuation: "ALDRIG mellanslag före punkt/komma/utropstecken"
   - Explicitly warn about broken sentences: "Varje mening måste ha korrekt interpunktion mellan satser"
   - Add examples of correct vs incorrect grammar

3. **Add Emoji Rules to System Prompt**: Make emoji rules explicit in platform-specific sections
   - Hemnet: "INGA emojis i headline, socialCopy, showingInvitation, shortAd"
   - Instagram: "MAX 2 emojis i instagramCaption"
   - Add examples of correct emoji usage

4. **Add Business Name Generalization to System Prompt**: Instruct model to use generic terms
   - "Använd ALDRIG specifika restaurangnamn - skriv 'restauranger', 'kaféer', 'matställen'"
   - "Generalisera alltid företagsnamn till kategorier"

5. **Add Pre-flight Validation**: Add internal validation before returning from generate()
   - Check for grammar errors (double punctuation, space before punctuation)
   - Check for emoji violations
   - Check for specific business names
   - If validation fails, log error and throw GeneratorValidationError with violations

**File**: `server/lib/perfect-swedish-post-processor.ts`

**Function**: `DeterministicPostProcessor.process()`

**Specific Changes**:

1. **Add Aggressive Grammar Cleanup**: Add new method `cleanupGrammarErrors()`
   - Remove double punctuation: `text.replace(/\.{2,}/g, '.')`
   - Remove space before punctuation: `text.replace(/\s+([.!?,;:])/g, '$1')`
   - Detect broken sentences and log warnings (cannot auto-fix safely)

2. **Enhance Emoji Removal**: Strengthen `enforceFieldQualityRules()`
   - For Hemnet: remove ALL emojis from headline, socialCopy, showingInvitation, shortAd
   - For Instagram: limit to exactly 2 emojis (keep first 2, remove rest)
   - Log all emoji removals as transformations

3. **Add Restaurant Name Pattern Detection**: Enhance `generalizeAndDeduplicate()`
   - Add pattern: `/\b(kikka|come 2 eat|chopchop asian express)\b/gi` → "restauranger"
   - Add pattern: `/Restaurang\s+[A-ZÅÄÖ][a-zåäö]+/gi` → "restauranger"
   - Add pattern: `/Kafé\s+[A-ZÅÄÖ][a-zåäö]+/gi` → "kaféer"

4. **Add Broken Sentence Structure Detection**: Add new method `detectBrokenSentences()`
   - Detect missing punctuation between clauses
   - Log warnings for manual review (cannot auto-fix safely)

**File**: `server/lib/text-validation.ts`

**Function**: `validateOptimizationResult()` and `findRuleViolations()`

**Specific Changes**:

1. **Add Pre-flight Quality Gates**: Add new function `validatePreFlight()`
   - Check grammar errors before post-processing
   - Check emoji violations before post-processing
   - Check specific business names before post-processing
   - Return violations array for logging

2. **Enhance Grammar Error Detection**: Add patterns to `findRuleViolations()`
   - Pattern: `/\.{2,}/` → "Double punctuation detected"
   - Pattern: `/\s+[.!?,;:]/` → "Space before punctuation detected"
   - Pattern for broken sentences (complex heuristic)

3. **Add Mechanical Text Style Detection**: Add new patterns
   - Pattern: `/\w+\s+\([^)]+\)\.\s+\w+\s+\([^)]+\)\./` → "Mechanical bullet-point style detected"
   - Pattern: `/^\s*[-•]\s+/m` → "Bullet points detected in prose"

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that generate text with known problematic inputs (e.g., disposition data that triggers unverifiable claims, location data with specific restaurant names). Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Grammar Error Test**: Generate text and check for double punctuation, space before punctuation (will fail on unfixed code)
2. **Emoji Violation Test**: Generate Hemnet text and check for emojis in socialCopy (will fail on unfixed code)
3. **Business Name Test**: Generate text with location data containing "Kikka" and check if it appears in output (will fail on unfixed code)
4. **Mechanical Style Test**: Generate text and check for bullet-point patterns (will fail on unfixed code)
5. **Unverifiable Claims Test**: Generate text without renovation data and check for "nyskick" claims (will fail on unfixed code)

**Expected Counterexamples**:
- Generator produces ".." instead of "."
- Generator produces " ." instead of "."
- Generator includes emojis in Hemnet socialCopy
- Generator includes "Kikka" instead of "restauranger"
- Generator produces "X (type). Y (type)." instead of natural prose
- Possible causes: no reasoning mode, insufficient prompt instructions, weak post-processing

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed pipeline produces the expected behavior.

**Pseudocode:**
```
FOR ALL generatedText WHERE isBugCondition(generatedText) DO
  fixedText := fixedPipeline(generatedText)
  ASSERT NOT hasGrammarErrors(fixedText)
  ASSERT NOT hasEmojiViolations(fixedText, platform)
  ASSERT NOT hasSpecificBusinessNames(fixedText)
  ASSERT NOT hasMechanicalStyle(fixedText)
  ASSERT NOT hasUnverifiableClaims(fixedText, disposition)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed pipeline produces the same result as the original pipeline.

**Pseudocode:**
```
FOR ALL generatedText WHERE NOT isBugCondition(generatedText) DO
  ASSERT originalPipeline(generatedText) = fixedPipeline(generatedText)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for correct outputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Forbidden Phrase Preservation**: Observe that forbidden phrases are blocked on unfixed code, then verify this continues after fix
2. **Platform Rules Preservation**: Observe that Hemnet excludes price/avgift on unfixed code, then verify this continues after fix
3. **Field Validation Preservation**: Observe that headline max 9 words is enforced on unfixed code, then verify this continues after fix
4. **Post-Processing Preservation**: Observe that placeholder removal works on unfixed code, then verify this continues after fix

### Unit Tests

- Test grammar cleanup: double punctuation removal, space before punctuation removal
- Test emoji removal: Hemnet fields, Instagram caption limit
- Test business name generalization: specific restaurant names → generic terms
- Test mechanical style detection: bullet-point patterns, list-like structures
- Test unverifiable claims detection: claims without evidence in disposition
- Test pre-flight validation: generator catches errors before returning
- Test reasoning effort parameter: verify it's set correctly for main text vs auxiliary fields

### Property-Based Tests

- Generate random disposition data and verify no grammar errors in output
- Generate random platform configurations and verify emoji rules are followed
- Generate random location data and verify no specific business names in output
- Generate random property data and verify only evidence-based claims are made
- Test that all non-buggy inputs continue to produce same output as before

### Integration Tests

- Test complete pipeline with problematic inputs: verify all fixes work together
- Test generator → post-processor → validator flow: verify errors are caught at each stage
- Test reasoning mode integration: verify o1/o3 reasoning improves quality
- Test preservation of existing quality features: verify no regressions
