# Implementation Plan: Form Layout Compression

## Overview

This implementation plan breaks down the form layout compression feature into discrete, actionable coding tasks. The feature introduces intelligent layout compression through collapsible sections, multi-column responsive grids, compact widgets, localStorage persistence, and smart defaults to reduce scroll distance by 40% on desktop and 25% on mobile.

The implementation follows a phased approach: core components first, then state management, responsive behavior, accessibility features, and finally integration with existing forms. Each task builds incrementally on previous work, with checkpoints to validate progress.

## Tasks

- [x] 1. Set up core component structure and utilities
  - Create `client/src/components/FormSections/FormGridLayout.tsx` with responsive grid container
  - Create `client/src/components/FormSections/CollapsibleFormSection.tsx` with collapse/expand functionality
  - Create `client/src/hooks/use-debounced-storage.ts` for localStorage debouncing
  - Create `client/src/hooks/use-breakpoint.ts` for responsive breakpoint detection
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 16.4_

- [x] 2. Implement FormGridLayout component
  - [x] 2.1 Create responsive grid with CSS Grid
    - Implement 3-column layout for desktop (≥1024px)
    - Implement 2-column layout for tablet (768px-1023px)
    - Implement 1-column layout for mobile (<768px)
    - Apply consistent gap spacing (16px desktop/tablet, 12px mobile)
    - Use `auto-rows: max-content` for equal row heights
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 Write property test for responsive grid layout
    - **Property 1: Responsive Grid Layout**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Test with random viewport widths (320px-2560px)
    - Verify correct column count for each breakpoint

  - [x] 2.3 Add compact mode support
    - Accept `compactMode` prop
    - Reduce gap spacing by 25% when enabled (12px → 9px, 16px → 12px)
    - Apply compact CSS classes conditionally
    - _Requirements: 12.2_

  - [ ]* 2.4 Write property test for compact mode spacing
    - **Property 18: Compact Mode Spacing Reduction**
    - **Validates: Requirements 12.2**
    - Test spacing reduction with random initial values

- [x] 3. Implement CollapsibleFormSection component
  - [x] 3.1 Create section header with toggle functionality
    - Render clickable header with title, priority badge, and collapse icon
    - Implement toggle handler for expand/collapse
    - Add keyboard support (Enter/Space to toggle)
    - Apply ARIA attributes (`role="button"`, `aria-expanded`, `aria-controls`)
    - _Requirements: 2.2, 10.1, 10.2, 10.4_

  - [x] 3.2 Implement collapsible content with animation
    - Conditionally render children only when expanded (lazy rendering)
    - Animate height transition over 200ms with cubic-bezier easing
    - Respect `prefers-reduced-motion` media query
    - Apply proper overflow handling during animation
    - _Requirements: 2.3, 2.4, 16.1, 19.1, 19.4, 19.5_

  - [ ]* 3.3 Write property test for collapsible rendering
    - **Property 3: Collapsible Section Rendering**
    - **Validates: Requirements 2.3, 2.4**
    - Test with random collapsed/expanded states

  - [x] 3.4 Add priority visual indicators
    - Display colored left border (red=critical, yellow=important, gray=optional)
    - Show priority badge in header ("Viktigt", "Rekommenderat", "Valfritt")
    - Ensure WCAG AA color contrast ratios
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 3.5 Write property test for priority indicators
    - **Property 10: Priority Visual Indicators**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
    - Test with all priority levels

- [ ] 4. Checkpoint - Core components functional
  - Ensure FormGridLayout renders with correct column counts at all breakpoints
  - Ensure CollapsibleFormSection toggles correctly with keyboard and mouse
  - Ensure animations work smoothly and respect reduced motion
  - Ask the user if questions arise

- [x] 5. Implement state management hooks
  - [x] 5.1 Create use-debounced-storage hook
    - Implement debounced localStorage writes (500ms delay)
    - Handle localStorage errors gracefully (quota exceeded, private browsing)
    - Return save/load functions with error handling
    - _Requirements: 16.4_

  - [ ]* 5.2 Write property test for debounced persistence
    - **Property 28: Debounced Persistence**
    - **Validates: Requirements 16.4**
    - Test with rapid state changes within 500ms window

  - [x] 5.3 Create use-breakpoint hook
    - Detect current breakpoint (mobile/tablet/desktop)
    - Listen to window resize events with debouncing (150ms)
    - Return current breakpoint state
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 5.4 Create use-collapsed-sections hook
    - Manage Set<string> of collapsed section IDs
    - Load initial state from localStorage on mount
    - Provide toggle, expandAll, collapseAll functions
    - Persist state changes with debouncing
    - _Requirements: 2.5, 2.6, 14.3, 14.4_

  - [ ]* 5.5 Write property test for state persistence round-trip
    - **Property 4: Section State Persistence Round-Trip**
    - **Validates: Requirements 2.5, 2.6**
    - Test with random sets of section IDs

  - [x] 5.6 Create use-compact-mode hook
    - Manage boolean compact mode state
    - Load initial state from localStorage
    - Provide toggle function
    - Persist state changes immediately
    - _Requirements: 12.1, 12.5_

  - [ ]* 5.7 Write property test for compact mode persistence
    - **Property 20: Compact Mode Persistence Round-Trip**
    - **Validates: Requirements 12.5**
    - Test with random boolean states

- [ ] 6. Implement section completion tracking
  - [x] 6.1 Create calculateSectionCompletion utility
    - Accept section config, form values, and form errors
    - Count filled vs total fields
    - Calculate completion percentage
    - Detect validation errors
    - _Requirements: 13.5_

  - [ ]* 6.2 Write property test for completion calculation
    - **Property 21: Section Completion Calculation**
    - **Validates: Requirements 13.5**
    - Test with random field counts and fill states

  - [ ] 6.3 Create CompletionIndicator component
    - Display green checkmark for 100% complete
    - Display red warning icon for errors
    - Display percentage for partial completion
    - Display empty circle for 0%
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ] 6.4 Integrate real-time completion updates
    - Watch form values with React Hook Form
    - Recalculate completion on field changes
    - Update indicators within 100ms
    - _Requirements: 13.4_

- [x] 7. Implement sticky header component
  - [x] 7.1 Create StickyHeader component
    - Apply sticky positioning (top: 0, z-index: 50)
    - Render ProgressIndicator component
    - Add CompactModeToggle button
    - Add "Expandera alla" button
    - Add "Minimera alla" button
    - Apply white background with bottom border
    - _Requirements: 5.1, 5.3, 12.1, 14.1, 14.2_

  - [x] 7.2 Implement expand/collapse all functionality
    - Wire "Expandera alla" to expandAll function
    - Wire "Minimera alla" to collapseAll function (only optional sections)
    - Persist state changes to localStorage
    - _Requirements: 14.3, 14.4_

  - [ ]* 7.3 Write unit tests for expand/collapse all
    - Test expandAll expands all sections
    - Test collapseAll only collapses optional sections
    - Test state persistence after bulk actions

- [-] 8. Implement sticky footer component
  - [x] 8.1 Create StickyFooter component
    - Apply sticky positioning (bottom: 0, z-index: 50)
    - Render submit button
    - Apply white background with top border
    - Make button full-width on mobile, auto-width on desktop
    - _Requirements: 5.2, 5.4_

  - [x] 8.2 Add content padding to prevent overlap
    - Apply padding-top to main content for header clearance
    - Apply padding-bottom to main content for footer clearance
    - _Requirements: 5.5_

- [ ] 9. Checkpoint - State management and sticky elements working
  - Ensure collapsed sections persist across page reloads
  - Ensure compact mode persists across page reloads
  - Ensure sticky header/footer remain visible during scroll
  - Ensure expand/collapse all buttons work correctly
  - Ask the user if questions arise

- [ ] 10. Implement priority checklist component
  - [ ] 10.1 Create PriorityChecklist component
    - Display list of priority items with completion status
    - Show progress bar with percentage
    - Color-code items by priority (critical/important/optional)
    - Make items clickable to scroll to section
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 10.2 Implement scroll-to-section functionality
    - Calculate scroll position accounting for sticky header height
    - Use smooth scroll behavior
    - Expand target section if collapsed
    - Apply highlight animation for 2 seconds
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 10.3 Write unit tests for scroll-to-section
    - Test scroll position calculation with various header heights
    - Test section expansion on scroll-to
    - Test highlight animation application and removal

- [ ] 11. Implement responsive section reordering
  - [ ] 11.1 Add priority-based ordering for mobile
    - Define `order` and `mobileOrder` properties in section configs
    - Apply CSS Grid `order` property based on viewport width
    - Critical sections first, then important, then optional on mobile
    - Maintain original order on desktop/tablet
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 11.2 Write property test for responsive reordering
    - **Property 15: Responsive Section Reordering**
    - **Validates: Requirements 11.1, 11.2**
    - Test with random viewport widths

  - [ ] 11.3 Ensure tab order matches visual order
    - Verify focus order after reordering
    - Test keyboard navigation through reordered sections
    - _Requirements: 11.4_

  - [ ] 11.4 Preserve section state during reordering
    - Ensure collapsed/expanded state maintained on viewport change
    - Test state preservation with rapid viewport changes
    - _Requirements: 11.5_

  - [ ]* 11.5 Write property test for state preservation
    - **Property 17: State Preservation During Reordering**
    - **Validates: Requirements 11.5**
    - Test with random section states and viewport changes

- [ ] 12. Implement print mode handling
  - [x] 12.1 Create use-print-mode hook
    - Listen to beforeprint event
    - Save current collapsed sections state
    - Expand all sections before print
    - Listen to afterprint event
    - Restore previous state after print
    - _Requirements: 17.1, 17.5_

  - [x] 12.2 Add print-specific CSS
    - Remove sticky positioning in print media query
    - Use single-column layout for print
    - Hide interactive elements (buttons, toggles)
    - _Requirements: 17.2, 17.3, 17.4_

  - [ ]* 12.3 Write unit tests for print mode
    - Test state save/restore cycle
    - Test all sections expanded during print
    - Test state restoration after print cancel

- [ ] 13. Checkpoint - Responsive behavior and print mode complete
  - Ensure sections reorder correctly on mobile
  - Ensure tab order matches visual order at all breakpoints
  - Ensure print mode expands all sections and restores state
  - Ask the user if questions arise

- [x] 14. Enhance CompactWidgets for equal heights
  - [x] 14.1 Update CompactWidgets.tsx with flexbox layout
    - Wrap widgets in flex container with `align-items: stretch`
    - Apply `flex: 1` to each widget
    - Set `max-height: 120px` on desktop
    - Stack vertically on mobile (<768px)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 14.2 Write property test for equal heights
    - **Property 6: Widget Panel Equal Heights**
    - **Validates: Requirements 3.1, 3.4**
    - Test with random widget counts

- [-] 15. Integrate with PromptFormProfessionalV2
  - [x] 15.1 Define section configurations
    - Create SECTION_CONFIGS array with all sections
    - Assign priority levels (critical/important/optional)
    - Set default collapsed states
    - Define field lists for completion tracking
    - Set display order and mobile order
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 15.2 Wrap form in FormGridLayout
    - Import FormGridLayout component
    - Wrap existing sections in grid container
    - Pass compactMode prop
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 15.3 Convert optional sections to CollapsibleFormSection
    - Wrap "Planlösning & Detaljer" in CollapsibleFormSection
    - Wrap "Material & Teknik" in CollapsibleFormSection
    - Wrap "Specialfunktioner" in CollapsibleFormSection
    - Pass section IDs, titles, priorities, and collapse handlers
    - _Requirements: 2.1, 4.3_

  - [ ] 15.4 Add StickyHeader and StickyFooter
    - Import and render StickyHeader at top of form
    - Import and render StickyFooter at bottom of form
    - Pass priority items to header
    - Pass submit handler to footer
    - _Requirements: 5.1, 5.2_

  - [x] 15.5 Wire up state management
    - Initialize use-collapsed-sections hook
    - Initialize use-compact-mode hook
    - Pass state and handlers to components
    - _Requirements: 2.5, 2.6, 12.1, 12.5_

- [ ] 16. Implement accessibility features
  - [ ] 16.1 Add ARIA attributes to all interactive elements
    - Apply `role="button"` to collapsible headers
    - Apply `aria-expanded` to collapsible headers
    - Apply `aria-controls` to collapsible headers
    - Apply `role="region"` to collapsible content
    - Apply `aria-labelledby` to collapsible content
    - _Requirements: 10.4, 18.4_

  - [ ] 16.2 Implement screen reader announcements
    - Create use-screen-reader-announcement hook
    - Add aria-live region for announcements
    - Announce section state changes
    - _Requirements: 10.5, 18.4_

  - [ ] 16.3 Ensure keyboard navigation
    - Test Tab navigation through all interactive elements
    - Test Enter/Space on collapsible headers
    - Test Arrow keys for section navigation (optional enhancement)
    - Ensure visible focus indicators on all elements
    - _Requirements: 10.1, 10.2, 10.3, 18.3_

  - [ ]* 16.4 Write property test for minimum touch targets
    - **Property 8: Minimum Touch Target Size**
    - **Validates: Requirements 6.4, 20.1**
    - Test all interactive elements meet 44x44px minimum (48x48px on mobile)

  - [ ]* 16.5 Write property test for minimum font sizes
    - **Property 9: Minimum Font Sizes**
    - **Validates: Requirements 6.5, 20.5**
    - Test body text ≥14px, labels ≥12px, mobile inputs ≥16px

  - [ ]* 16.6 Write property test for WCAG color contrast
    - **Property 11: WCAG Color Contrast**
    - **Validates: Requirements 8.5, 18.1**
    - Test all text/background combinations meet 4.5:1 ratio

- [ ] 17. Implement mobile-specific optimizations
  - [ ] 17.1 Increase touch target sizes on mobile
    - Apply 48x48px minimum touch targets when viewport <768px
    - Increase spacing between interactive elements to 8px
    - _Requirements: 20.1, 20.2_

  - [ ] 17.2 Use native selects on mobile
    - Detect mobile viewport
    - Render native HTML select elements instead of custom dropdowns
    - _Requirements: 20.3_

  - [ ] 17.3 Prevent zoom on input focus
    - Set font-size ≥16px on all inputs when viewport <768px
    - _Requirements: 20.5_

  - [ ] 17.4 Collapse Widget_Panel by default on mobile
    - Make CompactWidgets collapsible on mobile
    - Default to collapsed state on mobile
    - _Requirements: 20.4_

- [ ] 18. Checkpoint - Accessibility and mobile optimizations complete
  - Ensure all interactive elements are keyboard accessible
  - Ensure screen reader announces state changes correctly
  - Ensure touch targets meet minimum sizes on mobile
  - Ensure no zoom on input focus on mobile
  - Ask the user if questions arise

- [ ] 19. Add performance optimizations
  - [ ] 19.1 Implement React.memo for FormSection components
    - Wrap FormSection in React.memo
    - Implement custom comparison function
    - Prevent unnecessary re-renders
    - _Requirements: 16.3_

  - [ ] 19.2 Add lazy rendering for collapsed sections
    - Ensure children not mounted when section collapsed
    - Mount children within 100ms when expanded
    - _Requirements: 16.1, 16.2_

  - [ ]* 19.3 Write performance tests
    - Test initial render time <500ms
    - Test section toggle time <200ms
    - Test localStorage write time <50ms
    - Test scroll-to-section time <300ms

  - [ ] 19.4 Add CSS containment for performance
    - Apply `contain: layout style paint` to form sections
    - Apply `contain: layout style` to collapsible content
    - Test rendering performance improvement

- [ ] 20. Implement scroll distance measurement
  - [ ] 20.1 Create use-scroll-distance hook
    - Calculate scrollHeight - clientHeight
    - Track before and after compression
    - Log to console in development mode
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 20.2 Write property test for scroll distance calculation
    - **Property 12: Scroll Distance Calculation**
    - **Validates: Requirements 9.1**
    - Test with random scrollHeight and clientHeight values

  - [ ] 20.3 Add analytics tracking
    - Track scroll distance reduction percentage
    - Track section toggle events
    - Track form completion time
    - _Requirements: 9.4, 9.5_

  - [ ]* 20.4 Write property test for scroll distance reduction
    - **Property 13: Scroll Distance Reduction**
    - **Validates: Requirements 9.4, 9.5**
    - Verify ≥40% reduction on desktop, ≥25% on mobile

- [ ] 21. Add animations and transitions
  - [x] 21.1 Implement collapse/expand animations
    - Animate height transition over 200ms
    - Use cubic-bezier(0.4, 0, 0.2, 1) easing
    - Respect prefers-reduced-motion
    - _Requirements: 19.1, 19.2, 19.4_

  - [ ]* 21.2 Write property test for animation timing
    - **Property 33: Animation Timing**
    - **Validates: Requirements 19.1**
    - Test animation completes within 200ms ± 20ms

  - [x] 21.3 Implement scroll-to-section highlight animation
    - Apply fade-in ring animation
    - Duration 2 seconds
    - Remove animation class after completion
    - _Requirements: 15.4, 19.3_

  - [ ]* 21.4 Write property test for reduced motion
    - **Property 34: Reduced Motion Respect**
    - **Validates: Requirements 19.4**
    - Test animations disabled when prefers-reduced-motion set

  - [x] 21.5 Ensure non-blocking animations
    - Test interactive elements remain clickable during animations
    - Verify no animation blocking user interaction
    - _Requirements: 19.5_

- [ ] 22. Final integration and testing
  - [ ] 22.1 Test complete form flow
    - Fill out form with compressed layout
    - Toggle sections during form filling
    - Submit form with some sections collapsed
    - Verify all data captured correctly

  - [ ] 22.2 Test responsive behavior across breakpoints
    - Test at 320px (mobile)
    - Test at 768px (tablet)
    - Test at 1024px (desktop)
    - Test at 1920px (large desktop)
    - Verify smooth transitions between breakpoints

  - [ ] 22.3 Test state persistence
    - Collapse sections, reload page, verify state restored
    - Enable compact mode, reload page, verify state restored
    - Test with localStorage disabled (private browsing)

  - [ ] 22.4 Run accessibility audit
    - Run jest-axe tests
    - Test with screen reader (NVDA or VoiceOver)
    - Test keyboard-only navigation
    - Verify WCAG 2.1 Level AA compliance

  - [ ] 22.5 Run performance audit
    - Run Lighthouse performance test (target ≥90)
    - Measure initial render time
    - Measure section toggle time
    - Check for memory leaks

  - [ ]* 22.6 Run all property-based tests
    - Execute all 37 property tests with 100 iterations each
    - Verify no failures or counterexamples
    - Document any edge cases discovered

- [ ] 23. Final checkpoint - Feature complete
  - Ensure all requirements met
  - Ensure all tests passing
  - Ensure accessibility compliance
  - Ensure performance targets met
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- Implementation uses TypeScript with React, React Hook Form, and Tailwind CSS
- All components integrate with existing OptiPrompt form infrastructure
- localStorage is used for state persistence with graceful fallbacks
- Responsive design adapts from 3-column (desktop) to 2-column (tablet) to 1-column (mobile)
- Accessibility is a first-class concern with ARIA attributes, keyboard navigation, and screen reader support
