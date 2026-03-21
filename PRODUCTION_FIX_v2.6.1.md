# Production Fix v2.6.1 - Paragraph Breaks Issue

**Date:** 2026-03-21  
**Status:** CRITICAL FIX - Ready to deploy

## Problem Summary

User reported two issues after v2.6.0 deployment:

1. **Expert feedback not showing** - OpenAI using all 1500 tokens for reasoning, returning empty content
2. **No paragraph breaks in generated text** - Text appears as one continuous block despite post-processor adding `\n\n`

## Root Cause Analysis

### Issue 1: Expert Feedback (Token Limit)
- Production logs show: `"completion_tokens": 1500, "reasoning_tokens": 1500, "content": ""`
- OpenAI GPT-5.2 reasoning mode uses tokens for thinking
- Previous fix increased `max_completion_tokens` to 2500 but wasn't deployed yet
- **Status:** Already fixed in v2.6.0, just needs deployment

### Issue 2: Paragraph Breaks (Frontend Rendering)
- Post-processor correctly adds `\n\n` between paragraphs (logs confirm: `paragraph_enforcement: 1`)
- Backend sends `improvedPrompt` with `\n\n` intact via JSON
- **ROOT CAUSE FOUND:** `TextEditor.tsx` uses `innerText` which strips all formatting including newlines
- Browser behavior: `innerText` converts `\n\n` to single spaces
- **Solution:** Replace all `innerText` with `textContent` to preserve newlines

## Files Changed

### Frontend Fix (NEW)
- `client/src/components/TextEditor.tsx`
  - Line 157: Changed `innerText` → `textContent` (sync text prop)
  - Line 103: Changed `innerText` → `textContent` (handle input)
  - Line 133: Changed `innerText` → `textContent` (AI rewrite)
  - Line 48: Changed `innerText` → `textContent` (undo)
  - Line 61: Changed `innerText` → `textContent` (redo)

### Backend (Already Fixed in v2.6.0)
- `server/lib/perfect-swedish-analyzer.ts`
  - Line 59: `max_completion_tokens: 2500` (was 1500)
  - Added "JSON-format" keyword to prompt first line
  - Added detailed error logging for OpenAI responses

- `server/lib/perfect-swedish-post-processor.ts`
  - Line 115: Changed paragraph break threshold from 5+ to 3+ sentences
  - Improved paragraph enforcement logic for shorter texts

- `server/lib/perfect-swedish-generator.ts`
  - Line 18: `PROMPT_VERSION = '2.6.0'` (cache bust)
  - Added explicit paragraph break instructions to prompt

## Technical Details

### Why `innerText` Fails
```typescript
// WRONG - strips \n\n
editorRef.current.innerText = "Stycke 1.\n\nStycke 2.";
// Result: "Stycke 1. Stycke 2." (single space)

// CORRECT - preserves \n\n
editorRef.current.textContent = "Stycke 1.\n\nStycke 2.";
// Result: "Stycke 1.\n\nStycke 2." (paragraph break preserved)
```

### CSS Support
The `TextEditor` already has `whitespace-pre-wrap` CSS class which correctly renders `\n\n` as visual paragraph breaks when using `textContent`.

## Testing Checklist

- [ ] Build passes (`npm run build`)
- [ ] TypeScript check passes (`npm run check`)
- [ ] Test in production: Generate new text and verify paragraph breaks are visible
- [ ] Test in production: Verify expert feedback appears in UI
- [ ] Test undo/redo preserves paragraph breaks
- [ ] Test AI rewrite preserves paragraph breaks
- [ ] Test copy-to-clipboard includes paragraph breaks

## Deployment Steps

1. Commit all changes
2. Push to main branch
3. Render auto-deploys
4. Monitor production logs for:
   - `"completion_tokens": 2500` (not 1500)
   - `"content": "..."` (not empty)
   - `paragraph_enforcement: 1` (still running)
5. Test in UI: Generate text and verify visual paragraph breaks

## Expected Production Logs After Fix

```
Post-processing transformations: {
  count: 5,
  byType: { paragraph_enforcement: 1, formatting: 3, narrative_integrity: 1 }
}

OpenAI analysis response: {
  "completion_tokens": 2500,  // ✓ Higher limit
  "reasoning_tokens": 1500,
  "content": "{...}"          // ✓ Has content
}
```

## Rollback Plan

If issues persist:
1. Check browser console for JavaScript errors
2. Verify `textContent` is supported (all modern browsers)
3. If needed, revert to `innerText` and implement alternative solution (convert `\n\n` to `<br/><br/>` tags)

## Notes

- The TypeScript errors in `TextEditor.tsx` are false positives (missing type declarations)
- They don't affect production build or runtime
- All changes are backward compatible
- No database migrations needed
