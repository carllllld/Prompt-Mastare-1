# Requirements Document

## Introduction

OptiPrompt's property form interface currently requires excessive scrolling to complete, reducing user efficiency and creating friction in the workflow. This feature introduces intelligent layout compression and scroll reduction techniques to minimize vertical space while maintaining usability, visual hierarchy, and accessibility. The solution will leverage collapsible sections, multi-column layouts, compact widgets, and smart defaults to create a more efficient form-filling experience.

## Glossary

- **Form_Interface**: The primary property data input interface (PromptFormProfessionalV2.tsx and PromptFormClean.tsx)
- **Widget_Panel**: The top status widgets showing usage quota, history, and upgrade options (CompactWidgets.tsx)
- **Form_Section**: A logical grouping of related form fields (e.g., "Grundläggande uppgifter", "Kök & Badrum")
- **Collapsible_Section**: A Form_Section that can be expanded or collapsed to show/hide content
- **Priority_Level**: Classification of form fields as "critical", "important", or "optional"
- **Viewport_Height**: The visible height of the browser window (vh units)
- **Scroll_Distance**: The total vertical distance a user must scroll to view all content
- **Compact_Mode**: A display mode that reduces spacing and font sizes while maintaining accessibility
- **Persistence_State**: The saved state of user preferences (collapsed sections, compact mode) stored in localStorage

## Requirements

### Requirement 1: Multi-Column Grid Layout

**User Story:** As a real estate broker, I want to see multiple form sections side-by-side on desktop, so that I can view more information without scrolling.

#### Acceptance Criteria

1. WHEN the viewport width is ≥1024px (desktop), THE Form_Interface SHALL display form sections in a 3-column grid layout
2. WHEN the viewport width is ≥768px AND <1024px (tablet), THE Form_Interface SHALL display form sections in a 2-column grid layout
3. WHEN the viewport width is <768px (mobile), THE Form_Interface SHALL display form sections in a 1-column layout
4. THE Form_Interface SHALL maintain equal height for sections within the same row
5. THE Form_Interface SHALL apply consistent gap spacing of 16px between grid items

### Requirement 2: Collapsible Section Management

**User Story:** As a user, I want to collapse optional form sections, so that I can focus on essential fields and reduce scrolling.

#### Acceptance Criteria

1. WHEN a Form_Section has Priority_Level "optional", THE Form_Interface SHALL render it as a Collapsible_Section
2. WHEN a user clicks a Collapsible_Section header, THE Form_Interface SHALL toggle the section between expanded and collapsed states
3. WHEN a Collapsible_Section is collapsed, THE Form_Interface SHALL display only the section header with a "Valfritt" badge
4. WHEN a Collapsible_Section is expanded, THE Form_Interface SHALL display all fields within that section
5. THE Form_Interface SHALL persist the collapsed/expanded state of each Collapsible_Section in Persistence_State
6. WHEN the Form_Interface loads, THE Form_Interface SHALL restore collapsed/expanded states from Persistence_State

### Requirement 3: Compact Widget Height Alignment

**User Story:** As a user, I want the top status widgets to have equal height, so that the layout looks professional and organized.

#### Acceptance Criteria

1. THE Widget_Panel SHALL render all widgets (Historik, Kvot, Upgrade) with equal height
2. WHEN the Widget_Panel contains 3 widgets, THE Form_Interface SHALL display them in a horizontal row on desktop
3. WHEN the viewport width is <768px, THE Widget_Panel SHALL stack widgets vertically
4. THE Widget_Panel SHALL use CSS flexbox with `align-items: stretch` to ensure equal heights
5. THE Widget_Panel SHALL maintain a maximum height of 120px per widget on desktop

### Requirement 4: Smart Default Collapsed Sections

**User Story:** As a new user, I want less important sections to be collapsed by default, so that I can focus on essential fields first.

#### Acceptance Criteria

1. WHEN a user visits the Form_Interface for the first time, THE Form_Interface SHALL collapse all sections with Priority_Level "optional"
2. WHEN a user visits the Form_Interface for the first time, THE Form_Interface SHALL expand all sections with Priority_Level "critical" or "important"
3. THE Form_Interface SHALL define "Planlösning & Detaljer", "Material & Teknik", and "Specialfunktioner" as Priority_Level "optional"
4. THE Form_Interface SHALL define "Grundläggande uppgifter", "Kök & Badrum", "Läge & Transport", and "Försäljningsargument" as Priority_Level "critical" or "important"
5. WHEN a user has Persistence_State, THE Form_Interface SHALL use the saved preferences instead of defaults

### Requirement 5: Sticky Header and Footer

**User Story:** As a user, I want the submit button and progress indicator to remain visible while scrolling, so that I can submit the form without scrolling back to the top or bottom.

#### Acceptance Criteria

1. THE Form_Interface SHALL render a sticky header containing the progress indicator at the top of the viewport
2. THE Form_Interface SHALL render a sticky footer containing the submit button at the bottom of the viewport
3. WHEN a user scrolls the Form_Interface, THE sticky header SHALL remain fixed at `top: 0` with `z-index: 50`
4. WHEN a user scrolls the Form_Interface, THE sticky footer SHALL remain fixed at `bottom: 0` with `z-index: 50`
5. THE Form_Interface SHALL apply appropriate padding to the main content area to prevent overlap with sticky elements

### Requirement 6: Reduced Vertical Spacing

**User Story:** As a user, I want tighter spacing between form elements, so that more content fits on screen without sacrificing readability.

#### Acceptance Criteria

1. THE Form_Interface SHALL reduce gap spacing between form fields from 16px to 12px within sections
2. THE Form_Interface SHALL reduce gap spacing between sections from 24px to 16px
3. THE Form_Interface SHALL reduce padding inside Form_Section containers from 16px to 12px
4. THE Form_Interface SHALL maintain minimum touch target size of 44x44px for interactive elements
5. THE Form_Interface SHALL maintain minimum font size of 14px for body text and 12px for labels

### Requirement 7: Compact Input Field Styling

**User Story:** As a user, I want form inputs to be more compact, so that more fields fit on screen while remaining usable.

#### Acceptance Criteria

1. THE Form_Interface SHALL reduce input field height from 40px to 36px for text inputs
2. THE Form_Interface SHALL reduce textarea minimum height from 80px to 64px
3. THE Form_Interface SHALL reduce select dropdown height from 40px to 36px
4. THE Form_Interface SHALL maintain 12px horizontal padding inside input fields
5. THE Form_Interface SHALL maintain 8px vertical padding inside input fields

### Requirement 8: Section Priority Visual Indicators

**User Story:** As a user, I want to see which sections are most important, so that I can prioritize filling them out.

#### Acceptance Criteria

1. WHEN a Form_Section has Priority_Level "critical", THE Form_Interface SHALL display a red accent border on the left side
2. WHEN a Form_Section has Priority_Level "important", THE Form_Interface SHALL display a yellow accent border on the left side
3. WHEN a Form_Section has Priority_Level "optional", THE Form_Interface SHALL display a gray accent border on the left side
4. THE Form_Interface SHALL display a priority badge in the section header showing "Viktigt" for critical, "Rekommenderat" for important, or "Valfritt" for optional
5. THE Form_Interface SHALL use color-blind safe color combinations for priority indicators

### Requirement 9: Scroll Distance Measurement

**User Story:** As a developer, I want to measure scroll reduction effectiveness, so that I can validate the feature's impact.

#### Acceptance Criteria

1. THE Form_Interface SHALL calculate total Scroll_Distance as the difference between scrollHeight and clientHeight
2. THE Form_Interface SHALL log Scroll_Distance to browser console in development mode
3. THE Form_Interface SHALL track Scroll_Distance before and after layout compression
4. THE Form_Interface SHALL achieve a minimum 40% reduction in Scroll_Distance on desktop viewports
5. THE Form_Interface SHALL achieve a minimum 25% reduction in Scroll_Distance on mobile viewports

### Requirement 10: Keyboard Navigation for Collapsible Sections

**User Story:** As a keyboard user, I want to expand/collapse sections using keyboard, so that I can navigate the form without a mouse.

#### Acceptance Criteria

1. WHEN a Collapsible_Section header receives focus, THE Form_Interface SHALL display a visible focus indicator
2. WHEN a user presses Enter or Space on a focused Collapsible_Section header, THE Form_Interface SHALL toggle the section state
3. WHEN a user presses Tab on a collapsed Collapsible_Section, THE Form_Interface SHALL move focus to the next interactive element
4. THE Form_Interface SHALL apply `role="button"` and `aria-expanded` attributes to Collapsible_Section headers
5. THE Form_Interface SHALL announce state changes to screen readers using aria-live regions

### Requirement 11: Responsive Section Reordering

**User Story:** As a mobile user, I want critical sections to appear first, so that I can complete essential fields without excessive scrolling.

#### Acceptance Criteria

1. WHEN the viewport width is <768px, THE Form_Interface SHALL reorder sections by Priority_Level (critical first, then important, then optional)
2. WHEN the viewport width is ≥768px, THE Form_Interface SHALL maintain the original section order
3. THE Form_Interface SHALL use CSS Grid `order` property for reordering
4. THE Form_Interface SHALL maintain logical tab order matching visual order
5. THE Form_Interface SHALL preserve section state (collapsed/expanded) during reordering

### Requirement 12: Compact Mode Toggle

**User Story:** As a power user, I want to enable an even more compact layout, so that I can maximize screen real estate.

#### Acceptance Criteria

1. THE Form_Interface SHALL provide a "Kompakt vy" toggle button in the sticky header
2. WHEN Compact_Mode is enabled, THE Form_Interface SHALL reduce all spacing by an additional 25%
3. WHEN Compact_Mode is enabled, THE Form_Interface SHALL reduce font sizes by 1px (minimum 12px)
4. WHEN Compact_Mode is enabled, THE Form_Interface SHALL reduce input heights by 4px (minimum 32px)
5. THE Form_Interface SHALL persist Compact_Mode preference in Persistence_State

### Requirement 13: Section Completion Indicators

**User Story:** As a user, I want to see which sections I've completed, so that I know what still needs attention.

#### Acceptance Criteria

1. WHEN all required fields in a Form_Section are filled, THE Form_Interface SHALL display a green checkmark icon in the section header
2. WHEN a Form_Section has validation errors, THE Form_Interface SHALL display a red warning icon in the section header
3. WHEN a Form_Section is partially complete, THE Form_Interface SHALL display a progress percentage in the section header
4. THE Form_Interface SHALL update completion indicators in real-time as users fill fields
5. THE Form_Interface SHALL calculate completion based on non-empty field values

### Requirement 14: Expand/Collapse All Sections

**User Story:** As a user, I want to expand or collapse all sections at once, so that I can quickly review all fields or focus on specific areas.

#### Acceptance Criteria

1. THE Form_Interface SHALL provide an "Expandera alla" button in the sticky header
2. THE Form_Interface SHALL provide a "Minimera alla" button in the sticky header
3. WHEN a user clicks "Expandera alla", THE Form_Interface SHALL expand all Collapsible_Section elements
4. WHEN a user clicks "Minimera alla", THE Form_Interface SHALL collapse all Collapsible_Section elements with Priority_Level "optional"
5. THE Form_Interface SHALL persist the new state of all sections in Persistence_State

### Requirement 15: Smooth Scroll to Section

**User Story:** As a user, I want to click on a priority checklist item and jump to that section, so that I can quickly navigate to incomplete fields.

#### Acceptance Criteria

1. WHEN a user clicks a priority checklist item, THE Form_Interface SHALL scroll to the corresponding Form_Section
2. THE Form_Interface SHALL use smooth scrolling behavior with `behavior: 'smooth'`
3. THE Form_Interface SHALL expand the target section if it is collapsed
4. THE Form_Interface SHALL apply a temporary highlight animation to the target section for 2 seconds
5. THE Form_Interface SHALL account for sticky header height when calculating scroll position

### Requirement 16: Performance Optimization for Large Forms

**User Story:** As a user, I want the form to remain responsive even with many fields, so that I can work efficiently without lag.

#### Acceptance Criteria

1. THE Form_Interface SHALL render collapsed sections without mounting their child components
2. WHEN a section is expanded, THE Form_Interface SHALL mount child components within 100ms
3. THE Form_Interface SHALL use React.memo for Form_Section components to prevent unnecessary re-renders
4. THE Form_Interface SHALL debounce Persistence_State updates to maximum 1 write per 500ms
5. THE Form_Interface SHALL achieve a Lighthouse performance score ≥90 on desktop

### Requirement 17: Print-Friendly Layout

**User Story:** As a user, I want to print the form with all sections expanded, so that I can review it on paper.

#### Acceptance Criteria

1. WHEN a user initiates print (Ctrl+P or Cmd+P), THE Form_Interface SHALL expand all Collapsible_Section elements
2. WHEN printing, THE Form_Interface SHALL remove sticky positioning from header and footer
3. WHEN printing, THE Form_Interface SHALL use a single-column layout regardless of viewport width
4. WHEN printing, THE Form_Interface SHALL hide interactive elements (collapse buttons, toggle switches)
5. WHEN print is cancelled or completed, THE Form_Interface SHALL restore the previous collapsed/expanded states

### Requirement 18: Accessibility Compliance

**User Story:** As a user with disabilities, I want the compressed layout to be fully accessible, so that I can use the form with assistive technologies.

#### Acceptance Criteria

1. THE Form_Interface SHALL maintain WCAG 2.1 Level AA contrast ratios for all text and interactive elements
2. THE Form_Interface SHALL provide text alternatives for all visual priority indicators
3. THE Form_Interface SHALL ensure all interactive elements are keyboard accessible
4. THE Form_Interface SHALL announce section state changes to screen readers
5. THE Form_Interface SHALL maintain logical focus order when sections are collapsed or reordered

### Requirement 19: Animation and Transitions

**User Story:** As a user, I want smooth animations when sections expand/collapse, so that the interface feels polished and professional.

#### Acceptance Criteria

1. WHEN a Collapsible_Section is toggled, THE Form_Interface SHALL animate the height transition over 200ms
2. THE Form_Interface SHALL use an easing function of `cubic-bezier(0.4, 0, 0.2, 1)` for collapse animations
3. WHEN a section is highlighted via scroll-to, THE Form_Interface SHALL apply a fade-in ring animation
4. THE Form_Interface SHALL respect user's `prefers-reduced-motion` setting and disable animations accordingly
5. THE Form_Interface SHALL ensure animations do not block user interaction

### Requirement 20: Mobile-Specific Optimizations

**User Story:** As a mobile user, I want the form optimized for touch interaction, so that I can complete it efficiently on my phone.

#### Acceptance Criteria

1. WHEN the viewport width is <768px, THE Form_Interface SHALL increase touch target sizes to minimum 48x48px
2. WHEN the viewport width is <768px, THE Form_Interface SHALL increase spacing between interactive elements to minimum 8px
3. WHEN the viewport width is <768px, THE Form_Interface SHALL use native select dropdowns instead of custom components
4. WHEN the viewport width is <768px, THE Form_Interface SHALL collapse the Widget_Panel by default
5. THE Form_Interface SHALL prevent zoom on input focus by using font-size ≥16px on mobile
