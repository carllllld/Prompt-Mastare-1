# Bugfix Requirements Document

## Introduction

After deploying backend v2.9.0 with complete system verification for all 6 AI fields, two critical UI rendering bugs have been discovered in the result display. The backend correctly generates and sends all data including paragraph breaks (`\n\n`) and `expertAnalysis`, but the frontend fails to render them properly. This causes poor user experience with unreadable text blocks and missing expert feedback features.

**Impact:**
- Users cannot read generated text properly (no paragraph breaks)
- Users cannot access AI-generated improvement suggestions (no expert feedback panel)
- Professional appearance is compromised
- Key v2.9.0 features are invisible to users

**Root Cause Analysis:**
- Bug 1: TextEditor component uses `innerText` instead of `textContent`, which strips `\n\n` paragraph breaks
- Bug 2: ResultSection component casts `expertAnalysis` as `(result as any).expertAnalysis` but the field exists in the schema and is sent by backend

## Bug Analysis

### Current Behavior (Defect)

**Bug 1: Paragraph Breaks Missing**

1.1 WHEN the backend generates text with `\n\n` paragraph breaks (enforced by `enforceParagraphBreaks()` in post-processor) THEN the TextEditor component strips them and displays text as one continuous block

1.2 WHEN TextEditor syncs text using `editorRef.current.innerText = text` THEN `innerText` normalizes whitespace and removes `\n\n` breaks

1.3 WHEN user edits text in the contentEditable div THEN `handleInput` uses `innerText` which loses paragraph breaks on every keystroke

**Bug 2: Expert Feedback Panel Disappeared**

2.1 WHEN backend sends `expertAnalysis` in the API response (verified in routes.ts line 3480) THEN ResultSection extracts it with `(result as any).expertAnalysis` which works but indicates type mismatch

2.2 WHEN `expertAnalysis` exists with improvements array THEN ExpertFeedbackPanel should render but may not due to conditional logic issues

2.3 WHEN `expertAnalysis` exists with improvements array THEN InlineHighlights should show colored text spans but may not render properly

### Expected Behavior (Correct)

**Bug 1: Paragraph Breaks Preserved**

3.1 WHEN the backend generates text with `\n\n` paragraph breaks THEN the TextEditor component SHALL preserve and display them as visual paragraph spacing

3.2 WHEN TextEditor syncs text using `editorRef.current.textContent = text` THEN `textContent` SHALL preserve all `\n\n` breaks exactly as sent by backend

3.3 WHEN user edits text in the contentEditable div THEN `handleInput` SHALL use `textContent` to preserve paragraph breaks during editing

3.4 WHEN text is displayed in CopyCard components THEN `whitespace-pre-wrap` CSS SHALL render `\n\n` as visual paragraph breaks

**Bug 2: Expert Feedback Panel Visible**

4.1 WHEN backend sends `expertAnalysis` in the API response THEN ResultSection SHALL access it directly as `result.expertAnalysis` without type casting

4.2 WHEN `expertAnalysis` exists with improvements array THEN ExpertFeedbackPanel SHALL render below the main text editor

4.3 WHEN `expertAnalysis` exists with improvements array THEN InlineHighlights SHALL render colored text spans for each feedback item

4.4 WHEN user clicks on a feedback item in ExpertFeedbackPanel THEN the corresponding text span SHALL be highlighted in the main text

### Unchanged Behavior (Regression Prevention)

**Text Editing Features**

5.1 WHEN user manually edits text in TextEditor THEN direct editing SHALL CONTINUE TO work without losing changes

5.2 WHEN user selects text and uses AI rewrite toolbar THEN the rewrite functionality SHALL CONTINUE TO work correctly

5.3 WHEN user applies a one-click fix from ExpertFeedbackPanel THEN the fix SHALL CONTINUE TO be applied to the correct text span

5.4 WHEN user uses undo/redo (Cmd+Z / Cmd+Shift+Z) THEN history navigation SHALL CONTINUE TO work correctly

**Display and Export**

5.5 WHEN user copies text using copy buttons THEN the copied text SHALL CONTINUE TO include all content correctly

5.6 WHEN user exports to PDF THEN the PDF SHALL CONTINUE TO include all text fields correctly

5.7 WHEN CopyCard components display auxiliary texts (headline, social copy, etc.) THEN they SHALL CONTINUE TO render with proper formatting

**Expert Analysis Features**

5.8 WHEN expertAnalysis is null or undefined THEN the UI SHALL CONTINUE TO show TextEditor without InlineHighlights (graceful degradation)

5.9 WHEN expertAnalysis has zero improvements THEN ExpertFeedbackPanel SHALL CONTINUE TO not render (no empty panel)

5.10 WHEN user dismisses a feedback item THEN it SHALL CONTINUE TO be removed from the active feedback list without affecting other items
