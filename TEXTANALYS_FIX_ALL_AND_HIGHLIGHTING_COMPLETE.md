# TEXTANALYS "FIX ALL" & HIGHLIGHTING - COMPLETE

## PROBLEMS ADDRESSED

From `KOMPLETT_MAKLARE_ANALYS.md` - Critical UX issues #4 and #5:

### Problem #4: "Fixa"-knappen fungerar inte som förväntat
**Broker expectation:** Click "Fixa" once → ALL instances fixed
**Current behavior:** Only fixes ONE instance, must click 5 times for 5 occurrences
**Broker reaction:** "Varför fixar den inte alla på en gång? Detta är jobbigt!"

### Problem #5: Kan inte se var problemet är i texten
**Broker expectation:** Click feedback → scroll to problem + highlight it
**Current behavior:** No highlighting, no scrolling, must manually search 400-word text
**Broker reaction:** "Var i texten står 'erbjuder'? Jag har 400 ord, jag hittar det inte!"

## SOLUTION IMPLEMENTED

### 1. "Fix All" Button for Repeated Issues

**Files Changed:**
- `client/src/components/ExpertFeedbackPanel.tsx`
- `client/src/pages/HemnetAnalysis.tsx`

**How it works:**
1. Analyzer detects similar issues (same problem, different locations)
2. Groups them by normalized issue text
3. Shows "Fixa alla (X)" button when multiple instances found
4. Applies all fixes in one click (sorted by position to avoid offset issues)

**Example:**
```
Before:
⚠️ AI-klysch: "erbjuder" (5 förekomster)
[Fixa] ← Must click 5 times

After:
⚠️ AI-klysch: "erbjuder" (5 förekomster)
[Fixa] [Fixa alla (5)] ← One click fixes all!
```

**Implementation Details:**
- Detects similar issues by normalizing issue text (removes quotes, extra spaces)
- Only shows "Fixa alla" if ALL instances are actionable (have autoFix)
- Sorts fixes by position (end to start) to avoid text offset issues
- Shows success toast: "5 fixar applicerade - Alla instanser har uppdaterats"

### 2. Click-to-Highlight with Scroll-to-Problem

**Files Changed:**
- `client/src/components/InlineHighlights.tsx`
- `client/src/pages/HemnetAnalysis.tsx`

**How it works:**
1. Click feedback in panel → triggers `onFeedbackClick(feedbackId)`
2. Sets `highlightedFeedbackId` state
3. InlineHighlights component:
   - Finds the span with matching feedbackId
   - Scrolls smoothly to center it in viewport
   - Highlights with bright yellow background + shadow
   - Adds pulse animation (2 cycles)
4. Auto-clears highlight after 3 seconds

**Visual Design:**
```css
Normal highlight:
- Background: Severity color (red/yellow/blue)
- Border: 2px solid severity border color

Active highlight (clicked):
- Background: #FEF08A (bright yellow)
- Border: 2px solid #EAB308 (yellow-600)
- Box shadow: 0 0 0 3px rgba(234, 179, 8, 0.2)
- Animation: pulse 0.5s ease-in-out 2 iterations
```

**Scroll Behavior:**
```javascript
scrollIntoView({
  behavior: 'smooth',
  block: 'center',      // Centers in viewport
  inline: 'nearest'
})
```

### 3. Enhanced Feedback Panel UI

**Changes:**
- Added similar issue detection logic
- Shows count badge when multiple instances exist
- Conditionally renders "Fixa alla (X)" button
- Improved button layout for multiple actions

**Button Priority:**
1. "Fixa" - Single instance fix
2. "Fixa alla (X)" - Multiple instance fix (only if applicable)
3. "AI-förslag" - Get AI suggestions (future feature)
4. "X" - Dismiss feedback

## CODE CHANGES

### ExpertFeedbackPanel.tsx

**Added similar issue detection:**
```typescript
const similarIssues = useMemo(() => {
  const issueMap = new Map<string, FeedbackItem[]>();
  
  analysis.improvements.forEach(item => {
    const normalizedIssue = item.issue.toLowerCase().replace(/["']/g, '').trim();
    
    if (!issueMap.has(normalizedIssue)) {
      issueMap.set(normalizedIssue, []);
    }
    issueMap.get(normalizedIssue)!.push(item);
  });

  // Filter to only issues that appear multiple times
  const similar = new Map<string, FeedbackItem[]>();
  issueMap.forEach((items, issue) => {
    if (items.length > 1) {
      similar.set(issue, items);
    }
  });

  return similar;
}, [analysis.improvements]);
```

**Added "Fix All" button:**
```typescript
{hasSimilar && allActionable && onFixAllClick && (
  <Button
    size="sm"
    onClick={(e) => handleFixAllClick(e, similarItems.map(i => i.id))}
    className="flex-1 text-xs h-7 bg-primary text-primary-foreground hover:bg-primary-hover"
  >
    <Wand2 className="w-3 h-3" />
    Fixa alla ({similarItems.length})
  </Button>
)}
```

### InlineHighlights.tsx

**Added highlighting support:**
```typescript
const isHighlighted = segment.feedback.some(f => f.id === highlightedFeedbackId);

<span
  ref={isHighlighted ? highlightedSpanRef : undefined}
  style={{
    backgroundColor: isHighlighted ? '#FEF08A' : colors.bg,
    borderBottom: `2px solid ${isHighlighted ? '#EAB308' : colors.border}`,
    boxShadow: isHighlighted ? '0 0 0 3px rgba(234, 179, 8, 0.2)' : 'none',
  }}
>
```

**Added scroll-to-highlight:**
```typescript
useEffect(() => {
  if (highlightedFeedbackId && highlightedSpanRef.current) {
    highlightedSpanRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });

    highlightedSpanRef.current.style.animation = 'pulse 0.5s ease-in-out 2';
  }
}, [highlightedFeedbackId]);
```

### HemnetAnalysis.tsx

**Added state for highlighting:**
```typescript
const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null);
```

**Added feedback click handler:**
```typescript
const handleFeedbackClick = useCallback((feedbackId: string) => {
  setHighlightedFeedbackId(feedbackId);
  
  // Clear highlight after 3 seconds
  setTimeout(() => {
    setHighlightedFeedbackId(null);
  }, 3000);
}, []);
```

**Added fix all handler:**
```typescript
const handleFixAllClick = useCallback((feedbackIds: string[]) => {
  let currentText = editedText;
  let successCount = 0;
  
  // Sort feedback by position (end to start) to avoid offset issues
  const feedbackToFix = analysisResult?.analysis.improvements
    .filter(f => feedbackIds.includes(f.id))
    .sort((a, b) => {
      if (!a.textSpan || !b.textSpan) return 0;
      return b.textSpan.start - a.textSpan.start;
    }) || [];
  
  // Apply all fixes
  for (const feedback of feedbackToFix) {
    const result = applyFix(currentText, feedback, 'improvedPrompt');
    if (result.success && result.newText) {
      currentText = result.newText;
      successCount++;
    }
  }
  
  if (successCount > 0) {
    setEditedText(currentText);
    toast({
      title: `${successCount} fixar applicerade`,
      description: "Alla instanser har uppdaterats automatiskt",
    });
  }
}, [analysisResult, editedText, applyFix, toast]);
```

## USER EXPERIENCE IMPROVEMENTS

### Before:
```
Broker sees: "AI-klysch: 'erbjuder' hittad"
Broker clicks: [Fixa]
Result: Only 1 of 5 instances fixed
Broker thinks: "Varför? Jag måste klicka 5 gånger?"

Broker sees: "AI-klysch: 'erbjuder' i stycke 2"
Broker thinks: "Var i texten? Jag har 400 ord!"
Broker action: Ctrl+F to search manually
```

### After:
```
Broker sees: "AI-klysch: 'erbjuder' (5 förekomster)"
Broker clicks: [Fixa alla (5)]
Result: All 5 instances fixed at once!
Broker thinks: "Perfekt! Exakt som jag förväntade mig!"

Broker sees: "AI-klysch: 'erbjuder' i stycke 2"
Broker clicks: Feedback card
Result: Page scrolls to problem, highlights it with yellow + pulse
Broker thinks: "Där är det! Nu ser jag exakt var problemet är!"
```

## TECHNICAL DETAILS

### Similar Issue Detection Algorithm

1. **Normalize issue text:**
   - Convert to lowercase
   - Remove quotes (" and ')
   - Trim whitespace
   - Example: `"AI-klysch: 'erbjuder'"` → `ai-klysch: erbjuder`

2. **Group by normalized text:**
   - Create Map<normalizedIssue, FeedbackItem[]>
   - Add each feedback item to its normalized group

3. **Filter for duplicates:**
   - Only keep groups with 2+ items
   - Return Map<normalizedIssue, FeedbackItem[]>

4. **Check actionability:**
   - All items in group must have `actionable: true`
   - All items must have `autoFix` defined
   - Only then show "Fixa alla" button

### Fix All Application Strategy

**Problem:** Applying fixes sequentially changes text offsets

**Solution:** Sort by position (end to start)
```typescript
// Sort by start position, descending (end to start)
feedbackToFix.sort((a, b) => {
  if (!a.textSpan || !b.textSpan) return 0;
  return b.textSpan.start - a.textSpan.start;
});

// Apply fixes from end to start
// This way, earlier fixes don't affect later positions
for (const feedback of feedbackToFix) {
  currentText = applyFix(currentText, feedback);
}
```

**Example:**
```
Text: "Köket erbjuder moderna vitvaror och erbjuder gott om plats"
Positions: [6-14] and [38-46]

Wrong order (start to end):
1. Fix [6-14]: "Köket har moderna vitvaror och erbjuder gott om plats"
2. Fix [38-46]: WRONG! Position shifted by -6 chars

Right order (end to start):
1. Fix [38-46]: "Köket erbjuder moderna vitvaror och har gott om plats"
2. Fix [6-14]: "Köket har moderna vitvaror och har gott om plats" ✓
```

### Highlight Animation

**CSS Animation:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

**Applied via JavaScript:**
```javascript
element.style.animation = 'pulse 0.5s ease-in-out 2';
// Runs 2 iterations = 1 second total
```

**Auto-clear after 3 seconds:**
```javascript
setTimeout(() => {
  setHighlightedFeedbackId(null);
}, 3000);
```

## TESTING CHECKLIST

- [ ] Test "Fixa alla" with 5 instances of "erbjuder"
- [ ] Verify all 5 instances are fixed in one click
- [ ] Test clicking feedback card
- [ ] Verify page scrolls to highlighted text
- [ ] Verify yellow highlight with pulse animation
- [ ] Verify highlight clears after 3 seconds
- [ ] Test with feedback at start, middle, and end of text
- [ ] Test with overlapping feedback spans
- [ ] Test undo after "Fixa alla"
- [ ] Verify toast shows correct count: "5 fixar applicerade"

## REMAINING WORK

From `KOMPLETT_MAKLARE_ANALYS.md`:

### High Priority (Next):
1. ✅ "Fix all" button - DONE
2. ✅ Text highlighting with scroll - DONE
3. ⏳ Detect missing details - Check for missing kitchen/bathroom/location descriptions
4. ⏳ Better Hemnet rule detection UI - Already in backend, needs better presentation

### Medium Priority:
5. ⏳ AI rewrite with control - Checkboxes to preserve specific details
6. ⏳ Legal guidance - Warn about unverifiable claims with suggestions
7. ⏳ Comparison with top listings - Show how text compares to top 10%

### Lower Priority:
8. ⏳ Form duplication fixes - Remove repeated fields
9. ⏳ Guided Vitec setup - Better onboarding
10. ⏳ Better error messages - Explain WHY import failed

## FILES MODIFIED

1. `client/src/components/ExpertFeedbackPanel.tsx` - Similar issue detection, "Fixa alla" button
2. `client/src/components/InlineHighlights.tsx` - Highlighting, scroll-to-problem, pulse animation
3. `client/src/pages/HemnetAnalysis.tsx` - State management, handlers for fix all and highlighting

## IMPACT

**Before:** Frustrating UX - must click 5 times, can't find problems in text
**After:** Smooth UX - one click fixes all, instant visual feedback with scroll + highlight

**Broker satisfaction:** From "Detta är jobbigt!" → "Perfekt! Exakt som jag förväntade mig!"

---

**Status:** ✅ COMPLETE - Ready for testing
**Date:** 2026-04-02
**Impact:** Critical UX improvement - Makes feedback actionable and problems easy to find
