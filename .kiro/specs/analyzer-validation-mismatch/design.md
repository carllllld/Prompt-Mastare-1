# Expert Analyzer Validation Mismatch Bugfix Design

## Overview

The Expert Analyzer (AI-powered feedback system) fails to detect critical violations that the deterministic validation system correctly identifies. This creates a dangerous user experience gap where users receive no feedback about forbidden phrases, Hemnet rule violations, unverifiable claims, and grammar errors despite these violations being logged to Sentry. The fix implements a hybrid approach: enhance the AI prompt with missing rule categories AND add a deterministic validation layer that guarantees critical violations are always caught and surfaced to users.

**Fix Strategy:** Hybrid AI + Deterministic Validation
- Keep AI analysis for nuanced feedback and suggestions
- Add deterministic pre-check using `findRuleViolations()` before AI analysis
- Merge AI improvements with validation violations in post-processing
- Ensure `legalCheck.compliant = false` when violations exist

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when validation system detects violations but Expert Analyzer returns empty improvements array
- **Property (P)**: The desired behavior - Expert Analyzer SHALL detect and return improvement items for all violations found by validation system
- **Preservation**: Existing AI analysis quality, strengths detection, and non-critical suggestions must remain unchanged
- **ExpertAIAnalyzer**: The class in `server/lib/perfect-swedish-analyzer.ts` that analyzes text and returns feedback
- **findRuleViolations**: The function in `server/lib/text-validation.ts` that deterministically detects violations
- **FORBIDDEN_PHRASES**: List of 66 AI clichés in `server/lib/text-rules.ts` that must never appear
- **HEMNET_FORBIDDEN_PATTERNS**: List of Hemnet-specific rules (economic references, price/fee mentions) in `server/lib/text-rules.ts`
- **UNVERIFIABLE_CLAIMS**: List of claims requiring evidence ("i nyskick", "mycket gott skick", etc.) in `server/lib/text-rules.ts`
- **buildAnalysisPrompt**: Method that constructs the AI prompt - currently missing UNVERIFIABLE_CLAIMS and explicit HEMNET_FORBIDDEN_PATTERNS

## Bug Details

### Bug Condition

The bug manifests when the validation system (`findRuleViolations()`) detects violations in any field (improvedPrompt, socialCopy, instagramCaption, showingInvitation, shortAd, headline) but the Expert Analyzer's AI-based analysis fails to detect and return these violations as improvement items. The AI either misses the violations entirely or doesn't emphasize their critical severity.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AnalysisRequest (contains all text fields)
  OUTPUT: boolean
  
  allFields := [input.improvedPrompt, input.headline, input.socialCopy, 
                input.instagramCaption, input.showingInvitation, input.shortAd]
  
  FOR EACH field IN allFields DO
    validationViolations := findRuleViolations(field, input.platform, input.style)
    IF validationViolations.length > 0 THEN
      aiAnalysis := ExpertAIAnalyzer.analyze(input)
      
      // Check if AI detected the violations
      aiDetectedViolations := aiAnalysis.improvements.filter(
        item => item.severity === "critical" AND 
                matchesValidationViolation(item, validationViolations)
      )
      
      IF aiDetectedViolations.length < validationViolations.length THEN
        RETURN true  // Bug: AI missed some violations
      END IF
    END IF
  END FOR
  
  RETURN false  // No bug: AI detected all violations
END FUNCTION
```

### Examples

**Example 1: Forbidden Phrase "erbjuds"**
- Input: `improvedPrompt: "Här erbjuds en rymlig lägenhet med balkong"`
- Validation detects: `["Förbjuden fras: 'erbjuds'"]`
- AI returns: `improvements: []` (empty - BUG)
- Expected: `improvements: [{ issue: "Förbjuden fras: 'erbjuds'", severity: "critical", category: "style" }]`

**Example 2: Unverifiable Claim "i nyskick"**
- Input: `socialCopy: "Kök i nyskick med moderna vitvaror"`
- Validation detects: `["Otydligt påstående: 'i nyskick' kräver bevis"]`
- AI returns: `improvements: []` (empty - BUG)
- Expected: `improvements: [{ issue: "Otydligt påstående: 'i nyskick' kräver bevis", severity: "critical", category: "legal" }]`

**Example 3: Hemnet Economic Reference**
- Input: `improvedPrompt: "Kontakta mäklaren för fullständig ekonomisk information"`
- Validation detects: `["Ekonomihänvisning inte tillåten i objektbeskrivning"]`
- AI returns: `improvements: []` (empty - BUG)
- Expected: `improvements: [{ issue: "Hemnet-regel: Ekonomihänvisning inte tillåten", severity: "critical", category: "legal" }]`

**Example 4: Grammar Error - Double Period**
- Input: `headline: "Rymlig lägenhet.. Söderläge"`
- Validation detects: Grammar error pattern
- AI returns: `improvements: []` (empty - BUG)
- Expected: `improvements: [{ issue: "Dubbel punkt", severity: "critical", category: "grammar" }]`

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- AI analysis quality for non-violation feedback must remain unchanged
- Strengths detection must continue to identify positive aspects
- Non-critical style suggestions must continue to be generated
- Overall quality scoring must continue to reflect detected issues
- Timeout handling must continue to return basic analysis
- Text span identification must continue to locate issues in text
- Auto-fix generation must continue for actionable items

**Scope:**
All inputs that do NOT contain validation violations should be completely unaffected by this fix. This includes:
- Clean texts without forbidden phrases, Hemnet violations, or grammar errors
- Texts where post-processor successfully removed violations before analyzer runs
- Texts with only non-critical style improvements (AI should continue suggesting these)
- Timeout scenarios (should continue returning basic analysis)

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Incomplete Prompt - Missing UNVERIFIABLE_CLAIMS**: The `buildAnalysisPrompt()` method includes FORBIDDEN_PHRASES and platform rules but does NOT include the UNVERIFIABLE_CLAIMS list from `text-rules.ts`. The AI has no knowledge of claims like "i nyskick", "mycket gott skick", "fräscht" that require evidence.

2. **Incomplete Prompt - HEMNET_FORBIDDEN_PATTERNS Not Explicit**: While the prompt mentions "Hemnet-specifika regler", it doesn't explicitly list all patterns from HEMNET_FORBIDDEN_PATTERNS (economic references, price/fee mentions). The AI may not catch all variations.

3. **Insufficient Severity Emphasis**: The prompt may not emphasize strongly enough that violations are CRITICAL and must always be flagged. The AI might treat them as optional suggestions rather than mandatory detections.

4. **AI Reliability Gap**: Even with perfect prompts, AI models can miss violations due to their probabilistic nature. Relying solely on AI for critical compliance checking is inherently risky.

5. **No Cross-Check Mechanism**: The analyzer doesn't validate its own output against the deterministic validation system. If the AI misses something, there's no safety net to catch it.

## Correctness Properties

Property 1: Bug Condition - Analyzer Detects All Validation Violations

_For any_ input where the validation system detects violations (findRuleViolations returns non-empty array), the fixed Expert Analyzer SHALL return improvement items with severity: "critical" for each violation, ensuring users see all compliance issues in the ExpertFeedbackPanel UI.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation - Non-Violation Analysis Quality

_For any_ input where the validation system does NOT detect violations (findRuleViolations returns empty array), the fixed Expert Analyzer SHALL produce the same quality of analysis as the original analyzer, preserving strengths detection, non-critical suggestions, quality scoring, and timeout handling.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `server/lib/perfect-swedish-analyzer.ts`

**Class**: `ExpertAIAnalyzer`

**Specific Changes**:

1. **Import Validation Functions**: Add imports for deterministic validation
   - Import `findRuleViolations` from `./text-validation`
   - Import `UNVERIFIABLE_CLAIMS`, `HEMNET_FORBIDDEN_PATTERNS` from `./text-rules`

2. **Enhance buildAnalysisPrompt Method**: Add missing rule categories to AI prompt
   - Add UNVERIFIABLE_CLAIMS section with evidence requirements
   - Add explicit HEMNET_FORBIDDEN_PATTERNS list (not just generic description)
   - Strengthen severity language: "MUST flag as critical" instead of "should check"
   - Add instruction to check EVERY field for violations

3. **Add Pre-Analysis Validation Check**: New private method `runDeterministicValidation()`
   - Before calling OpenAI, run `findRuleViolations()` on all fields
   - Store violations in a map: `{ field: string, violations: string[] }`
   - If violations found, include them in prompt context to guide AI
   - This ensures AI is "primed" to look for specific issues

4. **Add Post-Analysis Validation Merge**: New private method `mergeValidationViolations()`
   - After AI returns analysis, cross-check with validation system
   - Run `findRuleViolations()` again on all fields
   - For each validation violation NOT found in AI improvements, add it
   - Map validation violations to FeedbackItem format with correct severity/category
   - Ensure no duplicates (check if AI already detected the violation)

5. **Update legalCheck Logic**: Ensure compliance flag reflects violations
   - If any critical violations exist (from validation OR AI), set `legalCheck.compliant = false`
   - Populate `legalCheck.issues` with list of violation types
   - Add note if violations were caught by deterministic validation

**Pseudocode for Hybrid Approach**:
```typescript
async analyze(request: AnalysisRequest): Promise<ExpertAnalysis> {
  // Step 1: Run deterministic validation BEFORE AI
  const preValidation = this.runDeterministicValidation(request);
  
  // Step 2: Enhance prompt with validation context
  const prompt = this.buildAnalysisPrompt(request, preValidation);
  
  // Step 3: Call AI with enhanced prompt
  const aiAnalysis = await this.callOpenAI(prompt);
  
  // Step 4: Merge validation violations with AI improvements
  const mergedAnalysis = this.mergeValidationViolations(aiAnalysis, preValidation);
  
  // Step 5: Update legalCheck based on all violations
  const finalAnalysis = this.updateLegalCheck(mergedAnalysis);
  
  return finalAnalysis;
}

private runDeterministicValidation(request: AnalysisRequest): ValidationResult {
  const fields = {
    improvedPrompt: request.improvedPrompt,
    headline: request.headline,
    socialCopy: request.socialCopy,
    instagramCaption: request.instagramCaption,
    showingInvitation: request.showingInvitation,
    shortAd: request.shortAd
  };
  
  const violations: Record<string, string[]> = {};
  
  for (const [field, text] of Object.entries(fields)) {
    if (text && text.length > 0) {
      const fieldViolations = findRuleViolations(text, request.platform, request.style);
      if (fieldViolations.length > 0) {
        violations[field] = fieldViolations;
      }
    }
  }
  
  return { violations, totalCount: Object.values(violations).flat().length };
}

private mergeValidationViolations(
  aiAnalysis: ExpertAnalysis,
  validation: ValidationResult
): ExpertAnalysis {
  const mergedImprovements = [...aiAnalysis.improvements];
  
  for (const [field, violations] of Object.entries(validation.violations)) {
    for (const violation of violations) {
      // Check if AI already detected this violation
      const alreadyDetected = mergedImprovements.some(item =>
        item.location === field && 
        item.issue.toLowerCase().includes(violation.toLowerCase().slice(0, 20))
      );
      
      if (!alreadyDetected) {
        // Add missing violation as critical improvement
        mergedImprovements.push({
          id: uuidv4(),
          issue: violation,
          location: field,
          suggestion: this.generateSuggestionForViolation(violation),
          category: this.categorizViolation(violation),
          severity: "critical",
          expert: this.determineExpert(violation),
          actionable: false
        });
      }
    }
  }
  
  return { ...aiAnalysis, improvements: mergedImprovements };
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that generate text with known violations (forbidden phrases, Hemnet rules, unverifiable claims, grammar errors) and assert that the Expert Analyzer returns corresponding improvement items. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Forbidden Phrase Test**: Generate text with "erbjuds" in improvedPrompt (will fail on unfixed code - AI returns empty improvements)
2. **Unverifiable Claim Test**: Generate text with "i nyskick" in socialCopy without evidence (will fail on unfixed code - AI returns empty improvements)
3. **Hemnet Economic Reference Test**: Generate text with "Kontakta mäklaren för ekonomisk information" (will fail on unfixed code - AI returns empty improvements)
4. **Grammar Error Test**: Generate text with double period ".." in headline (will fail on unfixed code - AI returns empty improvements)
5. **Multiple Fields Test**: Generate violations across all fields (improvedPrompt, socialCopy, instagramCaption, etc.) (will fail on unfixed code - AI misses violations in some fields)

**Expected Counterexamples**:
- AI returns `improvements: []` when validation detects violations
- AI returns `legalCheck.compliant: true` when critical violations exist
- AI returns non-critical suggestions but misses critical violations
- Possible causes: incomplete prompt (missing UNVERIFIABLE_CLAIMS), insufficient severity emphasis, no cross-check mechanism

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := ExpertAIAnalyzer_fixed.analyze(input)
  validationViolations := findRuleViolations(input.allFields, input.platform, input.style)
  
  // Assert: Every validation violation appears in improvements
  FOR EACH violation IN validationViolations DO
    ASSERT EXISTS improvement IN result.improvements WHERE
      improvement.severity === "critical" AND
      improvement.issue CONTAINS violation
  END FOR
  
  // Assert: legalCheck reflects violations
  IF validationViolations.length > 0 THEN
    ASSERT result.legalCheck.compliant === false
    ASSERT result.legalCheck.issues.length > 0
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  originalResult := ExpertAIAnalyzer_original.analyze(input)
  fixedResult := ExpertAIAnalyzer_fixed.analyze(input)
  
  // Assert: Analysis quality preserved
  ASSERT fixedResult.overallQuality APPROXIMATELY_EQUALS originalResult.overallQuality
  ASSERT fixedResult.strengths.length >= originalResult.strengths.length - 1
  
  // Assert: Non-critical suggestions preserved
  nonCriticalOriginal := originalResult.improvements.filter(i => i.severity !== "critical")
  nonCriticalFixed := fixedResult.improvements.filter(i => i.severity !== "critical")
  ASSERT nonCriticalFixed.length >= nonCriticalOriginal.length - 1
  
  // Assert: legalCheck preserved for clean texts
  IF originalResult.legalCheck.compliant === true THEN
    ASSERT fixedResult.legalCheck.compliant === true
  END IF
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for clean texts (no violations), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Clean Text Preservation**: Observe that clean texts (no violations) get quality analysis on unfixed code, then write test to verify this continues after fix
2. **Strengths Detection Preservation**: Observe that strengths are detected on unfixed code, then write test to verify this continues after fix
3. **Non-Critical Suggestions Preservation**: Observe that non-critical style suggestions are generated on unfixed code, then write test to verify this continues after fix
4. **Timeout Handling Preservation**: Observe that timeout returns basic analysis on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test `runDeterministicValidation()` method with various violation types
- Test `mergeValidationViolations()` method with AI analysis + validation violations
- Test `buildAnalysisPrompt()` includes UNVERIFIABLE_CLAIMS and HEMNET_FORBIDDEN_PATTERNS
- Test violation categorization (grammar vs style vs legal)
- Test duplicate detection (AI detected + validation detected same violation)
- Test legalCheck update logic when violations exist

### Property-Based Tests

- Generate random texts with forbidden phrases and verify analyzer detects them
- Generate random texts with Hemnet violations and verify analyzer detects them
- Generate random clean texts and verify analysis quality is preserved
- Generate random texts with mixed violations and non-violations across fields

### Integration Tests

- Test full analyzer flow with real OpenAI API calls (or mocked responses)
- Test analyzer integration with orchestrator (ensure violations reach UI)
- Test ExpertFeedbackPanel displays all violations correctly
- Test that validation warnings in Sentry are now also surfaced to users
