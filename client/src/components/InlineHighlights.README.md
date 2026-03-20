# InlineHighlights Component

## Overview

The `InlineHighlights` component renders text with visual markers for expert feedback, showing inline highlights with color-coded severity levels and interactive tooltips. It's designed to work with the Perfect Swedish Pipeline's expert analysis feature.

## Features

✅ **Task 10.1**: Text span rendering with visual markers
- Parses text and identifies feedback spans
- Renders visual markers (underlines, background colors) on text with feedback
- Supports multiple overlapping highlights on the same text span

✅ **Task 10.2**: Color coding and tooltip display
- Severity-based color coding (red=critical, yellow=important, blue=suggestion)
- Hover tooltips with feedback details (issue, suggestion, auto-fix preview)
- Category icons in tooltips (grammar, style, legal, broker_realism, clarity)
- "Fix" button for actionable feedback items

✅ **Task 10.3**: Real-time highlight updates
- Updates highlights when text changes
- Recalculates text span positions
- Synchronizes with feedback list
- Updates within 100ms of text change (React re-render)

## Props

```typescript
interface InlineHighlightsProps {
  text: string;                          // The text to render with highlights
  feedback: FeedbackItem[];              // Array of feedback items from expert analysis
  field?: string;                        // Which field this text represents (default: 'improvedPrompt')
  onFixClick?: (feedbackId: string) => void;  // Callback when "Fix" button is clicked
  onTextChange?: (newText: string) => void;   // Callback when text changes (future use)
}
```

## FeedbackItem Structure

```typescript
interface FeedbackItem {
  id: string;                            // Unique identifier
  issue: string;                         // Description of the problem
  location: string;                      // Human-readable location
  textSpan?: {                           // Text span coordinates
    start: number;                       // Start position (character index)
    end: number;                         // End position (character index)
    field: string;                       // Field name ('improvedPrompt', 'headline', etc.)
  };
  suggestion: string;                    // Improvement suggestion
  category: 'grammar' | 'style' | 'legal' | 'broker_realism' | 'clarity';
  severity: 'critical' | 'important' | 'suggestion';
  expert: 'broker' | 'lawyer';           // Which expert provided the feedback
  actionable: boolean;                   // Whether automatic fix is available
  autoFix?: string;                      // Exact replacement text (if actionable)
}
```

## Usage Examples

### Basic Usage

```tsx
import { InlineHighlights } from '@/components/InlineHighlights';

function MyComponent({ result }) {
  const feedback = result.expertAnalysis?.improvements || [];

  return (
    <InlineHighlights
      text={result.improvedPrompt}
      feedback={feedback}
      field="improvedPrompt"
    />
  );
}
```

### With Fix Functionality

```tsx
function EditableText({ result }) {
  const [text, setText] = useState(result.improvedPrompt);
  const [feedback, setFeedback] = useState(result.expertAnalysis?.improvements || []);

  const handleFixClick = (feedbackId: string) => {
    const item = feedback.find(f => f.id === feedbackId);
    if (!item?.autoFix || !item.textSpan) return;

    // Apply the fix
    const { start, end } = item.textSpan;
    const newText = text.slice(0, start) + item.autoFix + text.slice(end);
    setText(newText);

    // Remove the feedback item
    setFeedback(prev => prev.filter(f => f.id !== feedbackId));
  };

  return (
    <InlineHighlights
      text={text}
      feedback={feedback}
      field="improvedPrompt"
      onFixClick={handleFixClick}
    />
  );
}
```

### Multiple Fields

```tsx
function MultiFieldDisplay({ result }) {
  const allFeedback = result.expertAnalysis?.improvements || [];

  return (
    <div>
      {/* Headline with highlights */}
      <h2>
        <InlineHighlights
          text={result.headline}
          feedback={allFeedback}
          field="headline"
        />
      </h2>

      {/* Main text with highlights */}
      <div>
        <InlineHighlights
          text={result.improvedPrompt}
          feedback={allFeedback}
          field="improvedPrompt"
        />
      </div>

      {/* Social copy with highlights */}
      <div>
        <InlineHighlights
          text={result.socialCopy}
          feedback={allFeedback}
          field="socialCopy"
        />
      </div>
    </div>
  );
}
```

## Color Coding

The component uses severity-based color coding:

| Severity | Background | Border | Use Case |
|----------|-----------|--------|----------|
| `critical` | Light red (#FEE2E2) | Red (#FCA5A5) | Grammar errors, legal issues |
| `important` | Light yellow (#FEF3C7) | Yellow (#FDE68A) | Style improvements, clarity issues |
| `suggestion` | Light blue (#DBEAFE) | Blue (#93C5FD) | Optional enhancements |

## Category Icons

Each feedback category has a corresponding icon:

- **grammar**: FileText (document icon)
- **style**: Briefcase (professional icon)
- **legal**: Scale (justice icon)
- **broker_realism**: User (person icon)
- **clarity**: Lightbulb (idea icon)

## Tooltip Behavior

1. **Hover to show**: Tooltip appears when hovering over highlighted text
2. **Positioned above**: Tooltip is positioned above the highlighted span
3. **Auto-centered**: Tooltip centers itself horizontally relative to the span
4. **Multiple feedback**: Shows count badge when multiple feedback items overlap
5. **Most severe first**: When multiple items overlap, shows the most severe one

## Overlapping Highlights

The component intelligently handles overlapping highlights:

1. Segments are merged when they have the same start/end positions
2. Multiple feedback items are stored in the same segment
3. A count badge (e.g., "2") indicates multiple feedback items
4. The most severe feedback determines the color
5. Hovering shows the most severe feedback first

## Performance Considerations

- **Memoization**: Uses `useMemo` to avoid recalculating segments on every render
- **Efficient parsing**: Segments are calculated once per text/feedback change
- **Minimal re-renders**: Only re-renders when text or feedback changes
- **Debouncing**: Consider debouncing text changes in parent component

## Integration with TextEditor

The InlineHighlights component can be used alongside the existing TextEditor:

```tsx
function EditableWithHighlights({ text, feedback }) {
  const [editedText, setEditedText] = useState(text);

  return (
    <div className="relative">
      {/* Option 1: Display-only with highlights */}
      <div className="mb-4">
        <InlineHighlights
          text={editedText}
          feedback={feedback}
          field="improvedPrompt"
        />
      </div>

      {/* Option 2: Editable version */}
      <TextEditor
        text={editedText}
        onTextChange={setEditedText}
      />
    </div>
  );
}
```

## Accessibility

- Uses semantic HTML with proper ARIA attributes
- Keyboard navigation support (hover states work with focus)
- Screen reader friendly (feedback details are readable)
- High contrast color coding for visibility

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires CSS Grid and Flexbox support
- Uses CSS transforms for positioning
- Requires JavaScript enabled

## Future Enhancements

Potential improvements for future iterations:

1. **Inline editing**: Allow editing directly within highlighted spans
2. **Batch fixes**: Apply multiple fixes at once
3. **Undo/redo**: Track fix history
4. **Keyboard shortcuts**: Navigate between highlights with arrow keys
5. **Filter by severity**: Show/hide highlights by severity level
6. **Export**: Export feedback as PDF or JSON
7. **Collaborative**: Real-time feedback from multiple experts

## Testing

The component includes comprehensive unit tests:

```bash
npm run test -- InlineHighlights.test.tsx
```

Test coverage includes:
- Plain text rendering (no feedback)
- Highlight rendering with correct colors
- Tooltip display on hover
- Fix button functionality
- Multiple overlapping highlights
- Field filtering
- Edge cases (missing text spans, empty feedback)

## Troubleshooting

### Highlights not showing

- Verify `textSpan` is present in feedback items
- Check that `field` prop matches `textSpan.field`
- Ensure `start` and `end` positions are within text bounds

### Tooltip not appearing

- Check that feedback item has all required fields
- Verify hover event is firing (check browser console)
- Ensure tooltip is not hidden behind other elements (z-index)

### Colors not correct

- Verify `severity` field is one of: 'critical', 'important', 'suggestion'
- Check CSS is loaded correctly
- Inspect element to verify inline styles are applied

### Performance issues

- Debounce text changes in parent component
- Limit number of feedback items (paginate if needed)
- Use React.memo() for parent components
- Profile with React DevTools to identify bottlenecks

## Related Components

- **TextEditor**: Editable text with AI-assisted improvements
- **ExpertFeedbackPanel**: Structured feedback list (Task 11)
- **OneClickFix**: Automatic fix application (Task 12)
- **AIAssistedSelectionEdit**: AI-powered text selection editing (Task 13)

## API Integration

The component expects feedback from the backend's Expert AI Analyzer:

```typescript
// Backend response structure
interface OptimizeResponse {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  // ... other fields
  expertAnalysis?: {
    overallQuality: number;
    strengths: string[];
    improvements: FeedbackItem[];  // Used by InlineHighlights
    legalCheck: LegalCheck;
    duration: number;
  };
}
```

## License

Part of the OptiPrompt Perfect Swedish Pipeline feature.
