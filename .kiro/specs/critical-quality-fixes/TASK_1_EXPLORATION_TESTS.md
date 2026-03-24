# Task 1: Bug Condition Exploration Tests - Implementation Summary

## Status: ✅ COMPLETE

**File Created:** `server/tests/critical-quality-fixes-exploration.test.ts`

## Overview

Created comprehensive bug condition exploration tests that are **EXPECTED TO FAIL** on the unfixed code. These tests document the bugs and will validate the fix when they pass after implementation.

## Test Coverage

### Bug Condition 1: Grammar Errors (Requirements 1.1-1.3)

**3 test cases:**

1. **Double Punctuation (..)** - Test case: "Slussen.."
   - Validates: Requirement 1.1
   - Expected behavior: No double punctuation after post-processing
   - Checks: `improvedPrompt`, `socialCopy`, `headline` fields

2. **Space Before Punctuation** - Test case: "visning ."
   - Validates: Requirement 1.2
   - Expected behavior: No space before punctuation marks
   - Checks: All text fields for pattern `/\s+\./`

3. **Broken Sentences** - Test case: "Nya fönster och tjärpappstak är två tydliga plus prioriterar långsiktigt underhåll."
   - Validates: Requirement 1.3
   - Expected behavior: Validation detects missing punctuation between clauses
   - Checks: `findRuleViolations()` detects broken sentence structure

### Bug Condition 2: Emoji Violations (Requirements 1.4-1.5)

**5 test cases:**

1. **Hemnet socialCopy** - Test case: "🌞🛁" in socialCopy
   - Validates: Requirement 1.4
   - Expected behavior: All emojis removed from Hemnet socialCopy
   - Platform: hemnet

2. **Hemnet headline** - Test case: "🌞" in headline
   - Validates: Requirement 1.4
   - Expected behavior: All emojis removed from Hemnet headline
   - Platform: hemnet

3. **Hemnet showingInvitation** - Test case: "🏡" in showingInvitation
   - Validates: Requirement 1.4
   - Expected behavior: All emojis removed from Hemnet showingInvitation
   - Platform: hemnet

4. **Hemnet shortAd** - Test case: "🌞" in shortAd
   - Validates: Requirement 1.4
   - Expected behavior: All emojis removed from Hemnet shortAd
   - Platform: hemnet

5. **Instagram Caption Limit** - Test case: "🌞🛁🏡✨" (4 emojis)
   - Validates: Requirement 1.5
   - Expected behavior: Max 2 emojis retained, excess removed
   - Checks: Emoji count ≤ 2 after processing

### Bug Condition 3: Specific Business Names (Requirements 1.6-1.7)

**5 test cases:**

1. **"Kikka" Restaurant** - Test case: "Närområdet har Kikka"
   - Validates: Requirement 1.6
   - Expected behavior: "Kikka" replaced with generic term "restauranger"
   - Checks: Text does not contain "kikka" (case-insensitive)

2. **"COME 2 EAT"** - Test case: "COME 2 EAT ligger runt hörnet"
   - Validates: Requirement 1.6
   - Expected behavior: Replaced with "restauranger" or "matställen"
   - Checks: Pattern `/come 2 eat/i` not found

3. **"ChopChop Asian Express"** - Test case: "ChopChop Asian Express finns i närområdet"
   - Validates: Requirement 1.6
   - Expected behavior: Replaced with generic term
   - Checks: Pattern `/chopchop asian express/i` not found

4. **"Restaurang X" Pattern** - Test case: "Restaurang Gondolen och Restaurang Pelikan"
   - Validates: Requirement 1.7
   - Expected behavior: Pattern generalized to "restauranger"
   - Checks: Pattern `/Restaurang\s+[A-ZÅÄÖ][a-zåäö]+/` not found

5. **"Kafé X" Pattern** - Test case: "Kafé Saturnus och Kafé Pascal"
   - Validates: Requirement 1.7
   - Expected behavior: Pattern generalized to "kaféer"
   - Checks: Pattern `/Kafé\s+[A-ZÅÄÖ][a-zåäö]+/` not found

### Bug Condition 4: Mechanical Text Style (Requirements 1.8-1.9)

**2 test cases:**

1. **Mechanical Listing Style** - Test case: "Willys Värmdö (matbutik). Kikka (restaurang)."
   - Validates: Requirement 1.8
   - Expected behavior: Validation detects mechanical bullet-point style
   - Checks: `findRuleViolations()` flags mechanical patterns

2. **Bullet Points in Prose** - Test case: "- Renoverat kök\n- Helkaklat badrum"
   - Validates: Requirement 1.9
   - Expected behavior: Validation detects bullet points in main text
   - Checks: Bullet point patterns flagged as violations

### Bug Condition 5: Unverifiable Claims (Requirements 1.10)

**2 test cases:**

1. **"Nyskick" Without Evidence** - Test case: "genomgående nyskick" with no renovation data
   - Validates: Requirement 1.10
   - Expected behavior: Validation flags unverifiable condition claim
   - Checks: `findRuleViolations()` detects "nyskick" without evidence

2. **"Nyskick" WITH Evidence** - Test case: "nyskick efter totalrenovering 2023"
   - Validates: Requirement 1.10 (negative case)
   - Expected behavior: No violation when renovation evidence exists
   - Checks: Claim is acceptable with supporting data

### Integration Test

**1 comprehensive test:**

**Multiple Quality Issues** - Test case combining:
- Double punctuation: "Slussen.."
- Specific business names: "Kikka", "COME 2 EAT"
- Space before punctuation: " ."
- Emojis in Hemnet socialCopy: "🌞🛁"
- Excess Instagram emojis: "🌞🛁🏡✨🌿"

Expected behavior: All issues fixed in single pass through post-processor

## Test Structure

### Test Organization

```typescript
describe('Bug Condition 1: Grammar Errors', () => {
  it('1.1 should detect and fix double punctuation', async () => { ... });
  it('1.2 should detect and fix space before punctuation', async () => { ... });
  it('1.3 should detect broken sentences', () => { ... });
});

describe('Bug Condition 2: Emoji Violations', () => { ... });
describe('Bug Condition 3: Specific Business Names', () => { ... });
describe('Bug Condition 4: Mechanical Text Style', () => { ... });
describe('Bug Condition 5: Unverifiable Claims', () => { ... });
describe('Integration: Complete Quality Pipeline', () => { ... });
```

### Test Methodology

1. **Concrete Failing Cases**: Each test uses specific, reproducible examples from the bug description
2. **Expected Behavior Assertions**: Tests encode the correct behavior from design document
3. **Transformation Logging**: Tests verify that transformations are logged for observability
4. **Multiple Field Coverage**: Tests check all relevant fields (improvedPrompt, socialCopy, headline, etc.)

## Expected Test Results (Unfixed Code)

### Tests Expected to FAIL (Bugs Exist)

These tests will fail on unfixed code, confirming the bugs:

1. ✗ Grammar: Double punctuation cleanup
2. ✗ Grammar: Space before punctuation cleanup
3. ✗ Grammar: Broken sentence detection
4. ✗ Emoji: Hemnet socialCopy emoji removal
5. ✗ Emoji: Hemnet headline emoji removal
6. ✗ Emoji: Hemnet showingInvitation emoji removal
7. ✗ Emoji: Hemnet shortAd emoji removal
8. ✗ Emoji: Instagram caption emoji limit
9. ✗ Business Names: "Kikka" generalization
10. ✗ Business Names: "COME 2 EAT" generalization
11. ✗ Business Names: "ChopChop Asian Express" generalization
12. ✗ Business Names: "Restaurang X" pattern generalization
13. ✗ Business Names: "Kafé X" pattern generalization
14. ✗ Mechanical Style: Bullet-point style detection
15. ✗ Mechanical Style: Bullet points in prose detection
16. ✗ Unverifiable Claims: "nyskick" without evidence detection
17. ✗ Integration: Multiple quality issues fixed

### Tests Expected to PASS (Correct Behavior)

1. ✓ Unverifiable Claims: "nyskick" WITH evidence (should not be flagged)

## Counterexamples to Document

When tests are run, the following counterexamples will be surfaced:

### Grammar Errors
- **Input:** "Slussen.." → **Current Output:** "Slussen.." (not cleaned)
- **Input:** "visning ." → **Current Output:** "visning ." (not cleaned)
- **Input:** Broken sentence → **Current Output:** Not detected by validation

### Emoji Violations
- **Input:** Hemnet socialCopy with "🌞🛁" → **Current Output:** Emojis not removed
- **Input:** Instagram with 4 emojis → **Current Output:** All 4 emojis retained (should be 2)

### Business Names
- **Input:** "Kikka" → **Current Output:** "Kikka" (not generalized)
- **Input:** "Restaurang Gondolen" → **Current Output:** "Restaurang Gondolen" (not generalized)

### Mechanical Style
- **Input:** "X (type). Y (type)." → **Current Output:** Not detected as mechanical
- **Input:** Bullet points in prose → **Current Output:** Not flagged

### Unverifiable Claims
- **Input:** "nyskick" without evidence → **Current Output:** Not flagged as unverifiable

## Root Cause Hypotheses

Based on test design, the likely root causes are:

1. **Post-processor lacks aggressive grammar cleanup** - No double punctuation or space-before-punctuation removal
2. **Emoji removal not comprehensive** - Hemnet fields not checked for emojis
3. **Business name patterns incomplete** - Specific restaurant names not in generalization patterns
4. **Mechanical style not detected** - No validation rules for bullet-point patterns
5. **Unverifiable claims not validated** - No cross-check between claims and disposition evidence

## Next Steps

1. **Run tests** to confirm failures and document exact counterexamples
2. **Analyze failures** to validate or refute root cause hypotheses
3. **Proceed to Task 2** (Preservation Tests) before implementing fixes
4. **Implement fixes** in Phase 3 (Tasks 3.1-3.3)
5. **Re-run tests** to verify fixes work (tests should pass)

## Notes

- Tests use `vitest` framework consistent with existing test suite
- Tests follow existing patterns from `post-processor.test.ts` and `validation-functions.test.ts`
- All test cases are deterministic and reproducible
- Tests are scoped to concrete failing cases to ensure reproducibility
- Tests validate both post-processor cleanup AND validation detection

## Command to Run Tests

```bash
npm run test -- server/tests/critical-quality-fixes-exploration.test.ts --run
```

Or with vitest directly:

```bash
npx vitest run --config server/vitest.config.ts server/tests/critical-quality-fixes-exploration.test.ts
```
