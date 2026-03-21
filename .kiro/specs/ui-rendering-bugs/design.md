# UI Rendering Bugs Bugfix Design

## Overview

Two critical UI rendering bugs prevent users from experiencing the full v2.9.0 feature set. Bug 1 causes paragraph breaks to be stripped from generated text, making it unreadable. Bug 2 prevents the expert feedback panel from displaying, hiding AI-generated improvement suggestions. Both bugs are frontend-only issues - the backend correctly generates and sends all data. The fixes are surgical: replace `innerText` with `textContent` in TextEditor, and add proper TypeScript typing for `expertAnalysis` in the schema.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug
  - Bug 1: Text contains `\n\n` paragraph breaks AND TextEditor uses `innerText` API
  - Bug 2: Backend sends `expertAnalysis` AND ResultSection uses type casting `(result as any).expertAnalysis`
- **Property (P)**: The desired behavior when the bug condition holds
  - Bug 1: Paragraph breaks are preserved and displayed as visual spacing
  - Bug 2: Expert feedback panel renders with all improvement suggestions
- **Preservation**: Existing functionality that must remain unchanged
  - Text editing, AI rewrite toolbar, undo/redo, copy/export, graceful degradation
- **innerText**: DOM API that normalizes whitespace and strips `\n\n` breaks (buggy behavior)
- **textContent**: DOM API that preserves all whitespace including `\n\n` breaks (correct behavior)
- **contentEditable**: HTML attribute that makes a div editable like a textarea
- **expertAnalysis**: Backend response field containing AI-generated feedback items with text spans, severity, and auto-fix suggestions
- **textSpan**: Object with `{ start: number, end: number, field: string }` identifying the exact location of a feedback item in the text

## Bug Details

### Bug 1: Paragraph Breaks Missing

#### Bug Condition

The bug manifests when the backend generates text with `\n\n` paragraph breaks (enforced by `enforceParagraphBreaks()` in the post-processor) but the TextEditor component strips them during rendering and editing. The component uses the `innerText` DOM API which normalizes whitespace, converting `\n\n` into single spaces or line breaks.

**Formal Specification:**
```
FUNCTION isBugCondition1(input)
  INPUT: input of type { text: string, component: 'TextEditor' }
  OUTPUT: boolean
  
  RETURN input.text.includes('\n\n')
         AND component uses innerText API for sync or input handling
         AND paragraph breaks are not visible in rendered output
END FUNCTION
```

#### Examples

- **Example 1**: Backend sends `"Köket renoverades 2020.\n\nVardagsrummet har parkettgolv."` → TextEditor displays `"Köket renoverades 2020. Vardagsrummet har parkettgolv."` (no paragraph break)
- **Example 2**: User edits text in contentEditable div → `handleInput` uses `innerText` → paragraph breaks are lost on every keystroke
- **Example 3**: TextEditor syncs prop changes using `editorRef.current.innerText = text` → `\n\n` breaks are stripped during sync
- **Edge case**: Text with single `\n` (line break) should be preserved as-is, only `\n\n` (paragraph break) is affected

### Bug 2: Expert Feedback Panel Disappeared

#### Bug Condition

The bug manifests when the backend sends `expertAnalysis` in the API response (verified in routes.ts line 3480) but the ResultSection component accesses it with type casting `(result as any).expertAnalysis`. This works at runtime but indicates the field is missing from the TypeScript schema, causing potential conditional logic issues and preventing proper type checking.

**Formal Specification:**
```
FUNCTION isBugCondition2(input)
  INPUT: input of type { result: OptimizeResponse, hasExpertAnalysis: boolean }
  OUTPUT: boolean
  
  RETURN input.hasExpertAnalysis === true
         AND result.expertAnalysis is accessed via type casting
         AND expertAnalysis field is missing from optimizeResponseSchema
         AND ExpertFeedbackPanel may not render due to type mismatch
END FUNCTION
```

#### Examples

- **Example 1**: Backend sends `expertAnalysis` with 3 improvements → ResultSection uses `(result as any).expertAnalysis` → TypeScript doesn't validate the field → potential runtime errors
- **Example 2**: `expertAnalysis.improvements` array exists → ExpertFeedbackPanel should render → but conditional logic `expertAnalysis && expertAnalysis.improvements && expertAnalysis.improvements.length > 0` may fail due to type issues
- **Example 3**: InlineHighlights component expects `feedback` prop → receives `expertAnalysis.improvements` → colored text spans should appear → but may not render if type mismatch causes undefined values
- **Edge case**: `expertAnalysis` is null or undefined → UI should gracefully degrade to show TextEditor without InlineHighlights (this should continue working)

## Expected Behavior

### Bug 1: Paragraph Breaks Preserved

**Correct Behavior:**
When the backend generates text with `\n\n` paragraph breaks, the TextEditor component SHALL preserve and display them as visual paragraph spacing. The component SHALL use `textContent` instead of `innerText` for all DOM operations (sync, input handling, undo/redo).

**Implementation:**
- Replace `editorRef.current.innerText = text` with `editorRef.current.textContent = text` (3 occurrences)
- Replace `editorRef.current.innerText` with `editorRef.current.textContent` in `handleInput` (1 occurrence)
- Ensure `whitespace-pre-wrap` CSS is applied to preserve `\n\n` as visual breaks

### Bug 2: Expert Feedback Panel Visible

**Correct Behavior:**
When the backend sends `expertAnalysis` in the API response, the ResultSection component SHALL access it directly as `result.expertAnalysis` without type casting. The ExpertFeedbackPanel SHALL render below the main text editor when improvements exist. InlineHighlights SHALL render colored text spans for each feedback item.

**Implementation:**
- Add `expertAnalysis` field to `optimizeResponseSchema` in `shared/schema.ts`
- Remove type casting `(result as any).expertAnalysis` in ResultSection
- Ensure conditional rendering logic works correctly with proper typing

### Preservation Requirements

**Unchanged Behaviors:**
- Text editing: Direct editing in contentEditable div must continue to work
- AI rewrite toolbar: Selecting text and using quick actions must continue to work
- Undo/redo: Cmd+Z / Cmd+Shift+Z keyboard shortcuts must continue to work
- Copy/export: Copy buttons and PDF export must continue to include all content
- Graceful degradation: When `expertAnalysis` is null/undefined, show TextEditor without InlineHighlights

**Scope:**
All inputs that do NOT involve paragraph breaks or expert analysis should be completely unaffected by these fixes. This includes:
- Single line breaks (`\n`) should continue to work as before
- Text without any line breaks should continue to work as before
- Results without `expertAnalysis` should continue to show TextEditor normally
- All other result fields (headline, socialCopy, etc.) should continue to render correctly

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

### Bug 1: innerText API Behavior

1. **Whitespace Normalization**: The `innerText` API is designed to return "rendered" text, which means it normalizes whitespace according to CSS rules. This converts `\n\n` (two newlines) into a single space or line break, stripping paragraph breaks.

2. **Sync Operation**: TextEditor syncs prop changes using `editorRef.current.innerText = text` in the `useEffect` hook (line 127). This strips `\n\n` breaks every time the text prop changes.

3. **Input Handling**: The `handleInput` function uses `editorRef.current.innerText` to read edited text (line 119). This strips `\n\n` breaks on every keystroke.

4. **Undo/Redo**: The undo/redo functions use `editorRef.current.innerText = prev/next` (lines 96, 107). This strips `\n\n` breaks when navigating history.

### Bug 2: Missing Schema Field

1. **Type Casting Workaround**: ResultSection uses `(result as any).expertAnalysis` (line 115) to bypass TypeScript's type checking. This indicates the field is missing from the `OptimizeResponse` type.

2. **Schema Definition**: The `optimizeResponseSchema` in `shared/schema.ts` does not include an `expertAnalysis` field, even though the backend sends it in the response (routes.ts line 3480).

3. **Conditional Logic**: The conditional rendering logic `expertAnalysis && expertAnalysis.improvements && expertAnalysis.improvements.length > 0` (line 598) works at runtime but lacks type safety, potentially causing issues if the structure changes.

4. **Type Inference**: Without proper schema definition, TypeScript cannot infer the correct type for `expertAnalysis`, leading to potential runtime errors and poor developer experience.

## Correctness Properties

Property 1: Bug Condition 1 - Paragraph Breaks Preserved

_For any_ text input where paragraph breaks (`\n\n`) are present, the fixed TextEditor component SHALL preserve and display them as visual paragraph spacing using the `textContent` API, ensuring readable multi-paragraph text.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 2: Bug Condition 2 - Expert Feedback Panel Visible

_For any_ API response where `expertAnalysis` exists with a non-empty improvements array, the fixed ResultSection component SHALL render the ExpertFeedbackPanel and InlineHighlights components without type casting, displaying all AI-generated improvement suggestions.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

Property 3: Preservation - Text Editing Features

_For any_ user interaction with the TextEditor (direct editing, AI rewrite, undo/redo), the fixed code SHALL produce exactly the same behavior as the original code, preserving all editing functionality while maintaining paragraph breaks.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

Property 4: Preservation - Display and Export

_For any_ copy or export operation (copy buttons, PDF export, CopyCard display), the fixed code SHALL produce exactly the same output as the original code, preserving all content including paragraph breaks and formatting.

**Validates: Requirements 5.5, 5.6, 5.7**

Property 5: Preservation - Graceful Degradation

_For any_ API response where `expertAnalysis` is null, undefined, or has zero improvements, the fixed code SHALL produce exactly the same behavior as the original code, showing TextEditor without InlineHighlights and not rendering an empty ExpertFeedbackPanel.

**Validates: Requirements 5.8, 5.9, 5.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

#### Bug 1: Replace innerText with textContent

**File**: `client/src/components/TextEditor.tsx`

**Function**: Multiple locations in the component

**Specific Changes**:

1. **Sync Operation (Line 127)**: Replace `innerText` with `textContent`
   ```typescript
   // BEFORE
   if (editorRef.current && editorRef.current.innerText !== text) {
     editorRef.current.innerText = text;
   }
   
   // AFTER
   if (editorRef.current && editorRef.current.textContent !== text) {
     editorRef.current.textContent = text;
   }
   ```

2. **Input Handling (Line 119)**: Replace `innerText` with `textContent`
   ```typescript
   // BEFORE
   const newText = editorRef.current.innerText || '';
   
   // AFTER
   const newText = editorRef.current.textContent || '';
   ```

3. **Undo Operation (Line 96)**: Replace `innerText` with `textContent`
   ```typescript
   // BEFORE
   if (editorRef.current) editorRef.current.innerText = prev;
   
   // AFTER
   if (editorRef.current) editorRef.current.textContent = prev;
   ```

4. **Redo Operation (Line 107)**: Replace `innerText` with `textContent`
   ```typescript
   // BEFORE
   if (editorRef.current) editorRef.current.innerText = next;
   
   // AFTER
   if (editorRef.current) editorRef.current.textContent = next;
   ```

5. **AI Rewrite Success (Line 152)**: Replace `innerText` with `textContent`
   ```typescript
   // BEFORE
   if (editorRef.current) editorRef.current.innerText = data.newFullText;
   
   // AFTER
   if (editorRef.current) editorRef.current.textContent = data.newFullText;
   ```

6. **Add Comment**: Add explanatory comment at the top of the component
   ```typescript
   // CRITICAL: Use textContent (not innerText) to preserve \n\n paragraph breaks.
   // innerText normalizes whitespace and strips paragraph breaks.
   ```

#### Bug 2: Add expertAnalysis to Schema

**File**: `shared/schema.ts`

**Location**: Inside `optimizeResponseSchema` definition (after line 200)

**Specific Changes**:

1. **Add expertAnalysis Field**: Add the field to the schema with proper Zod validation
   ```typescript
   expertAnalysis: z.object({
     overallQuality: z.number(),
     strengths: z.array(z.string()),
     improvements: z.array(z.object({
       id: z.string(),
       issue: z.string(),
       location: z.string(),
       textSpan: z.object({ 
         start: z.number(), 
         end: z.number(), 
         field: z.string() 
       }).optional(),
       suggestion: z.string(),
       category: z.enum(['grammar', 'style', 'legal', 'broker_realism', 'clarity']),
       severity: z.enum(['critical', 'important', 'suggestion']),
       expert: z.enum(['broker', 'lawyer']),
       actionable: z.boolean(),
       autoFix: z.string().optional(),
     })),
     legalCheck: z.object({
       compliant: z.boolean(),
       notes: z.string(),
       issues: z.array(z.string()),
     }),
     duration: z.number(),
   }).optional(),
   ```

2. **Remove Type Casting**: Update ResultSection to use proper typing
   ```typescript
   // BEFORE (line 115 in ResultSection.tsx)
   const expertAnalysis = (result as any).expertAnalysis || null;
   
   // AFTER
   const expertAnalysis = result.expertAnalysis || null;
   ```

3. **Verify Conditional Logic**: Ensure all conditional checks work with proper typing
   - Line 598: `expertAnalysis && expertAnalysis.improvements && expertAnalysis.improvements.length > 0`
   - Line 545: `expertAnalysis && expertAnalysis.improvements && expertAnalysis.improvements.length > 0`
   - These should work correctly once proper typing is in place

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fixes. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

#### Bug 1: Paragraph Breaks Test Plan

**Test Plan**: Create test cases that generate text with `\n\n` paragraph breaks and verify they are stripped by the unfixed TextEditor component. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Sync Test**: Set text prop with `\n\n` breaks → verify TextEditor strips them during sync (will fail on unfixed code)
2. **Input Test**: Type in contentEditable div → verify `handleInput` strips `\n\n` breaks (will fail on unfixed code)
3. **Undo Test**: Make edit, then undo → verify undo strips `\n\n` breaks (will fail on unfixed code)
4. **Redo Test**: Undo, then redo → verify redo strips `\n\n` breaks (will fail on unfixed code)
5. **AI Rewrite Test**: Apply AI rewrite with `\n\n` in result → verify rewrite strips breaks (will fail on unfixed code)

**Expected Counterexamples**:
- Text with `\n\n` paragraph breaks is displayed as continuous text without visual spacing
- Possible causes: `innerText` API normalizes whitespace, `textContent` API preserves whitespace

#### Bug 2: Expert Feedback Test Plan

**Test Plan**: Create test cases that send `expertAnalysis` in the API response and verify the ExpertFeedbackPanel renders correctly. Run these tests on the UNFIXED code to observe type casting issues.

**Test Cases**:
1. **Schema Test**: Verify `expertAnalysis` field is missing from `optimizeResponseSchema` (will fail on unfixed code)
2. **Type Casting Test**: Verify ResultSection uses `(result as any).expertAnalysis` (will fail on unfixed code)
3. **Render Test**: Send `expertAnalysis` with improvements → verify ExpertFeedbackPanel renders (may fail on unfixed code)
4. **InlineHighlights Test**: Send `expertAnalysis` with textSpans → verify colored highlights appear (may fail on unfixed code)

**Expected Counterexamples**:
- Type casting `(result as any).expertAnalysis` bypasses TypeScript validation
- Possible causes: missing schema field, incorrect conditional logic

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

#### Bug 1: Paragraph Breaks Fix Checking

**Pseudocode:**
```
FOR ALL text WHERE text.includes('\n\n') DO
  result := TextEditor_fixed.render(text)
  ASSERT result.displays_paragraph_breaks === true
  ASSERT result.visual_spacing_visible === true
END FOR

FOR ALL edit_operation IN [sync, input, undo, redo, rewrite] DO
  text_with_breaks := "Para 1\n\nPara 2"
  result := TextEditor_fixed[edit_operation](text_with_breaks)
  ASSERT result.preserves_breaks === true
END FOR
```

#### Bug 2: Expert Feedback Fix Checking

**Pseudocode:**
```
FOR ALL response WHERE response.expertAnalysis EXISTS DO
  result := ResultSection_fixed.render(response)
  ASSERT result.expertAnalysis_typed_correctly === true
  ASSERT result.no_type_casting === true
  
  IF response.expertAnalysis.improvements.length > 0 THEN
    ASSERT result.ExpertFeedbackPanel_rendered === true
    ASSERT result.InlineHighlights_rendered === true
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

#### Bug 1: Text Editing Preservation

**Pseudocode:**
```
FOR ALL text WHERE NOT text.includes('\n\n') DO
  ASSERT TextEditor_original(text) = TextEditor_fixed(text)
END FOR

FOR ALL user_interaction IN [direct_edit, ai_rewrite, undo, redo] DO
  text_without_breaks := "Single paragraph text"
  ASSERT TextEditor_original[user_interaction](text_without_breaks) 
       = TextEditor_fixed[user_interaction](text_without_breaks)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for text without `\n\n` breaks, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Single Line Text**: Verify text without line breaks continues to work
2. **Single Line Break**: Verify text with `\n` (not `\n\n`) continues to work
3. **Empty Text**: Verify empty string continues to work
4. **Special Characters**: Verify text with special characters continues to work

#### Bug 2: Display and Export Preservation

**Pseudocode:**
```
FOR ALL response WHERE response.expertAnalysis IS NULL OR UNDEFINED DO
  ASSERT ResultSection_original(response) = ResultSection_fixed(response)
END FOR

FOR ALL response WHERE response.expertAnalysis.improvements.length === 0 DO
  ASSERT ResultSection_original(response).ExpertFeedbackPanel_rendered === false
  ASSERT ResultSection_fixed(response).ExpertFeedbackPanel_rendered === false
END FOR

FOR ALL operation IN [copy, export, display] DO
  ASSERT ResultSection_original[operation](response) 
       = ResultSection_fixed[operation](response)
END FOR
```

**Test Plan**: Observe behavior on UNFIXED code first for responses without `expertAnalysis`, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Null expertAnalysis**: Verify graceful degradation continues to work
2. **Undefined expertAnalysis**: Verify graceful degradation continues to work
3. **Empty improvements**: Verify ExpertFeedbackPanel doesn't render
4. **Copy/Export**: Verify all copy and export operations continue to work

### Unit Tests

#### Bug 1: TextEditor Unit Tests
- Test `textContent` preserves `\n\n` breaks during sync
- Test `textContent` preserves `\n\n` breaks during input handling
- Test `textContent` preserves `\n\n` breaks during undo/redo
- Test `textContent` preserves `\n\n` breaks during AI rewrite
- Test edge cases: empty text, single `\n`, multiple `\n\n\n`

#### Bug 2: ResultSection Unit Tests
- Test `expertAnalysis` field is properly typed in schema
- Test ResultSection accesses `result.expertAnalysis` without type casting
- Test ExpertFeedbackPanel renders when improvements exist
- Test InlineHighlights renders colored spans for each feedback item
- Test graceful degradation when `expertAnalysis` is null/undefined

### Property-Based Tests

#### Bug 1: TextEditor Property Tests
- Generate random text with varying numbers of `\n\n` breaks
- Verify all breaks are preserved after sync, input, undo, redo, rewrite
- Generate random edit operations and verify breaks are never lost
- Test across many scenarios with different text lengths and break positions

#### Bug 2: ResultSection Property Tests
- Generate random `expertAnalysis` objects with varying improvement counts
- Verify ExpertFeedbackPanel renders correctly for all valid inputs
- Generate random feedback items with varying severities and categories
- Test across many scenarios with different improvement types and text spans

### Integration Tests

#### Bug 1: Full Text Editing Flow
- Generate text with backend → verify paragraph breaks display correctly
- Edit text manually → verify breaks are preserved
- Apply AI rewrite → verify breaks are preserved in rewritten text
- Undo/redo edits → verify breaks are preserved through history
- Copy text → verify copied text includes `\n\n` breaks
- Export to PDF → verify PDF includes paragraph breaks

#### Bug 2: Full Expert Feedback Flow
- Generate text with backend → verify `expertAnalysis` is sent
- Render ResultSection → verify ExpertFeedbackPanel appears
- Hover over colored text span → verify tooltip shows feedback details
- Click feedback item → verify corresponding text span is highlighted
- Apply one-click fix → verify text is updated correctly
- Dismiss feedback → verify item is removed from active list
