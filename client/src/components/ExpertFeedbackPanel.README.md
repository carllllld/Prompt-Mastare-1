# ExpertFeedbackPanel Component

## Overview

The `ExpertFeedbackPanel` component displays structured expert feedback in a collapsible panel with category grouping, action buttons, and real-time updates. It's designed to work alongside the InlineHighlights component as part of the Perfect Swedish Pipeline's expert analysis feature.

## Features

✅ **Task 11.1**: Category grouping with counts
- Groups feedback items by category (grammar, style, legal, broker_realism, clarity)
- Displays count per category in badges
- Collapsible accordion sections for each category
- Sorts feedback by severity within each category

✅ **Task 11.2**: Navigation and action buttons
- Click on feedback item to scroll to and highlight corresponding text
- "Fixa" button for automatic fix application (actionable items only)
- "AI-förslag" button to get AI-powered suggestions
- Dismiss button (X) to remove feedback items
- Displays severity level and expert attribution (broker/lawyer)

✅ **Task 11.3**: Real-time panel updates
- Updates when feedback is resolved
- Removes feedback items when applied or dismissed
- Updates counts in real-time
- Smooth animations with Radix UI accordion

## Props

```typescript
interface ExpertFeedbackPanelProps {
  analysis: ExpertAnalysis;                          // Expert analysis from backend
  onFeedbackClick?: (feedbackId: string) => void;    // Callback when feedback item is clicked
  onFixClick?: (feedbackId: string) => void;         // Callback when "Fixa" button is clicked
  onAISuggestClick?: (feedbackId: string) => void;   // Callback when "AI-förslag" button is clicked
  onDismissClick?: (feedbackId: string) => void;     // Callback when dismiss button is clicked
}
```

## ExpertAnalysis Structure

```typescript
interface ExpertAnalysis {
  overallQuality: number;                            // 0-10 quality score
  strengths: string[];                               // List of strengths
  improvements: FeedbackItem[];                      // Array of feedback items
  legalCheck: {
    compliant: boolean;                              // Legal compliance status
    notes: string;                                   // Legal notes
    issues: string[];                                // Legal issues found
  };
  duration: number;                                  // Analysis duration in ms
}

interface FeedbackItem {
  id: string;                                        // Unique identifier
  issue: string;                                     // Description of the problem
  location: string;                                  // Human-readable location
  textSpan?: {                                       // Text span coordinates
    start: number;                                   // Start position (character index)
    end: number;                                     // End position (character index)
    field: string;                                   // Field name ('improvedPrompt', 'headline', etc.)
  };
  suggestion: string;                                // Improvement suggestion
  category: 'grammar' | 'style' | 'legal' | 'broker_realism' | 'clarity';
  severity: 'critical' | 'important' | 'suggestion';
  expert: 'broker' | 'lawyer';                       // Which expert provided the feedback
  actionable: boolean;                               // Whether automatic fix is available
  autoFix?: string;                                  // Exact replacement text (if actionable)
}
```

## Usage Examples

### Basic Usage

```tsx
import { ExpertFeedbackPanel } from '@/components/ExpertFeedbackPanel';

function MyComponent({ result }) {
  if (!result.expertAnalysis) return null;

  return (
    <ExpertFeedbackPanel
      analysis={result.expertAnalysis}
    />
  );
}
```

### With Full Functionality

```tsx
function EditableTextWithPanel({ result }) {
  const [text, setText] = useState(result.improvedPrompt);
  const [feedback, setFeedback] = useState(result.expertAnalysis?.improvements || []);

  // Handle feedback click - scroll to and highlight text
  const handleFeedbackClick = (feedbackId: string) => {
    const item = feedback.find(f => f.id === feedbackId);
    if (!item?.textSpan) return;

    // Scroll to the text span
    const element = document.getElementById(`text-span-${item.textSpan.field}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Highlight the text (implementation depends on your text editor)
    highlightTextSpan(item.textSpan);
  };

  // Handle fix click - apply automatic fix
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

  // Handle AI suggest click - get AI suggestions
  const handleAISuggestClick = async (feedbackId: string) => {
    const item = feedback.find(f => f.id === feedbackId);
    if (!item?.textSpan) return;

    // Call AI suggestion API
    const suggestions = await getAISuggestions(item);
    showSuggestionDialog(suggestions);
  };

  // Handle dismiss click - remove feedback
  const handleDismissClick = (feedbackId: string) => {
    setFeedback(prev => prev.filter(f => f.id !== feedbackId));
  };

  return (
    <div className="flex gap-4">
      {/* Main text editor */}
      <div className="flex-1">
        <TextEditor text={text} onTextChange={setText} />
      </div>

      {/* Feedback panel */}
      <div className="w-96">
        <ExpertFeedbackPanel
          analysis={{
            ...result.expertAnalysis,
            improvements: feedback,
          }}
          onFeedbackClick={handleFeedbackClick}
          onFixClick={handleFixClick}
          onAISuggestClick={handleAISuggestClick}
          onDismissClick={handleDismissClick}
        />
      </div>
    </div>
  );
}
```

### Integration with InlineHighlights

```tsx
function CompleteEditingInterface({ result }) {
  const [text, setText] = useState(result.improvedPrompt);
  const [feedback, setFeedback] = useState(result.expertAnalysis?.improvements || []);

  const handleFixClick = (feedbackId: string) => {
    const item = feedback.find(f => f.id === feedbackId);
    if (!item?.autoFix || !item.textSpan) return;

    // Apply fix
    const { start, end } = item.textSpan;
    const newText = text.slice(0, start) + item.autoFix + text.slice(end);
    setText(newText);

    // Remove feedback
    setFeedback(prev => prev.filter(f => f.id !== feedbackId));
  };

  return (
    <div className="flex gap-4 h-screen">
      {/* Main content with inline highlights */}
      <div className="flex-1 p-6 overflow-auto">
        <InlineHighlights
          text={text}
          feedback={feedback}
          field="improvedPrompt"
          onFixClick={handleFixClick}
        />
      </div>

      {/* Sidebar with feedback panel */}
      <div className="w-96 border-l">
        <ExpertFeedbackPanel
          analysis={{
            ...result.expertAnalysis,
            improvements: feedback,
          }}
          onFeedbackClick={(id) => {
            // Scroll to highlighted text
            const item = feedback.find(f => f.id === id);
            if (item?.textSpan) {
              // Implementation depends on your layout
              scrollToTextSpan(item.textSpan);
            }
          }}
          onFixClick={handleFixClick}
          onDismissClick={(id) => {
            setFeedback(prev => prev.filter(f => f.id !== id));
          }}
        />
      </div>
    </div>
  );
}
```

## Category Grouping

Feedback is automatically grouped into five categories:

| Category | Icon | Description |
|----------|------|-------------|
| `grammar` | FileText | Grammar errors and spelling mistakes |
| `style` | Briefcase | Writing style improvements |
| `legal` | Scale | Legal compliance issues |
| `broker_realism` | User | Broker authenticity and realism |
| `clarity` | Lightbulb | Clarity and readability improvements |

Each category section:
- Shows category icon and label
- Displays count badge
- Is collapsible (accordion)
- Sorts items by severity (critical → important → suggestion)

## Severity Levels

Three severity levels with color coding:

| Severity | Color | Badge | Use Case |
|----------|-------|-------|----------|
| `critical` | Red (#FEE2E2) | Kritisk | Grammar errors, legal issues |
| `important` | Yellow (#FEF3C7) | Viktig | Style improvements, clarity issues |
| `suggestion` | Blue (#DBEAFE) | Förslag | Optional enhancements |

## Action Buttons

Each feedback item can have up to three action buttons:

1. **Fixa** (Fix automatically)
   - Only shown for actionable items (`actionable: true`)
   - Applies the `autoFix` text replacement
   - Green gradient button with wand icon
   - Triggers `onFixClick` callback

2. **AI-förslag** (AI suggestions)
   - Optional, shown if `onAISuggestClick` is provided
   - Gets AI-powered alternative suggestions
   - Outline button with sparkles icon
   - Triggers `onAISuggestClick` callback

3. **Dismiss** (X button)
   - Optional, shown if `onDismissClick` is provided
   - Removes feedback item from list
   - Ghost button with X icon
   - Triggers `onDismissClick` callback

## Empty State

When there are no feedback items, the panel shows an encouraging empty state:
- Green checkmark icon
- "Inga förbättringsförslag" heading
- Positive message about text quality

## Legal Check Footer

The panel footer displays legal compliance status:
- ✓ Godkänd (Approved) - if compliant
- ⚠ Granskning krävs (Review required) - if not compliant
- Shows legal notes if available
- Scale icon for visual identification

## Animations

The component uses smooth animations:
- Accordion expand/collapse (Radix UI built-in)
- Hover effects on feedback items
- Button hover and active states
- Smooth scrolling when clicking feedback items

## Responsive Design

The panel is designed to work in various layouts:
- Fixed width sidebar (recommended: 384px / w-96)
- Full-width mobile view
- Scrollable content area with ScrollArea component
- Flexible height with header and footer

## Accessibility

- Semantic HTML structure
- Keyboard navigation support (accordion, buttons)
- ARIA attributes from Radix UI primitives
- Screen reader friendly labels
- High contrast color coding

## Performance Considerations

- **Memoization**: Uses `useMemo` for grouping and counting
- **Efficient grouping**: Groups calculated once per feedback change
- **Minimal re-renders**: Only re-renders when analysis changes
- **Virtual scrolling**: Uses ScrollArea for large feedback lists

## Integration with Backend

The component expects data from the Expert AI Analyzer:

```typescript
// Backend response structure
interface OptimizeResponse {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  // ... other fields
  expertAnalysis?: ExpertAnalysis;  // Used by ExpertFeedbackPanel
}
```

## Styling

The component uses:
- Tailwind CSS for utility classes
- Inline styles for dynamic colors (severity-based)
- Radix UI primitives for accessible components
- Custom gradients for action buttons

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires CSS Grid and Flexbox support
- Uses CSS transforms for animations
- Requires JavaScript enabled

## Related Components

- **InlineHighlights**: Inline text highlighting (Task 10)
- **OneClickFix**: Automatic fix application (Task 12)
- **AIAssistedSelectionEdit**: AI-powered text selection editing (Task 13)
- **TextEditor**: Editable text component

## Future Enhancements

Potential improvements for future iterations:

1. **Filtering**: Filter by severity or expert type
2. **Sorting**: Custom sort options (severity, category, location)
3. **Search**: Search within feedback items
4. **Batch actions**: Apply or dismiss multiple items at once
5. **Export**: Export feedback as PDF or JSON
6. **History**: Track applied fixes with undo/redo
7. **Collaborative**: Real-time feedback from multiple experts
8. **Analytics**: Track which feedback types are most common

## Testing

Unit tests should cover:
- Feedback grouping by category
- Count calculation per category
- Empty state rendering
- Action button callbacks
- Legal check display
- Accordion expand/collapse

## Troubleshooting

### Panel not showing feedback

- Verify `analysis.improvements` is an array
- Check that feedback items have valid categories
- Ensure component is receiving updated analysis prop

### Action buttons not working

- Verify callback props are provided (`onFixClick`, etc.)
- Check that `actionable` is true for fix button
- Ensure event handlers are not being blocked

### Counts not updating

- Check that analysis prop is being updated
- Verify feedback array is immutable (create new array on changes)
- Use React DevTools to inspect prop changes

### Styling issues

- Verify Tailwind CSS is configured correctly
- Check that Radix UI components are installed
- Ensure custom colors are defined in theme

## License

Part of the OptiPrompt Perfect Swedish Pipeline feature.
