# Implementation Plan

- [x] 1. Write bug condition exploration test for Bug 1 (Paragraph Breaks)
  - **Property 1: Bug Condition** - Paragraph Breaks Stripped by innerText API
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate paragraph breaks are being stripped
  - **Scoped PBT Approach**: Test concrete cases where text contains `\n\n` paragraph breaks
  - Test that TextEditor preserves `\n\n` paragraph breaks when syncing text prop
  - Test that TextEditor preserves `\n\n` paragraph breaks during user input/editing
  - Test that TextEditor preserves `\n\n` paragraph breaks during undo/redo operations
  - Test that TextEditor preserves `\n\n` paragraph breaks during AI rewrite operations
  - The test assertions should verify `textContent` contains `\n\n` and visual spacing is rendered
  - Run test on UNFIXED code (TextEditor currently uses `innerText`)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: "Text with `\n\n` is displayed as continuous text without paragraph spacing"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write bug condition exploration test for Bug 2 (Expert Feedback Panel)
  - **Property 1: Bug Condition** - Expert Analysis Type Casting Issue
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate type casting and missing schema field
  - **Scoped PBT Approach**: Test concrete cases where backend sends `expertAnalysis` with improvements
  - Test that `expertAnalysis` field is missing from `optimizeResponseSchema` in shared/schema.ts
  - Test that ResultSection uses type casting `(result as any).expertAnalysis` instead of proper typing
  - Test that ExpertFeedbackPanel should render when `expertAnalysis.improvements` exists
  - Test that InlineHighlights should render colored text spans when feedback items exist
  - The test assertions should verify proper TypeScript typing without type casting
  - Run test on UNFIXED code (schema missing field, ResultSection uses type casting)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: "Type casting bypasses TypeScript validation, schema field missing"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Text Editing and Display Features
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (text without `\n\n`, results without expertAnalysis)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Test preservation of text editing features: direct editing, AI rewrite toolbar, undo/redo
  - Test preservation of display and export: copy buttons, PDF export, CopyCard rendering
  - Test preservation of graceful degradation: null/undefined expertAnalysis, zero improvements
  - Test preservation of single line breaks `\n` (should continue to work as before)
  - Test preservation of text without any line breaks (should continue to work as before)
  - Test preservation of all other result fields (headline, socialCopy, etc.)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

- [x] 4. Fix for UI rendering bugs

  - [x] 4.1 Implement Bug 1 fix: Replace innerText with textContent in TextEditor
    - Open `client/src/components/TextEditor.tsx`
    - Add explanatory comment at top: "CRITICAL: Use textContent (not innerText) to preserve \n\n paragraph breaks. innerText normalizes whitespace and strips paragraph breaks."
    - Line 96 (undo): Replace `editorRef.current.innerText = prev` with `editorRef.current.textContent = prev`
    - Line 107 (redo): Replace `editorRef.current.innerText = next` with `editorRef.current.textContent = next`
    - Line 119 (handleInput): Replace `editorRef.current.innerText` with `editorRef.current.textContent`
    - Line 127 (sync check): Replace `editorRef.current.innerText !== text` with `editorRef.current.textContent !== text`
    - Line 128 (sync set): Replace `editorRef.current.innerText = text` with `editorRef.current.textContent = text`
    - Line 152 (AI rewrite): Replace `editorRef.current.innerText = data.newFullText` with `editorRef.current.textContent = data.newFullText`
    - Verify `whitespace-pre-wrap` CSS class is applied to contentEditable div (already present on line 211)
    - _Bug_Condition: isBugCondition1(input) where input.text.includes('\n\n') AND component uses innerText API_
    - _Expected_Behavior: TextEditor preserves \n\n paragraph breaks using textContent API_
    - _Preservation: Text editing features (5.1, 5.2, 5.3, 5.4), Display and export (5.5, 5.6, 5.7)_
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 Implement Bug 2 fix: Add expertAnalysis to schema and remove type casting
    - Open `shared/schema.ts`
    - Locate `optimizeResponseSchema` definition (around line 130-200)
    - Add `expertAnalysis` field after `fail_safe_meta` field (before closing brace):
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
    - Open `client/src/components/ResultSection.tsx`
    - Line 115: Replace `const expertAnalysis = (result as any).expertAnalysis || null;` with `const expertAnalysis = result.expertAnalysis || null;`
    - Verify conditional rendering logic works correctly (lines 545, 598)
    - _Bug_Condition: isBugCondition2(input) where input.hasExpertAnalysis AND result.expertAnalysis accessed via type casting_
    - _Expected_Behavior: ResultSection accesses result.expertAnalysis without type casting, ExpertFeedbackPanel renders_
    - _Preservation: Graceful degradation (5.8, 5.9, 5.10)_
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.3 Verify bug condition exploration test for Bug 1 now passes
    - **Property 1: Expected Behavior** - Paragraph Breaks Preserved
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify TextEditor preserves `\n\n` paragraph breaks in all operations
    - Verify visual paragraph spacing is rendered correctly
    - _Requirements: Expected Behavior Properties 3.1, 3.2, 3.3, 3.4 from design_

  - [x] 4.4 Verify bug condition exploration test for Bug 2 now passes
    - **Property 1: Expected Behavior** - Expert Feedback Panel Visible
    - **IMPORTANT**: Re-run the SAME test from task 2 - do NOT write a new test
    - The test from task 2 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 2
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify `expertAnalysis` field exists in schema without type casting
    - Verify ExpertFeedbackPanel renders when improvements exist
    - Verify InlineHighlights renders colored text spans
    - _Requirements: Expected Behavior Properties 4.1, 4.2, 4.3, 4.4 from design_

  - [x] 4.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Text Editing and Display Features
    - **IMPORTANT**: Re-run the SAME tests from task 3 - do NOT write new tests
    - Run preservation property tests from step 3
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm text editing features continue to work (direct editing, AI rewrite, undo/redo)
    - Confirm display and export features continue to work (copy, PDF, CopyCard)
    - Confirm graceful degradation continues to work (null expertAnalysis, zero improvements)
    - Confirm single line breaks `\n` continue to work as before
    - Confirm text without line breaks continues to work as before
    - Confirm all other result fields continue to render correctly

- [x] 5. Checkpoint - Ensure all tests pass
  - Run all bug condition exploration tests - should PASS
  - Run all preservation property tests - should PASS
  - Verify paragraph breaks display correctly in browser
  - Verify expert feedback panel renders when expertAnalysis exists
  - Verify no TypeScript errors in ResultSection or schema
  - Ask the user if questions arise
