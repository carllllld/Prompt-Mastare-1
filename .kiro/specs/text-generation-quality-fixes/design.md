# Text Generation Quality Fixes Bugfix Design

## Overview

The Perfect Swedish Pipeline is experiencing critical text generation quality issues where GPT-5.2 (reasoning_effort: 'medium') is not consistently following system prompt rules, leading to validation failures, retry loops, and eventual generation failures. The root cause is a system prompt that is too long and complex (~2000+ lines), causing the AI to miss critical rules buried in the middle. Additionally, validation happens AFTER generation in validateGeneratedOutput(), creating retry loops instead of preventing errors at the source.

The fix strategy involves restructuring the system prompt to prioritize critical rules at the top, adding concrete before/after examples for each rule category, strengthening field-specific instructions in buildUserPrompt(), and adding a pre-generation checklist as a forcing function to ensure the AI reviews critical rules before writing.

## Glossary

- **Bug_Condition (C)**: The condition that triggers quality violations - when the AI generates text that violates platform rules, grammatical standards, or field-specific requirements
- **Property (P)**: The desired behavior - AI generates text that follows all critical rules on first attempt without validation failures
- **Preservation**: Existing successful generation cases, natural Swedish writing quality, and post-processor transformations that must remain unchanged
- **buildSystemPrompt()**: The function in `server/lib/perfect-swedish-generator.ts` that constructs the system prompt sent to GPT-5.2
- **buildUserPrompt()**: The function that constructs the user prompt with disposition data and output format instructions
- **validateGeneratedOutput()**: The function that validates generated text AFTER generation, detecting violations and throwing GeneratorValidationError
- **DeterministicPostProcessor**: The class in `server/lib/perfect-swedish-post-processor.ts` that applies transformations to fix minor issues after generation
- **GeneratorValidationError**: Error thrown when generated output violates platform rules or quality standards
- **Reasoning Model**: GPT-5.2 with reasoning_effort parameter that plans before writing but can miss rules if prompt is too complex

## Bug Details

### Bug Condition

The bug manifests when the AI generates text for any of the six required fields (improvedPrompt, headline, socialCopy, instagramCaption, showingInvitation, shortAd). The system prompt is too long and complex, causing the AI to miss critical rules that are buried in the middle of the prompt. The validateGeneratedOutput() function detects violations AFTER generation, creating retry loops instead of preventing errors at the source.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type GenerationRequest
  OUTPUT: boolean
  
  RETURN (
    // Headline violations
    generatedHeadline.wordCount > 9 OR
    generatedHeadline.hasTrailingPunctuation OR
    
    // Incomplete sentences
    anyField.endsWithPreposition(['via', 'och', 'med', 'i', 'på']) OR
    
    // Juridical violations
    anyField.contains(['nyskick', 'gott skick']) WITHOUT renovationYears OR
    anyField.containsTechnicalDetails WITHOUT years OR
    
    // Missing fields
    generatedShortAd.isEmpty OR
    
    // Business name leaks
    anyField.containsSpecificBusinessNames(['Willys Värmdö', 'Restaurang X']) OR
    
    // Repetitive phrases
    anyField.contains('integrerade vitvaror, uppdaterade vitvaror') OR
    
    // Platform violations (Hemnet)
    (platform == 'hemnet' AND anyField.contains(['pris', 'avgift', 'energiklass'])) OR
    (platform == 'hemnet' AND auxiliaryFields.containsEmojis) OR
    
    // Emoji overuse
    instagramCaption.emojiCount > 2 OR
    
    // Forbidden phrases
    anyField.containsForbiddenPhrases(['välkommen till', 'erbjuder', 'bjuder på'])
  )
END FUNCTION
```

### Examples

**Example 1: Headline Violation**
- Input: Disposition for 3-room apartment with renovated kitchen
- Expected: "Helrenoverad trea med balkong i söderläge" (8 words, no punctuation)
- Actual: "Välkommen till denna fantastiska helrenoverade trea med balkong i söderläge och utsikt." (13 words, trailing period)

**Example 2: Incomplete Sentence**
- Input: Disposition with showing information
- Expected: "Visning sker efter överenskommelse. Kontakta ansvarig mäklare för bokning."
- Actual: "Visning. Anmälan och frågor tas via." (incomplete, ends with preposition)

**Example 3: Juridical Violation**
- Input: Disposition contains "köket i nyskick"
- Expected: "Köket renoverades 2023 med köksö och kompositbänk."
- Actual: "Köket är i nyskick med moderna vitvaror." (vague, no renovation year)

**Example 4: Business Name Leak**
- Input: Disposition mentions "Willys Värmdö"
- Expected: "Matbutik inom 5 minuters promenad."
- Actual: "Willys Värmdö ligger inom 5 minuters promenad." (specific business name)

**Example 5: Platform Violation (Hemnet)**
- Input: Hemnet platform, disposition with price
- Expected: "Helrenoverad 3:a med balkong på Södermalm."
- Actual: "Helrenoverad 3:a med balkong på Södermalm. Avgift 4 500 kr/mån." (mentions avgift)

**Example 6: Emoji Overuse**
- Input: Instagram caption generation
- Expected: "Helrenoverat kök med köksö � Perfekt för den som söker ljus och trivsel �" (2 emojis)
- Actual: "Helrenoverat kök med köksö � Perfekt för den som söker ljus och trivsel 🌞✨🔑🎉" (5 emojis)

**Edge Case: Empty shortAd Field**
- Input: Valid disposition with all required data
- Expected: "3:a om 72 kvm med helrenoverat kök 2022 och södervända balkongen."
- Actual: "" (empty field, marker not written or parser failed)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Successful generation cases where disposition contains clear, concrete facts with renovation years must continue to produce high-quality, broker-realistic text
- Natural-sounding Swedish that passes as human-written must remain unchanged
- Post-processor transformations (placeholder removal, paragraph break enforcement, Swedish character normalization) must continue to work
- Active verbs, concrete facts, and natural broker language must remain in generated text
- Obligatory paragraph structure (4-5 paragraphs with blank lines) must continue to be followed
- Grammar error detection (double punctuation, space before punctuation, words with trailing digits) must continue to work
- Platform-specific correct behavior (Booli allows price/fee mentions, general platforms have appropriate rules) must remain unchanged
- Marker-based parsing for both Swedish (HUVUDTEXT, RUBRIK) and English (IMPROVED PROMPT, HEADLINE) variations must continue to work
- Reasoning model benefits (planning, natural writing) must be preserved
- Caching and performance (Redis caching, duration tracking, token usage monitoring) must remain unchanged
- Multi-stage pipeline (generation followed by post-processing) must continue to execute as separate stages

**Scope:**
All inputs that do NOT trigger the bug condition (well-formed dispositions with clear facts, correct AI output on first attempt) should be completely unaffected by this fix. This includes:
- Dispositions with concrete renovation years and technical details
- AI generations that follow all rules on first attempt
- Post-processor transformations that fix minor formatting issues
- Validation that passes without errors
- Successful end-to-end pipeline executions

## Hypothesized Root Cause

Based on the bug description and analysis of the code, the most likely issues are:

1. **System Prompt Complexity and Length**: The buildSystemPrompt() function generates a ~2000+ line prompt with critical rules buried in the middle. GPT-5.2 with reasoning_effort: 'medium' is planning before writing, but the sheer volume of instructions causes it to miss critical rules. The most important rules (headline word count, no trailing punctuation, no "nyskick" without years) are not emphasized enough.

2. **Lack of Concrete Examples**: The system prompt contains many rules but few concrete before/after examples. The AI needs to see "INTE: X" and "RÄTT: Y" examples for each critical rule category to understand what to avoid and what to produce.

3. **Validation After Generation**: The validateGeneratedOutput() function detects violations AFTER the AI has already generated text, creating retry loops that waste tokens and eventually fail. There's no pre-generation forcing function to make the AI review critical rules before writing.

4. **Weak Field-Specific Instructions**: The buildUserPrompt() function has generic output format instructions but doesn't emphasize field-specific requirements strongly enough (e.g., "shortAd MUST contain bostadstyp + boarea", "headline MUST be max 9 words with NO punctuation").

5. **Missing Värderande Language Detection**: The post-processor doesn't detect värderande (evaluative) language like "tydligt övertag", "uppdaterat intryck" that lacks measurable facts. These phrases slip through validation.

6. **Insufficient Business Name Generalization**: The post-processor has regex patterns for business names but doesn't catch all variations (e.g., "Willys Värmdö" with location suffix). The AI should be instructed to generalize at generation time, not rely on post-processing.

7. **Marker Instructions Complexity**: The output format instructions in buildUserPrompt() are verbose and include parenthetical notes that the AI sometimes includes in the output (e.g., "(Max 10 ord...)" appearing in extracted text).

## Correctness Properties

Property 1: Bug Condition - Text Generation Quality Compliance

_For any_ generation request where the AI produces output, the fixed buildSystemPrompt and buildUserPrompt functions SHALL generate text that follows all critical rules on first attempt: headlines with max 9 words and no trailing punctuation, complete sentences without abrupt endings, juridical compliance with renovation years instead of "nyskick", all six required fields present (including shortAd), business names generalized to categories, no repetitive phrases, platform-specific rules followed (Hemnet: no price/avgift/energiklass, no emojis in auxiliary fields), max 2 emojis in Instagram captions, and no forbidden phrases.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20**

Property 2: Preservation - Existing Quality and Functionality

_For any_ generation request where the disposition contains clear, concrete facts and the AI generates correct output, the fixed code SHALL produce exactly the same high-quality, broker-realistic text as the original code, preserving natural Swedish writing, active verbs, concrete facts, obligatory paragraph structure, post-processor transformations, platform-specific correct behavior, marker-based parsing, reasoning model benefits, caching and performance, and multi-stage pipeline execution.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18, 3.19, 3.20, 3.21**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `server/lib/perfect-swedish-generator.ts`

**Function**: `buildSystemPrompt(style: WritingStyle, platform: string): string`

**Specific Changes**:

1. **Restructure Prompt with Critical Rules First**: Move the most critical rules to the top of the prompt, immediately after the role definition. Create a "## KRITISKA REGLER - LÄS FÖRST" (CRITICAL RULES - READ FIRST) section that contains:
   - Headline: max 9 words, NO trailing punctuation
   - All 6 fields are OBLIGATORY (especially shortAd)
   - Hemnet: NO price/avgift/energiklass mentions
   - NO "nyskick" without renovation years
   - NO specific business names (generalize to categories)
   - NO forbidden phrases (välkommen till, erbjuder, bjuder på)

2. **Add Concrete Before/After Examples**: For each critical rule category, add 3-5 concrete examples showing:
   - ✗ FEL (WRONG): [bad example]
   - ✓ RÄTT (CORRECT): [good example]
   
   Examples needed for:
   - Headlines (word count, punctuation)
   - Incomplete sentences (visningsinbjudan)
   - Juridical compliance (nyskick → renovation years)
   - Business name generalization
   - Platform violations (Hemnet price/avgift)
   - Emoji usage

3. **Add Pre-Generation Checklist**: Add a "## INNAN DU SKRIVER - KONTROLLERA" (BEFORE YOU WRITE - CHECK) section at the end of the system prompt that forces the AI to review:
   - [ ] Har jag läst reglerna om max 9 ord i rubrik?
   - [ ] Har jag läst att rubrik INTE får ha punkt?
   - [ ] Har jag läst att ALLA 6 fält är obligatoriska?
   - [ ] Har jag läst Hemnet-reglerna om INGET pris/avgift?
   - [ ] Har jag läst att "nyskick" är förbjudet utan renoveringsår?
   - [ ] Har jag läst att företagsnamn ska generaliseras?

4. **Simplify and Reorganize**: Reduce total prompt length by:
   - Removing redundant explanations
   - Consolidating similar rules
   - Moving less critical rules to the end
   - Using bullet points instead of paragraphs where possible

5. **Strengthen Värderande Language Warning**: Add explicit examples of värderande language to avoid:
   - ✗ "tydligt övertag" (unless backed by concrete facts)
   - ✗ "uppdaterat intryck" (vague)
   - ✓ "Köket renoverades 2023" (concrete)
   - ✓ "Södervända balkongen ger mycket ljus" (measurable)

**Function**: `buildUserPrompt(request: GenerationRequest): string`

**Specific Changes**:

1. **Strengthen Field-Specific Requirements**: Replace generic output format instructions with explicit, emphatic requirements:
   ```
   RUBRIK (OBLIGATORISK):
   - MAX 9 ORD (räkna orden!)
   - INGEN PUNKT i slutet
   - INGA emojis
   
   KORT ANNONS (OBLIGATORISK):
   - MÅSTE innehålla bostadstyp (t.ex. "3:a", "villa")
   - MÅSTE innehålla boarea (t.ex. "72 kvm")
   - Max 2 meningar
   ```

2. **Add Field-Specific Examples**: For each field, add 1-2 concrete examples:
   ```
   VISNINGSINBJUDAN:
   Exempel: "Visning sker efter överenskommelse. Kontakta ansvarig mäklare för bokning."
   INTE: "Visning. Anmälan och frågor tas via."
   ```

3. **Simplify Marker Instructions**: Remove parenthetical notes that the AI might include in output:
   - Before: "RUBRIK:\n(Max 10 ord, ingen punkt)"
   - After: "RUBRIK:"
   
   Move all instructions to the field-specific requirements section above.

4. **Add Reminder About shortAd**: Add explicit reminder at the end:
   ```
   VIKTIGT: KORT ANNONS är OBLIGATORISK och får INTE vara tom!
   ```

**Function**: `validateGeneratedOutput(result, platform): void`

**Specific Changes**:

1. **Add Incomplete Sentence Detection**: Add validation for sentences ending with prepositions:
   ```typescript
   // Check for incomplete sentences (ending with prepositions)
   const incompletePattern = /\b(via|och|med|i|på|till|från|av|för)\s*\.?\s*$/i;
   if (incompletePattern.test(text)) {
     violations.push(`${field} ends with preposition (incomplete sentence)`);
   }
   ```

2. **Add Värderande Language Detection**: Add validation for evaluative language without facts:
   ```typescript
   // Check for värderande language without measurable facts
   const värderandePattern = /\b(tydligt övertag|uppdaterat intryck|fantastisk|underbar|härlig)\b/i;
   if (värderandePattern.test(text) && !/\d{4}|kvm|minuter|meter/.test(text)) {
     violations.push(`${field} contains värderande language without concrete facts`);
   }
   ```

3. **Improve Business Name Detection**: Expand business name patterns to catch location suffixes:
   ```typescript
   // Swedish grocery chains with optional location
   const groceryPattern = /\b(Willys|ICA|Coop|Hemköp|City Gross|Lidl)(\s+[A-ZÅÄÖ][a-zåäö]+)?\b/gi;
   ```

**File**: `server/lib/perfect-swedish-post-processor.ts`

**Function**: `cleanupGrammarErrors(request, transformations): PostProcessRequest`

**Specific Changes**:

1. **Add Värderande Language Detection**: Add detection (not auto-fix) for värderande language:
   ```typescript
   // Detect värderande language without concrete facts
   const värderandePattern = /\b(tydligt övertag|uppdaterat intryck|fantastisk|underbar|härlig)\b/i;
   if (värderandePattern.test(text) && !/\d{4}|kvm|minuter|meter/.test(text)) {
     console.warn('[VÄRDERANDE_LANGUAGE_DETECTED]', {
       field,
       text: text.substring(0, 100),
       timestamp: new Date().toISOString()
     });
     transformations.push({
       type: 'narrative_integrity',
       field,
       before: 'Värderande language without facts detected',
       after: 'Manual review recommended'
     });
   }
   ```

2. **Improve Incomplete Sentence Detection**: Strengthen the incomplete sentence detection to catch more patterns:
   ```typescript
   // Detect incomplete sentences ending with prepositions
   const incompletePattern = /\b(via|och|med|i|på|till|från|av|för)\s*\.?\s*$/i;
   if (incompletePattern.test(text)) {
     console.warn('[INCOMPLETE_SENTENCE_DETECTED]', {
       field,
       text: text.substring(0, 100),
       timestamp: new Date().toISOString()
     });
   }
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that generate text using the UNFIXED buildSystemPrompt and buildUserPrompt functions with dispositions designed to trigger each bug category. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:

1. **Headline Violation Test**: Generate text for a 3-room apartment with many features. Assert headline has max 9 words and no trailing punctuation. (will fail on unfixed code - expect 13+ words or trailing period)

2. **Incomplete Sentence Test**: Generate text with minimal showing information. Assert visningsinbjudan ends with complete sentence, not preposition. (will fail on unfixed code - expect "tas via." or similar)

3. **Juridical Violation Test**: Generate text for disposition containing "köket i nyskick" without renovation years. Assert generated text uses concrete years or neutral language, not "nyskick". (will fail on unfixed code - expect "i nyskick" in output)

4. **Missing shortAd Test**: Generate text for valid disposition. Assert shortAd field is not empty and contains bostadstyp + boarea. (will fail on unfixed code - expect empty shortAd)

5. **Business Name Leak Test**: Generate text for disposition mentioning "Willys Värmdö". Assert generated text uses "matbutik" instead. (will fail on unfixed code - expect "Willys Värmdö" in output)

6. **Repetitive Vitvaror Test**: Generate text for disposition with appliance details. Assert no repetitive phrases like "integrerade vitvaror, uppdaterade vitvaror". (will fail on unfixed code - expect repetition)

7. **Hemnet Platform Violation Test**: Generate text for Hemnet platform with disposition containing price. Assert no price/avgift/energiklass mentions in any field. (will fail on unfixed code - expect price mentions)

8. **Hemnet Emoji Violation Test**: Generate text for Hemnet platform. Assert no emojis in headline, socialCopy, showingInvitation, shortAd. (will fail on unfixed code - expect emojis in auxiliary fields)

9. **Instagram Emoji Overuse Test**: Generate Instagram caption. Assert max 2 emojis. (will fail on unfixed code - expect 3-5 emojis)

10. **Forbidden Phrase Test**: Generate text for any disposition. Assert no forbidden phrases like "välkommen till", "erbjuder", "bjuder på". (will fail on unfixed code - expect forbidden phrases)

**Expected Counterexamples**:
- Headlines with 13-31 words instead of max 9
- Headlines with trailing periods or exclamation marks
- Incomplete sentences ending with "via.", "och.", "med."
- "Nyskick" or "gott skick" without renovation years
- Empty shortAd field
- Specific business names like "Willys Värmdö" instead of "matbutik"
- Repetitive phrases like "integrerade vitvaror, uppdaterade vitvaror"
- Price/avgift mentions in Hemnet fields
- Emojis in Hemnet auxiliary fields
- 3-5 emojis in Instagram captions
- Forbidden phrases like "välkommen till denna fantastiska"

Possible causes: System prompt too long and complex, critical rules buried in middle, lack of concrete examples, weak field-specific instructions, no pre-generation checklist.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := generate_fixed(request)
  ASSERT expectedBehavior(result)
END FOR
```

**Expected Behavior:**
- Headlines have max 9 words and no trailing punctuation
- All sentences are complete (no abrupt endings with prepositions)
- No "nyskick" without renovation years (use concrete years or neutral language)
- All 6 fields present, including shortAd with bostadstyp + boarea
- Business names generalized to categories
- No repetitive phrases
- Platform rules followed (Hemnet: no price/avgift/energiklass, no emojis in auxiliary fields)
- Max 2 emojis in Instagram captions
- No forbidden phrases

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT generate_original(request) = generate_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for successful generation cases, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Successful Generation Preservation**: Observe that dispositions with clear, concrete facts and renovation years generate high-quality text on unfixed code, then write test to verify this continues after fix

2. **Natural Swedish Preservation**: Observe that generated text sounds natural and broker-realistic on unfixed code, then write test to verify this continues after fix

3. **Post-Processor Preservation**: Observe that post-processor transformations (placeholder removal, paragraph breaks, Swedish character normalization) work correctly on unfixed code, then write test to verify this continues after fix

4. **Platform-Specific Preservation**: Observe that Booli platform allows price/fee mentions and general platforms have appropriate rules on unfixed code, then write test to verify this continues after fix

5. **Marker Parsing Preservation**: Observe that marker-based parsing works for both Swedish and English variations on unfixed code, then write test to verify this continues after fix

6. **Reasoning Model Preservation**: Observe that GPT-5.2 with reasoning_effort: 'medium' produces natural, planned text on unfixed code, then write test to verify this continues after fix

7. **Performance Preservation**: Observe that caching, duration tracking, and token usage monitoring work correctly on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test buildSystemPrompt() returns prompt with critical rules section at top
- Test buildSystemPrompt() includes concrete before/after examples for each rule category
- Test buildSystemPrompt() includes pre-generation checklist
- Test buildUserPrompt() includes strengthened field-specific requirements
- Test buildUserPrompt() includes field-specific examples
- Test validateGeneratedOutput() detects incomplete sentences ending with prepositions
- Test validateGeneratedOutput() detects värderande language without facts
- Test validateGeneratedOutput() detects business names with location suffixes
- Test post-processor cleanupGrammarErrors() detects värderande language
- Test post-processor cleanupGrammarErrors() detects incomplete sentences

### Property-Based Tests

- Generate random dispositions with various feature combinations and verify all 9 bug categories are fixed (headlines, incomplete sentences, juridical compliance, missing fields, business names, repetitive phrases, platform violations, emoji overuse, forbidden phrases)
- Generate random dispositions with clear facts and renovation years and verify generated text quality is preserved (natural Swedish, active verbs, concrete facts, paragraph structure)
- Generate random platform configurations (Hemnet, Booli, general) and verify platform-specific rules are followed correctly
- Test across many scenarios that post-processor transformations continue to work correctly

### Integration Tests

- Test full generation pipeline with disposition designed to trigger headline violations, verify fix prevents violations
- Test full generation pipeline with disposition containing "nyskick", verify fix uses renovation years instead
- Test full generation pipeline with disposition mentioning specific business names, verify fix generalizes to categories
- Test full generation pipeline for Hemnet platform with price in disposition, verify fix prevents price mentions
- Test full generation pipeline for successful cases, verify quality and functionality are preserved
- Test that validation errors are reduced (fewer GeneratorValidationError exceptions thrown)
- Test that retry loops are eliminated (generation succeeds on first attempt)
