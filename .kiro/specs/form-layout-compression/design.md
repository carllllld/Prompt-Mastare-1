# Design Document: Form Layout Compression

## Overview

This feature introduces intelligent layout compression and scroll reduction techniques to OptiPrompt's property form interface. The solution leverages collapsible sections, multi-column responsive grid layouts, compact widgets, localStorage persistence, and smart defaults to minimize vertical scrolling while maintaining usability, visual hierarchy, and accessibility.

The design integrates with existing form components (PromptFormProfessionalV2.tsx, PromptFormClean.tsx, CompactWidgets.tsx, and FormSections/*) to create a more efficient form-filling experience that reduces scroll distance by 40% on desktop and 25% on mobile.

### Key Design Goals

1. **Minimize Vertical Scrolling**: Reduce scroll distance through multi-column layouts and collapsible sections
2. **Maintain Usability**: Preserve accessibility, touch targets, and readability standards
3. **Smart Defaults**: Collapse optional sections by default while keeping critical fields visible
4. **Persistent State**: Remember user preferences for collapsed/expanded sections and compact mode
5. **Responsive Design**: Adapt layout from 3-column (desktop) to 2-column (tablet) to 1-column (mobile)
6. **Performance**: Lazy-render collapsed sections and debounce state persistence

## Architecture

### Component Hierarchy

```
PromptFormProfessionalV2 (Main Form Container)
├── StickyHeader
│   ├── ProgressIndicator
│   ├── CompactModeToggle
│   ├── ExpandAllButton
│   └── CollapseAllButton
├── FormGridLayout (Responsive Grid Container)
│   ├── FormSection (Non-collapsible, priority-based styling)
│   │   ├── EssentialFieldsSection
│   │   ├── ImageSection
│   │   └── Other critical sections
│   └── CollapsibleFormSection (Collapsible, lazy-rendered)
│       ├── SectionHeader (clickable, keyboard accessible)
│       │   ├── PriorityBadge
│       │   ├── CompletionIndicator
│       │   └── CollapseIcon
│       └── SectionContent (conditionally rendered)
└── StickyFooter
    └── SubmitButton
```

### State Management Architecture


**Component-Level State** (React useState):
- `collapsedSections: Set<string>` - Tracks which sections are currently collapsed
- `compactMode: boolean` - Tracks whether compact mode is enabled
- `scrollDistance: { before: number; after: number }` - Tracks scroll reduction metrics

**Persisted State** (localStorage):
- `optiprompt-collapsed-sections` - JSON array of collapsed section IDs
- `optiprompt-compact-mode` - Boolean for compact mode preference
- Debounced writes (500ms) to minimize localStorage operations

**Derived State**:
- Section completion percentages (calculated from form field values)
- Priority checklist items (derived from form validation state)
- Responsive breakpoint (derived from window.innerWidth)

### Data Flow

1. **Initial Load**: Component reads localStorage → initializes state → renders with saved preferences
2. **User Interaction**: User toggles section → state updates → localStorage persists (debounced) → UI re-renders
3. **Form Submission**: Validation runs → incomplete sections auto-expand → scroll to first error
4. **Responsive Changes**: Window resize → breakpoint detection → grid layout adjusts → section order may change (mobile)

## Components and Interfaces

### 1. FormGridLayout Component

**Purpose**: Responsive grid container that adapts column count based on viewport width.

**Interface**:
```typescript
interface FormGridLayoutProps {
  children: React.ReactNode;
  compactMode?: boolean;
}
```

**Behavior**:
- Desktop (≥1024px): 3-column grid with 16px gap (12px in compact mode)
- Tablet (768px-1023px): 2-column grid with 16px gap (12px in compact mode)
- Mobile (<768px): 1-column layout with 12px gap (8px in compact mode)
- Uses CSS Grid with `auto-rows-max` for equal-height rows
- Applies `gap` property for consistent spacing

**CSS Implementation**:
```css
.form-grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px; /* 12px in compact mode */
  auto-rows: max-content;
}

@media (min-width: 768px) {
  .form-grid-layout {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .form-grid-layout {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### 2. CollapsibleFormSection Component

**Purpose**: Section container that can be collapsed/expanded with keyboard accessibility and lazy rendering.

**Interface**:
```typescript
interface CollapsibleFormSectionProps {
  id: string; // Unique identifier for persistence
  title: string;
  priority: 'critical' | 'important' | 'optional';
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  onToggle?: (id: string, isCollapsed: boolean) => void;
  completionPercentage?: number;
  hasErrors?: boolean;
}
```

**Behavior**:
- Renders header with title, priority badge, completion indicator, and collapse icon
- Conditionally renders children only when expanded (lazy rendering for performance)
- Animates height transition over 200ms with cubic-bezier(0.4, 0, 0.2, 1) easing
- Keyboard accessible: Enter/Space to toggle, Tab to navigate
- ARIA attributes: `role="button"`, `aria-expanded`, `aria-controls`
- Respects `prefers-reduced-motion` media query

**State Management**:
```typescript
const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed ?? false);

useEffect(() => {
  // Load from localStorage on mount
  const saved = localStorage.getItem('optiprompt-collapsed-sections');
  if (saved) {
    const collapsedIds = JSON.parse(saved);
    setIsCollapsed(collapsedIds.includes(id));
  }
}, [id]);

const handleToggle = () => {
  const newState = !isCollapsed;
  setIsCollapsed(newState);
  onToggle?.(id, newState);
  // Debounced localStorage write handled by parent
};
```

### 3. PriorityIndicator Component

**Purpose**: Visual indicator showing section priority with color-coded borders and badges.

**Interface**:
```typescript
interface PriorityIndicatorProps {
  priority: 'critical' | 'important' | 'optional';
  label?: string;
}
```

**Visual Design**:
- Critical: Red left border (4px), "Viktigt" badge, red-50 background
- Important: Yellow left border (4px), "Rekommenderat" badge, yellow-50 background
- Optional: Gray left border (4px), "Valfritt" badge, gray-50 background
- Color-blind safe: Uses both color and text labels
- WCAG AA contrast ratios maintained

### 4. CompletionIndicator Component

**Purpose**: Shows section completion status with icon and percentage.

**Interface**:
```typescript
interface CompletionIndicatorProps {
  percentage: number;
  hasErrors: boolean;
  totalFields: number;
  filledFields: number;
}
```

**Display Logic**:
- 100% complete: Green checkmark icon
- Has errors: Red warning icon
- Partial (1-99%): Progress percentage text
- 0%: Empty circle icon

### 5. StickyHeader Component

**Purpose**: Fixed header containing progress indicator and bulk action buttons.

**Interface**:
```typescript
interface StickyHeaderProps {
  priorityItems: PriorityItem[];
  compactMode: boolean;
  onCompactModeToggle: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onItemClick: (fieldName: string) => void;
}
```

**Layout**:
- Position: `sticky`, `top: 0`, `z-index: 50`
- Background: White with bottom border
- Contains: ProgressIndicator, CompactModeToggle, ExpandAll, CollapseAll buttons
- Height: 64px (fixed)

### 6. StickyFooter Component

**Purpose**: Fixed footer containing submit button.

**Interface**:
```typescript
interface StickyFooterProps {
  onSubmit: () => void;
  isPending: boolean;
  disabled: boolean;
}
```

**Layout**:
- Position: `sticky`, `bottom: 0`, `z-index: 50`
- Background: White with top border
- Contains: Submit button (full width on mobile, auto width on desktop)
- Height: 72px (fixed)

### 7. CompactWidgets Component (Enhanced)

**Purpose**: Top status widgets with equal height alignment.

**Enhancements**:
- Wrap widgets in flexbox container with `align-items: stretch`
- Set `max-height: 120px` on desktop
- Stack vertically on mobile (<768px)
- Maintain equal heights using flex: 1

**CSS**:
```css
.widget-panel {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.widget-panel > * {
  flex: 1;
  max-height: 120px;
}

@media (max-width: 767px) {
  .widget-panel {
    flex-direction: column;
  }
  .widget-panel > * {
    max-height: none;
  }
}
```

## Data Models

### CollapsedSectionsState

```typescript
interface CollapsedSectionsState {
  sectionIds: string[];
  lastUpdated: number; // timestamp
}
```

**Storage**: localStorage key `optiprompt-collapsed-sections`

### CompactModeState

```typescript
interface CompactModeState {
  enabled: boolean;
  lastUpdated: number;
}
```

**Storage**: localStorage key `optiprompt-compact-mode`

### PriorityItem

```typescript
interface PriorityItem {
  label: string;
  completed: boolean;
  fieldName: string;
  priority: 'critical' | 'important' | 'optional';
}
```

### SectionConfig

```typescript
interface SectionConfig {
  id: string;
  title: string;
  priority: 'critical' | 'important' | 'optional';
  defaultCollapsed: boolean;
  fields: string[]; // Field names for completion tracking
  order: number; // Display order (changes on mobile)
  mobileOrder: number; // Order on mobile (priority-based)
}
```

**Section Definitions**:
```typescript
const SECTION_CONFIGS: SectionConfig[] = [
  {
    id: 'essential-fields',
    title: 'Grundläggande uppgifter',
    priority: 'critical',
    defaultCollapsed: false,
    fields: ['address', 'area', 'livingArea', 'totalRooms', 'bedrooms', 'bathrooms'],
    order: 1,
    mobileOrder: 1
  },
  {
    id: 'images',
    title: 'Objektbilder',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['uploadedImages'],
    order: 2,
    mobileOrder: 3
  },
  {
    id: 'selling-points',
    title: 'Försäljningsargument',
    priority: 'critical',
    defaultCollapsed: false,
    fields: ['uniqueSellingPoints', 'uspChips'],
    order: 3,
    mobileOrder: 2
  },
  {
    id: 'kitchen-bathroom',
    title: 'Kök & Badrum',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['kitchenDescription', 'bathroomDescription', 'kitchenChips', 'bathroomChips'],
    order: 4,
    mobileOrder: 4
  },
  {
    id: 'location-transport',
    title: 'Läge & Transport',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['neighborhood', 'transport', 'view'],
    order: 5,
    mobileOrder: 5
  },
  {
    id: 'material-tech',
    title: 'Material & Teknik',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['flooring', 'heating', 'konstruktionMaterial', 'taktyp'],
    order: 6,
    mobileOrder: 7
  },
  {
    id: 'layout-details',
    title: 'Planlösning & Detaljer',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['layoutDescription', 'gardenDescription'],
    order: 7,
    mobileOrder: 8
  },
  {
    id: 'special-features',
    title: 'Specialfunktioner',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['specialFeatures', 'specialChips'],
    order: 8,
    mobileOrder: 9
  }
];
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas where properties can be consolidated:

**Redundancy Elimination**:
1. Requirements 1.1, 1.2, 1.3 (responsive grid columns) → Combined into Property 1
2. Requirements 2.3, 2.4 (collapsed/expanded rendering) → Combined into Property 3
3. Requirements 5.3, 5.4 (sticky positioning during scroll) → Combined into Property 7
4. Requirements 8.1, 8.2, 8.3 (priority border colors) → Combined into Property 10
5. Requirements 11.1, 11.2 (responsive section ordering) → Combined into Property 15

**Example vs Property Classification**:
- Specific CSS values (6.1-6.3, 7.1-7.5) are marked as examples since they test exact pixel values
- Configuration checks (4.3, 4.4) are examples since they verify specific section assignments
- Behavioral rules that apply across all inputs are properties

### Property 1: Responsive Grid Layout

*For any* viewport width, the Form_Interface grid layout should display the correct number of columns: 3 columns when width ≥1024px, 2 columns when 768px ≤ width <1024px, and 1 column when width <768px.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Equal Row Heights

*For any* row in the FormGridLayout, all sections within that row should have equal computed heights when rendered.

**Validates: Requirements 1.4**

### Property 3: Collapsible Section Rendering

*For any* CollapsibleFormSection, when collapsed it should render only the header with a "Valfritt" badge, and when expanded it should render all child fields.

**Validates: Requirements 2.3, 2.4**

### Property 4: Section State Persistence Round-Trip

*For any* set of collapsed section IDs, saving to localStorage then loading from localStorage should restore the exact same set of collapsed sections.

**Validates: Requirements 2.5, 2.6**

### Property 5: Priority-Based Collapsibility

*For any* Form_Section with priority "optional", it should be rendered as a CollapsibleFormSection; sections with priority "critical" or "important" should be non-collapsible.

**Validates: Requirements 2.1**

### Property 6: Widget Panel Equal Heights

*For any* set of widgets in the Widget_Panel on desktop viewport (≥768px), all widgets should have equal computed heights.

**Validates: Requirements 3.1, 3.4**

### Property 7: Sticky Positioning During Scroll

*For any* scroll position, the sticky header should remain at top: 0 with z-index: 50, and the sticky footer should remain at bottom: 0 with z-index: 50.

**Validates: Requirements 5.3, 5.4**

### Property 8: Minimum Touch Target Size

*For any* interactive element in the Form_Interface, its computed width and height should be at least 44x44px (48x48px on mobile viewports <768px).

**Validates: Requirements 6.4, 20.1**

### Property 9: Minimum Font Sizes

*For any* text element, body text should have font-size ≥14px and labels should have font-size ≥12px (inputs ≥16px on mobile to prevent zoom).

**Validates: Requirements 6.5, 20.5**

### Property 10: Priority Visual Indicators

*For any* Form_Section, its left border color and badge text should match its priority level: red border + "Viktigt" for critical, yellow border + "Rekommenderat" for important, gray border + "Valfritt" for optional.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 11: WCAG Color Contrast

*For any* text or interactive element, the color contrast ratio between foreground and background should meet WCAG 2.1 Level AA requirements (4.5:1 for normal text, 3:1 for large text).

**Validates: Requirements 8.5, 18.1**

### Property 12: Scroll Distance Calculation

*For any* rendered Form_Interface, the calculated scroll distance should equal scrollHeight minus clientHeight.

**Validates: Requirements 9.1**

### Property 13: Scroll Distance Reduction

*For any* Form_Interface with layout compression enabled, the scroll distance should be reduced by at least 40% on desktop viewports (≥1024px) and 25% on mobile viewports (<768px) compared to the uncompressed layout.

**Validates: Requirements 9.4, 9.5**

### Property 14: Keyboard Toggle Interaction

*For any* CollapsibleFormSection header with focus, pressing Enter or Space should toggle the section's collapsed/expanded state.

**Validates: Requirements 10.2**

### Property 15: Responsive Section Reordering

*For any* viewport width, sections should be ordered by their `order` property when width ≥768px, and by their `mobileOrder` property (priority-based) when width <768px.

**Validates: Requirements 11.1, 11.2**

### Property 16: Tab Order Matches Visual Order

*For any* layout configuration (including after reordering), the tab order of interactive elements should match their visual order on screen.

**Validates: Requirements 11.4**

### Property 17: State Preservation During Reordering

*For any* section's collapsed/expanded state, that state should be preserved when the viewport width changes and sections are reordered.

**Validates: Requirements 11.5**

### Property 18: Compact Mode Spacing Reduction

*For any* spacing value in normal mode, enabling compact mode should reduce that spacing by 25% (e.g., 16px → 12px, 12px → 9px).

**Validates: Requirements 12.2**

### Property 19: Compact Mode Font Size Reduction

*For any* text element, enabling compact mode should reduce font size by 1px with a minimum of 12px (e.g., 14px → 13px, 12px → 12px).

**Validates: Requirements 12.3**

### Property 20: Compact Mode Persistence Round-Trip

*For any* compact mode state (enabled/disabled), saving to localStorage then loading should restore the exact same state.

**Validates: Requirements 12.5**

### Property 21: Section Completion Calculation

*For any* Form_Section with N total fields and M filled fields, the completion percentage should equal Math.round((M / N) * 100).

**Validates: Requirements 13.5**

### Property 22: Real-Time Completion Updates

*For any* field value change, the corresponding section's completion indicator should update within 100ms.

**Validates: Requirements 13.4**

### Property 23: Expand All Functionality

*For any* Form_Interface state, clicking "Expandera alla" should result in all CollapsibleFormSection elements being in the expanded state.

**Validates: Requirements 14.3**

### Property 24: Collapse All Functionality

*For any* Form_Interface state, clicking "Minimera alla" should result in all CollapsibleFormSection elements with priority "optional" being in the collapsed state, while "critical" and "important" sections remain expanded.

**Validates: Requirements 14.4**

### Property 25: Scroll-To-Section Behavior

*For any* priority checklist item click, the Form_Interface should scroll to the corresponding section, expand it if collapsed, and apply a highlight animation for 2 seconds.

**Validates: Requirements 15.1, 15.3, 15.4**

### Property 26: Scroll Position Offset

*For any* scroll-to-section operation, the final scroll position should account for the sticky header height to ensure the target section is fully visible.

**Validates: Requirements 15.5**

### Property 27: Lazy Rendering of Collapsed Sections

*For any* CollapsibleFormSection in collapsed state, its child components should not be mounted in the DOM.

**Validates: Requirements 16.1**

### Property 28: Debounced Persistence

*For any* sequence of state changes occurring within 500ms, only one localStorage write operation should occur at the end of the sequence.

**Validates: Requirements 16.4**

### Property 29: Print Mode Expansion

*For any* Form_Interface state, triggering print mode should expand all CollapsibleFormSection elements and remove sticky positioning from header and footer.

**Validates: Requirements 17.1, 17.2**

### Property 30: Print Mode State Restoration

*For any* Form_Interface state before print, cancelling or completing print should restore the exact same collapsed/expanded state for all sections.

**Validates: Requirements 17.5**

### Property 31: Keyboard Accessibility

*For any* interactive element in the Form_Interface, it should be reachable and activatable using only keyboard navigation (Tab, Enter, Space, Arrow keys).

**Validates: Requirements 18.3**

### Property 32: ARIA Attributes for Collapsible Sections

*For any* CollapsibleFormSection header, it should have `role="button"`, `aria-expanded` matching its current state, and `aria-controls` pointing to its content region.

**Validates: Requirements 10.4**

### Property 33: Animation Timing

*For any* CollapsibleFormSection toggle, the height transition animation should complete within 200ms ± 20ms.

**Validates: Requirements 19.1**

### Property 34: Reduced Motion Respect

*For any* user with `prefers-reduced-motion: reduce` set, all animations should be disabled (transition duration set to 0ms).

**Validates: Requirements 19.4**

### Property 35: Non-Blocking Animations

*For any* animation in progress, interactive elements should remain clickable and functional throughout the animation.

**Validates: Requirements 19.5**

### Property 36: Mobile Touch Spacing

*For any* pair of adjacent interactive elements on mobile viewport (<768px), the spacing between them should be at least 8px.

**Validates: Requirements 20.2**

### Property 37: Mobile Native Selects

*For any* select dropdown on mobile viewport (<768px), it should render as a native HTML select element rather than a custom component.

**Validates: Requirements 20.3**


## Error Handling

### localStorage Failures

**Scenario**: localStorage is unavailable (private browsing, quota exceeded, disabled)

**Handling**:
```typescript
function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to save to localStorage: ${key}`, error);
    // Fallback: Keep state in memory only
    return false;
  }
}

function safeLocalStorageGet(key: string, defaultValue: string): string {
  try {
    return localStorage.getItem(key) ?? defaultValue;
  } catch (error) {
    console.warn(`Failed to read from localStorage: ${key}`, error);
    return defaultValue;
  }
}
```

**User Impact**: State persists only for current session; resets on page reload. No error shown to user.

### Invalid Persisted State

**Scenario**: localStorage contains corrupted or invalid JSON

**Handling**:
```typescript
function loadCollapsedSections(): Set<string> {
  try {
    const saved = localStorage.getItem('optiprompt-collapsed-sections');
    if (!saved) return new Set();
    
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      console.warn('Invalid collapsed sections format, resetting');
      return new Set();
    }
    
    return new Set(parsed.filter(id => typeof id === 'string'));
  } catch (error) {
    console.warn('Failed to parse collapsed sections, resetting', error);
    return new Set();
  }
}
```

**User Impact**: Falls back to default state (optional sections collapsed). No error shown to user.

### Animation Performance Issues

**Scenario**: Device has limited resources, animations cause jank

**Handling**:
- Detect `prefers-reduced-motion` and disable animations
- Use CSS `will-change` property sparingly
- Limit concurrent animations to 3 sections max
- Fallback to instant state changes if frame rate drops below 30fps

```typescript
const [animationBudget, setAnimationBudget] = useState(3);

useEffect(() => {
  let frameCount = 0;
  let lastTime = performance.now();
  
  const checkFrameRate = () => {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      const fps = frameCount;
      frameCount = 0;
      lastTime = now;
      
      if (fps < 30) {
        setAnimationBudget(0); // Disable animations
      }
    }
    requestAnimationFrame(checkFrameRate);
  };
  
  const rafId = requestAnimationFrame(checkFrameRate);
  return () => cancelAnimationFrame(rafId);
}, []);
```

### Scroll-to-Section Failures

**Scenario**: Target section doesn't exist or is not in DOM

**Handling**:
```typescript
function scrollToSection(sectionId: string): boolean {
  const element = document.getElementById(sectionId);
  if (!element) {
    console.warn(`Section not found: ${sectionId}`);
    return false;
  }
  
  try {
    const headerHeight = document.querySelector('.sticky-header')?.clientHeight ?? 0;
    const targetPosition = element.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
    
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
    
    return true;
  } catch (error) {
    console.error('Scroll failed', error);
    // Fallback: instant scroll
    element.scrollIntoView();
    return false;
  }
}
```

**User Impact**: Falls back to instant scroll if smooth scroll fails. Logs warning if section not found.

### Responsive Breakpoint Detection Failures

**Scenario**: window.matchMedia not supported or returns unexpected values

**Handling**:
```typescript
function useBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      const width = window.innerWidth;
      const newBreakpoint = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
      if (newBreakpoint !== breakpoint) {
        setBreakpoint(newBreakpoint);
      }
    };
    
    // Debounce resize events
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };
    
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [breakpoint]);
  
  return breakpoint;
}
```

**User Impact**: Falls back to window.innerWidth measurement. Layout updates with 150ms debounce to prevent excessive re-renders.

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Test specific breakpoint values (767px, 768px, 1023px, 1024px)
- Test localStorage read/write with mocked storage
- Test component rendering with specific props
- Test event handlers and callbacks
- Test error boundaries and fallback behavior

**Property-Based Tests**: Verify universal properties across all inputs
- Test responsive layout with random viewport widths
- Test state persistence with random section configurations
- Test completion calculations with random field counts
- Test animation timing with random toggle sequences
- Test accessibility with random DOM structures

### Property-Based Testing Configuration

**Library**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**:
```typescript
import fc from 'fast-check';

// Minimum 100 iterations per property test
fc.configureGlobal({ numRuns: 100 });
```

**Test Tagging Format**:
```typescript
describe('Form Layout Compression', () => {
  it('Property 1: Responsive Grid Layout - Feature: form-layout-compression, Property 1: For any viewport width, the Form_Interface grid layout should display the correct number of columns', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // Random viewport width
        (viewportWidth) => {
          // Test implementation
          const expectedColumns = 
            viewportWidth >= 1024 ? 3 :
            viewportWidth >= 768 ? 2 : 1;
          
          const actualColumns = getGridColumns(viewportWidth);
          return actualColumns === expectedColumns;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Coverage Requirements

**Unit Tests**:
- Component rendering (all components)
- Event handlers (click, keyboard, scroll)
- State management (useState, useEffect)
- localStorage operations (save, load, error handling)
- CSS class application
- ARIA attribute presence
- Error boundaries

**Property-Based Tests** (minimum 100 iterations each):
- Property 1: Responsive Grid Layout
- Property 2: Equal Row Heights
- Property 3: Collapsible Section Rendering
- Property 4: Section State Persistence Round-Trip
- Property 8: Minimum Touch Target Size
- Property 9: Minimum Font Sizes
- Property 10: Priority Visual Indicators
- Property 11: WCAG Color Contrast
- Property 12: Scroll Distance Calculation
- Property 13: Scroll Distance Reduction
- Property 15: Responsive Section Reordering
- Property 18: Compact Mode Spacing Reduction
- Property 21: Section Completion Calculation
- Property 28: Debounced Persistence
- Property 34: Reduced Motion Respect

**Integration Tests**:
- Full form submission flow with collapsed sections
- Responsive layout changes during user interaction
- Print mode activation and restoration
- Keyboard navigation through entire form
- Screen reader announcements (using @testing-library/react with jest-axe)

### Example Property Test Implementation

```typescript
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { FormGridLayout } from './FormGridLayout';

describe('Property 4: Section State Persistence Round-Trip', () => {
  it('Feature: form-layout-compression, Property 4: For any set of collapsed section IDs, saving to localStorage then loading should restore the exact same set', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 0, maxLength: 10 }), // Random section IDs
        (sectionIds) => {
          // Save to localStorage
          const uniqueIds = [...new Set(sectionIds)];
          localStorage.setItem('optiprompt-collapsed-sections', JSON.stringify(uniqueIds));
          
          // Load from localStorage
          const loaded = JSON.parse(localStorage.getItem('optiprompt-collapsed-sections') || '[]');
          
          // Verify round-trip
          return JSON.stringify(uniqueIds.sort()) === JSON.stringify(loaded.sort());
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Performance Testing

**Metrics to Track**:
- Initial render time (<500ms)
- Section toggle time (<200ms)
- localStorage write time (<50ms)
- Scroll-to-section time (<300ms)
- Memory usage (no leaks after 100 toggles)

**Tools**:
- React DevTools Profiler
- Chrome DevTools Performance tab
- Lighthouse performance audit (target: ≥90 score)

### Accessibility Testing

**Manual Testing**:
- Keyboard-only navigation through entire form
- Screen reader testing (NVDA, JAWS, VoiceOver)
- High contrast mode verification
- Zoom to 200% (text should remain readable)

**Automated Testing**:
- jest-axe for WCAG violations
- pa11y for automated accessibility audits
- Color contrast checker for all color combinations

### Browser Compatibility Testing

**Target Browsers**:
- Chrome 90+ (primary)
- Firefox 88+ (secondary)
- Safari 14+ (secondary)
- Edge 90+ (tertiary)

**Features Requiring Polyfills**:
- CSS Grid (supported in all target browsers)
- CSS Sticky positioning (supported in all target browsers)
- localStorage (supported in all target browsers)
- matchMedia (supported in all target browsers)

**Fallbacks**:
- If CSS Grid not supported: Fall back to flexbox layout
- If sticky positioning not supported: Use fixed positioning
- If localStorage not available: Keep state in memory only


## Implementation Details

### Responsive Breakpoints

```typescript
// Breakpoint constants
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

// Tailwind CSS breakpoint classes
// sm: 640px (not used in this feature)
// md: 768px (tablet breakpoint)
// lg: 1024px (desktop breakpoint)
// xl: 1280px (not used in this feature)
```

### CSS Grid Implementation

```css
/* Base grid layout */
.form-grid-layout {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: 1 column */
  gap: 12px;
  auto-rows: max-content;
  padding: 12px;
}

/* Tablet: 2 columns */
@media (min-width: 768px) {
  .form-grid-layout {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    padding: 16px;
  }
}

/* Desktop: 3 columns */
@media (min-width: 1024px) {
  .form-grid-layout {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    padding: 16px;
  }
}

/* Compact mode adjustments */
.form-grid-layout.compact {
  gap: 9px; /* 25% reduction from 12px */
  padding: 9px;
}

@media (min-width: 768px) {
  .form-grid-layout.compact {
    gap: 12px; /* 25% reduction from 16px */
    padding: 12px;
  }
}

/* Full-width sections */
.form-section-full {
  grid-column: 1 / -1;
}

/* Mobile reordering by priority */
@media (max-width: 767px) {
  .form-section[data-priority="critical"] {
    order: 1;
  }
  .form-section[data-priority="important"] {
    order: 2;
  }
  .form-section[data-priority="optional"] {
    order: 3;
  }
}
```

### Collapsible Section Animation

```css
.collapsible-section-content {
  overflow: hidden;
  transition: height 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .collapsible-section-content {
    transition: none;
  }
}

/* Highlight animation for scroll-to-section */
@keyframes highlight-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

.section-highlight {
  animation: highlight-pulse 2s ease-out;
}
```

### Sticky Header/Footer Implementation

```css
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: white;
  border-bottom: 2px solid #e2e8f0;
  padding: 12px 16px;
  height: 64px;
}

.sticky-footer {
  position: sticky;
  bottom: 0;
  z-index: 50;
  background: white;
  border-top: 2px solid #e2e8f0;
  padding: 16px;
  height: 72px;
}

/* Prevent content overlap */
.form-content {
  padding-top: 8px; /* Space below sticky header */
  padding-bottom: 8px; /* Space above sticky footer */
}

/* Print mode: remove sticky positioning */
@media print {
  .sticky-header,
  .sticky-footer {
    position: static;
  }
}
```

### localStorage Debouncing

```typescript
import { useRef, useEffect } from 'react';

function useDebouncedLocalStorage<T>(
  key: string,
  value: T,
  delay: number = 500
): void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(`Failed to save ${key} to localStorage`, error);
      }
    }, delay);
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, delay]);
}

// Usage
function MyComponent() {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // Debounced save to localStorage
  useDebouncedLocalStorage(
    'optiprompt-collapsed-sections',
    Array.from(collapsedSections),
    500
  );
  
  return <div>...</div>;
}
```

### Completion Calculation

```typescript
interface SectionCompletionInfo {
  percentage: number;
  filledFields: number;
  totalFields: number;
  hasErrors: boolean;
}

function calculateSectionCompletion(
  sectionConfig: SectionConfig,
  formValues: Record<string, any>,
  formErrors: Record<string, any>
): SectionCompletionInfo {
  const { fields } = sectionConfig;
  
  let filledFields = 0;
  let totalFields = fields.length;
  let hasErrors = false;
  
  for (const fieldName of fields) {
    const value = formValues[fieldName];
    
    // Check if field has error
    if (formErrors[fieldName]) {
      hasErrors = true;
    }
    
    // Check if field is filled
    if (value !== undefined && value !== null && value !== '') {
      // Handle array fields (chips)
      if (Array.isArray(value) && value.length > 0) {
        filledFields++;
      }
      // Handle string fields
      else if (typeof value === 'string' && value.trim() !== '') {
        filledFields++;
      }
      // Handle boolean fields
      else if (typeof value === 'boolean') {
        filledFields++;
      }
      // Handle number fields
      else if (typeof value === 'number') {
        filledFields++;
      }
    }
  }
  
  const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  
  return {
    percentage,
    filledFields,
    totalFields,
    hasErrors
  };
}
```

### Scroll-to-Section with Offset

```typescript
function scrollToSection(
  sectionId: string,
  options: {
    behavior?: ScrollBehavior;
    headerOffset?: number;
    additionalOffset?: number;
  } = {}
): void {
  const {
    behavior = 'smooth',
    headerOffset = 64, // Default sticky header height
    additionalOffset = 16 // Additional padding
  } = options;
  
  const element = document.getElementById(sectionId);
  if (!element) {
    console.warn(`Section not found: ${sectionId}`);
    return;
  }
  
  // Calculate target position
  const elementRect = element.getBoundingClientRect();
  const absoluteTop = elementRect.top + window.scrollY;
  const targetPosition = absoluteTop - headerOffset - additionalOffset;
  
  // Scroll to position
  window.scrollTo({
    top: targetPosition,
    behavior
  });
  
  // Apply highlight animation
  element.classList.add('section-highlight');
  setTimeout(() => {
    element.classList.remove('section-highlight');
  }, 2000);
}
```

### Priority Checklist Integration

```typescript
function usePriorityChecklist(
  formValues: Record<string, any>,
  formErrors: Record<string, any>,
  sectionConfigs: SectionConfig[]
): PriorityItem[] {
  return useMemo(() => {
    const items: PriorityItem[] = [];
    
    for (const config of sectionConfigs) {
      const completion = calculateSectionCompletion(config, formValues, formErrors);
      
      items.push({
        label: config.title,
        completed: completion.percentage === 100 && !completion.hasErrors,
        fieldName: config.fields[0], // First field for scroll-to
        priority: config.priority
      });
    }
    
    // Sort by priority: critical first, then important, then optional
    return items.sort((a, b) => {
      const priorityOrder = { critical: 0, important: 1, optional: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [formValues, formErrors, sectionConfigs]);
}
```

### Compact Mode Implementation

```typescript
interface CompactModeContextValue {
  compactMode: boolean;
  toggleCompactMode: () => void;
}

const CompactModeContext = createContext<CompactModeContextValue>({
  compactMode: false,
  toggleCompactMode: () => {}
});

export function CompactModeProvider({ children }: { children: React.ReactNode }) {
  const [compactMode, setCompactMode] = useState(() => {
    try {
      const saved = localStorage.getItem('optiprompt-compact-mode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  
  const toggleCompactMode = useCallback(() => {
    setCompactMode(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem('optiprompt-compact-mode', JSON.stringify(newValue));
      } catch (error) {
        console.warn('Failed to save compact mode preference', error);
      }
      return newValue;
    });
  }, []);
  
  return (
    <CompactModeContext.Provider value={{ compactMode, toggleCompactMode }}>
      {children}
    </CompactModeContext.Provider>
  );
}

export function useCompactMode() {
  return useContext(CompactModeContext);
}

// Usage in components
function MyComponent() {
  const { compactMode } = useCompactMode();
  
  return (
    <div className={compactMode ? 'compact' : ''}>
      {/* Content */}
    </div>
  );
}
```

### Print Mode Handling

```typescript
function usePrintMode(
  collapsedSections: Set<string>,
  setCollapsedSections: (sections: Set<string>) => void
): void {
  useEffect(() => {
    let savedState: Set<string> | null = null;
    
    const handleBeforePrint = () => {
      // Save current state
      savedState = new Set(collapsedSections);
      
      // Expand all sections
      setCollapsedSections(new Set());
    };
    
    const handleAfterPrint = () => {
      // Restore previous state
      if (savedState) {
        setCollapsedSections(savedState);
        savedState = null;
      }
    };
    
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [collapsedSections, setCollapsedSections]);
}
```

### Mobile-Specific Optimizations

```typescript
function useMobileOptimizations() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return {
    isMobile,
    touchTargetSize: isMobile ? 48 : 44,
    inputFontSize: isMobile ? 16 : 14, // Prevent zoom on focus
    useNativeSelects: isMobile
  };
}
```

## Performance Optimization Strategies

### 1. Lazy Rendering

Only render section content when expanded:

```typescript
function CollapsibleFormSection({ children, isCollapsed }: Props) {
  return (
    <div>
      <SectionHeader />
      {!isCollapsed && (
        <div className="section-content">
          {children}
        </div>
      )}
    </div>
  );
}
```

### 2. React.memo for Sections

Prevent unnecessary re-renders:

```typescript
export const FormSection = React.memo(function FormSection({ 
  title, 
  priority, 
  children 
}: FormSectionProps) {
  return (
    <div className={`form-section priority-${priority}`}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if title, priority, or children change
  return (
    prevProps.title === nextProps.title &&
    prevProps.priority === nextProps.priority &&
    prevProps.children === nextProps.children
  );
});
```

### 3. Debounced State Updates

Batch localStorage writes:

```typescript
const debouncedSave = useMemo(
  () => debounce((value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, 500),
  [key]
);
```

### 4. Virtual Scrolling (Future Enhancement)

For forms with 20+ sections, consider react-window:

```typescript
import { FixedSizeList } from 'react-window';

function VirtualizedFormSections({ sections }: Props) {
  return (
    <FixedSizeList
      height={600}
      itemCount={sections.length}
      itemSize={200}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <FormSection {...sections[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### 5. CSS Containment

Improve rendering performance:

```css
.form-section {
  contain: layout style paint;
}

.collapsible-section-content {
  contain: layout style;
}
```

### 6. Intersection Observer for Lazy Loading

Load section content when scrolled into view:

```typescript
function useLazySection(ref: RefObject<HTMLElement>) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [ref]);
  
  return isVisible;
}
```

## Accessibility Implementation Details

### ARIA Attributes

```typescript
function CollapsibleSectionHeader({ 
  id, 
  isExpanded, 
  onToggle 
}: Props) {
  return (
    <button
      type="button"
      id={`${id}-header`}
      aria-expanded={isExpanded}
      aria-controls={`${id}-content`}
      onClick={onToggle}
      className="section-header"
    >
      <span>{title}</span>
      <ChevronIcon aria-hidden="true" />
    </button>
  );
}

function CollapsibleSectionContent({ id, children }: Props) {
  return (
    <div
      id={`${id}-content`}
      role="region"
      aria-labelledby={`${id}-header`}
      className="section-content"
    >
      {children}
    </div>
  );
}
```

### Screen Reader Announcements

```typescript
function useScreenReaderAnnouncement() {
  const [announcement, setAnnouncement] = useState('');
  
  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);
  
  return {
    announcement,
    announce,
    AnnouncementRegion: () => (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    )
  };
}

// Usage
function CollapsibleSection() {
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncement();
  
  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    announce(newState ? `${title} expanded` : `${title} collapsed`);
  };
  
  return (
    <>
      <button onClick={handleToggle}>Toggle</button>
      <AnnouncementRegion />
    </>
  );
}
```

### Focus Management

```typescript
function useFocusManagement() {
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  
  const saveFocus = useCallback(() => {
    lastFocusedElement.current = document.activeElement as HTMLElement;
  }, []);
  
  const restoreFocus = useCallback(() => {
    if (lastFocusedElement.current) {
      lastFocusedElement.current.focus();
    }
  }, []);
  
  return { saveFocus, restoreFocus };
}
```

### Keyboard Navigation

```typescript
function useKeyboardNavigation(
  onExpand: () => void,
  onCollapse: () => void,
  onNext: () => void,
  onPrevious: () => void
) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        isExpanded ? onCollapse() : onExpand();
        break;
      case 'ArrowDown':
        e.preventDefault();
        onNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        onPrevious();
        break;
      case 'Home':
        e.preventDefault();
        // Focus first section
        break;
      case 'End':
        e.preventDefault();
        // Focus last section
        break;
    }
  }, [isExpanded, onExpand, onCollapse, onNext, onPrevious]);
  
  return { handleKeyDown };
}
```

## Migration Strategy

### Phase 1: Add New Components (No Breaking Changes)

1. Create new components: `FormGridLayout`, `CollapsibleFormSection`, `StickyHeader`, `StickyFooter`
2. Add to existing codebase without modifying current forms
3. Test components in isolation

### Phase 2: Integrate with PromptFormProfessionalV2

1. Wrap existing sections in `FormGridLayout`
2. Convert optional sections to `CollapsibleFormSection`
3. Add sticky header/footer
4. Test with existing functionality

### Phase 3: Add State Management

1. Implement localStorage persistence
2. Add compact mode toggle
3. Add expand/collapse all buttons
4. Test state persistence

### Phase 4: Optimize and Polish

1. Add animations
2. Implement lazy rendering
3. Add performance monitoring
4. Conduct accessibility audit

### Phase 5: Rollout

1. Feature flag for gradual rollout
2. A/B test with 10% of users
3. Monitor metrics (scroll distance, completion rate, time to submit)
4. Full rollout if metrics improve

## Success Metrics

### Primary Metrics

1. **Scroll Distance Reduction**: ≥40% on desktop, ≥25% on mobile
2. **Form Completion Rate**: Increase by ≥5%
3. **Time to Submit**: Decrease by ≥10%

### Secondary Metrics

1. **User Satisfaction**: Survey score ≥4.5/5
2. **Accessibility Score**: WCAG 2.1 Level AA compliance
3. **Performance Score**: Lighthouse ≥90
4. **Error Rate**: No increase in form validation errors

### Monitoring

```typescript
// Track scroll distance
function trackScrollDistance() {
  const before = document.documentElement.scrollHeight - window.innerHeight;
  
  // After layout compression
  const after = document.documentElement.scrollHeight - window.innerHeight;
  
  const reduction = ((before - after) / before) * 100;
  
  analytics.track('scroll_distance_reduction', {
    before,
    after,
    reduction_percentage: reduction,
    viewport_width: window.innerWidth
  });
}

// Track section interactions
function trackSectionToggle(sectionId: string, isExpanded: boolean) {
  analytics.track('section_toggle', {
    section_id: sectionId,
    action: isExpanded ? 'expand' : 'collapse',
    timestamp: Date.now()
  });
}

// Track form completion time
function trackFormCompletion(startTime: number, endTime: number) {
  const duration = endTime - startTime;
  
  analytics.track('form_completion', {
    duration_ms: duration,
    duration_seconds: Math.round(duration / 1000),
    sections_collapsed: collapsedSections.size
  });
}
```

