# Production Fix v2.6.0 - Critical Issues Resolved

**Date:** 2026-03-21  
**Status:** Ready to commit and deploy

## Issues Fixed

### 1. Expert Feedback Not Showing (CRITICAL)

**Root Cause:** OpenAI API requires the lowercase English word "json" in the prompt when using `response_format: { type: 'json_object' }`.

**Error Message:**
```
'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'.
```

**Fix Applied:**
- Changed analyzer prompt from: `Svara ENDAST med JSON i denna exakta struktur:`
- To: `Svara ENDAST med JSON (json format) i denna exakta struktur:`
- File: `server/lib/perfect-swedish-analyzer.ts`

**Expected Result:** Expert feedback panel will now populate with quality scores, strengths, improvements, and legal check.

---

### 2. No Paragraph Breaks in Generated Text (CRITICAL)

**Root Cause:** The `enforceParagraphBreaks()` method had a condition `if (sentences.length >= 5)` which was too strict. Texts with 3-4 sentences would not get paragraph breaks enforced.

**Production Evidence:**
```
Post-processing transformations: { count: 2, byType: { narrative_integrity: 2 } }
```
No `paragraph_enforcement` transformation was logged, meaning the method never ran.

**Fix Applied:**
- Changed condition from `>= 5 sentences` to `>= 3 sentences`
- Improved paragraph splitting logic to handle texts of varying lengths:
  - 3-4 sentences: Split into 2-3 paragraphs
  - 5+ sentences: Split into 3-5 paragraphs with smart distribution
- File: `server/lib/perfect-swedish-post-processor.ts`

**Expected Result:** 
- All generated texts will have proper paragraph breaks (`\n\n`)
- Post-processor logs will show `paragraph_enforcement` transformations
- Texts will be visually structured with clear paragraph separation

---

## Files Changed

1. `server/lib/perfect-swedish-analyzer.ts` - Added "json" keyword to prompt
2. `server/lib/perfect-swedish-post-processor.ts` - Fixed paragraph enforcement logic

---

## Next Steps

### To Deploy:

```bash
# Stage changes
git add server/lib/perfect-swedish-analyzer.ts server/lib/perfect-swedish-post-processor.ts

# Commit
git commit -m "Fix critical production issues: analyzer JSON keyword + paragraph enforcement

- Add lowercase 'json' keyword to analyzer prompt (OpenAI requirement)
- Fix enforceParagraphBreaks to work with 3+ sentences (was requiring 5+)
- Improve paragraph splitting logic for texts of varying lengths
- Version: post-processor v2.6.0"

# Push to trigger Render auto-deploy
git push origin main
```

### Verification After Deploy:

1. **Expert Feedback Test:**
   - Generate a new text
   - Check that the expert feedback panel appears on the right side
   - Verify it shows: overall quality score, strengths list, improvements list, legal check

2. **Paragraph Breaks Test:**
   - Generate a new text
   - Check that the main text (`improvedPrompt`) has visible paragraph breaks
   - Count the number of paragraphs - should be 3-5 depending on text length
   - Check server logs for: `Post-processing transformations: { count: X, byType: { paragraph_enforcement: 1, ... } }`

3. **Production Logs:**
   - Watch Render logs during next generation
   - Should NOT see: `Expert analysis failed: 400 'messages' must contain the word 'json'`
   - Should see: `Post-processing transformations` with `paragraph_enforcement` in the byType object

---

## Technical Details

### Why the "json" keyword is required:

OpenAI's API validates that when you use `response_format: { type: 'json_object' }`, the word "json" (case-insensitive) must appear somewhere in the messages array. This is a safety check to ensure the model understands it should output JSON.

### Why paragraph enforcement wasn't working:

The original logic required at least 5 sentences to enforce paragraph breaks. However:
- Many property descriptions are 3-4 sentences (especially for smaller properties)
- GPT-5.2 was generating valid text but without `\n\n` breaks
- The post-processor would skip enforcement, leaving a wall of text

The new logic:
- Works with any text that has 3+ sentences
- Adapts paragraph count based on text length
- Always creates at least 2 paragraphs, up to 5 for longer texts

---

## Version History

- **v2.5.0** - Added paragraph requirements to generator prompt (didn't work, GPT ignored it)
- **v2.6.0** - Fixed post-processor to actually enforce paragraph breaks + fixed analyzer JSON keyword

---

## Expected Production Behavior After Deploy

✅ Expert feedback panel will populate with analysis  
✅ Generated texts will have proper paragraph structure  
✅ No more "json" validation errors in logs  
✅ Post-processor will log `paragraph_enforcement` transformations  
✅ Texts will be ready for broker use without manual formatting
