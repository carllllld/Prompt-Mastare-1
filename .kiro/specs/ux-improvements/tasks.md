# Implementation Plan: UX Improvements

## Overview

This plan implements comprehensive UX improvements to the PromptFormProfessional component, addressing critical usability issues including text contrast, duplicate fields, priority guidance, and information architecture. The implementation maintains backward compatibility with the existing data pipeline while significantly improving the broker experience.

## Tasks

- [x] 1. Update design tokens and base styles for WCAG AA compliance
  - Update CSS variables in `client/src/index.css` for --muted-foreground (216 12% 32%)
  - Replace text-gray-400 with text-gray-600 throughout component
  - Replace text-gray-500 with text-gray-700 for labels
  - Update text-[10px] and text-[11px] to text-xs (12px)
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [ ]* 1.1 Write property test for text contrast compliance
  - **Property 1: Text Contrast Compliance**
  - **Validates: Requirements 1.1, 1.2, 1.4, 1.5**

- [x] 2. Eliminate duplicate fields and implement chip normalization
  - [x] 2.1 Remove "Golvvärme" from BATHROOM_CHIPS constant
    - Keep only in HEATING_CHIPS
    - _Requirements: 2.1_
  
  - [x] 2.2 Create chip normalization utility function
    - Implement CANONICAL_RULES with aliases for common duplicates
    - Create normalizeListText function to handle aliasing
    - Update mergeChipsAndText to use normalization
    - _Requirements: 2.4, 2.5_
  
  - [ ]* 2.3 Write property test for chip normalization
    - **Property 2: Chip Normalization**
    - **Validates: Requirements 2.4, 2.5**
  
  - [x] 2.4 Add conflict detection for chip/freetext overlaps
    - Detect when same info appears in chips and freetext
    - Display warning toast when conflicts detected
    - _Requirements: 2.5_

- [x] 3. Implement PriorityChecklist component
  - [x] 3.1 Create PriorityChecklist component with TypeScript interfaces
    - Define PriorityItem and PriorityChecklistProps interfaces
    - Implement three-tier visual system (critical/important/optional)
    - Use text-sm typography instead of text-xs
    - Add progress indicator with percentage levels
    - _Requirements: 3.1, 3.3, 3.5_
  
  - [x] 3.2 Add visual indicators for empty priority fields
    - Implement pulsating animation for incomplete fields
    - Use color-coded accents (red/orange for critical, green for important)
    - _Requirements: 3.2_
  
  - [x] 3.3 Implement click-to-scroll functionality
    - Add onItemClick handler to scroll to corresponding field
    - Apply temporary highlight to target field
    - _Requirements: 3.4_
  
  - [ ]* 3.4 Write property tests for priority checklist
    - **Property 3: Priority Field Indicators**
    - **Property 4: Priority Checklist Interaction**
    - **Property 5: Progress Calculation**
    - **Validates: Requirements 3.2, 3.4, 3.5**
  
  - [x] 3.5 Add confirmation dialog for incomplete submissions
    - Show dialog when <4 priority fields filled
    - Warn that result quality may be lower
    - _Requirements: 3.6_

- [x] 4. Create FieldGroup component for better organization
  - [x] 4.1 Create FieldGroup component with collapsible functionality
    - Define FieldGroupProps interface
    - Implement collapsible sections with icons
    - Add priority prop for visual hierarchy
    - _Requirements: 4.1, 4.3_
  
  - [x] 4.2 Implement localStorage persistence for expansion state
    - Save/restore expansion state using persistKey
    - Handle localStorage errors gracefully
    - _Requirements: 4.4_
  
  - [ ]* 4.3 Write property test for field group persistence
    - **Property 6: Field Group Persistence**
    - **Validates: Requirements 4.4**
  
  - [x] 4.4 Reorganize form fields into logical groups
    - Create 6 field groups: Grundfakta, Försäljningsargument, Utrymmen, Material & Teknik, Läge & Omgivning, Övrigt
    - Move fields from "Mer detaljer" to appropriate groups
    - Increase spacing between groups (gap-6)
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Implement FieldImpactBadge component
  - [x] 5.1 Create FieldImpactBadge component
    - Define TextImpact type and FieldImpactBadgeProps interface
    - Implement color-coded badges for impact types
    - Add tooltip with examples on hover
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 5.2 Add impact badges to all form fields
    - Map each field to its impact types (huvudtext, rubrik, socialt, etc.)
    - Add "Juridiskt" badge for fastighetsbeteckning and taxeringsvärde
    - _Requirements: 5.1, 5.4_
  
  - [ ]* 5.3 Write property test for field impact badges
    - **Property 7: Field Impact Badges**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 6. Enhance ChipSelector component
  - [x] 6.1 Update ChipSelector typography and accessibility
    - Change font size from text-[11px] to text-xs
    - Add role="checkbox" and aria-checked attributes
    - Implement keyboard navigation (Tab, Space)
    - Add visible focus indicators
    - _Requirements: 8.1, 8.5_
  
  - [x] 6.2 Add checkmark icons and tooltips to chips
    - Display checkmark icon inside selected chips
    - Add tooltips prop to ChipSelectorProps
    - Show tooltip on hover with explanations
    - _Requirements: 8.2, 8.4_
  
  - [x] 6.3 Implement overflow handling for chip categories
    - Add scrollable container with max-height for >8 chips
    - Add "Visa fler" button for categories with >12 chips
    - _Requirements: 6.3, 8.6_
  
  - [x] 6.4 Increase touch targets for mobile
    - Change padding from py-1 to py-2 px-3 on mobile viewports
    - Ensure minimum 44px touch target height
    - _Requirements: 9.3_
  
  - [ ]* 6.5 Write property tests for chip selector
    - **Property 8: Chip Selector Overflow Handling**
    - **Property 13: Chip Visual Feedback**
    - **Property 14: Chip Keyboard Navigation**
    - **Validates: Requirements 6.3, 8.2, 8.4, 8.5, 8.6**

- [x] 7. Implement ValidationFeedback component
  - [x] 7.1 Create ValidationFeedback component
    - Define ValidationRule and ValidationFeedbackProps interfaces
    - Implement inline validation for numeric fields
    - Add format suggestions for invalid input
    - _Requirements: 7.1_
  
  - [x] 7.2 Add conflict detection for contradictory selections
    - Detect conflicts like "Nyskick" + "Behöver renoveras"
    - Display warning message with suggestion
    - _Requirements: 7.4_
  
  - [x] 7.3 Implement quality indicator
    - Calculate based on filled priority fields, text length, and chip count
    - Update in real-time as user fills form
    - _Requirements: 7.3_
  
  - [ ]* 7.4 Write property tests for validation
    - **Property 9: Numeric Field Validation**
    - **Property 10: Quality Indicator Calculation**
    - **Property 11: Conflict Detection**
    - **Validates: Requirements 7.1, 7.3, 7.4**

- [x] 8. Enhance draft persistence and auto-save
  - [x] 8.1 Improve auto-save with debouncing
    - Debounce text field changes by 500ms
    - Save all form data, chips, and UI state
    - Display "Senast sparad" timestamp
    - _Requirements: 7.5, 11.1, 12.2_
  
  - [x] 8.2 Add draft restoration banner
    - Show "Återställ senaste utkast" banner on return
    - Restore all form fields, chips, and UI state
    - _Requirements: 11.2_
  
  - [x] 8.3 Handle localStorage errors gracefully
    - Implement quota exceeded handling
    - Handle corrupted data with fallback
    - _Requirements: 11.3_
  
  - [ ]* 8.4 Write property test for draft restoration
    - **Property 12: Auto-Save with Debouncing**
    - **Property 20: Draft Restoration Round-Trip**
    - **Validates: Requirements 7.5, 11.1, 11.2, 12.2**

- [x] 9. Implement mobile responsive improvements
  - [x] 9.1 Update PriorityChecklist for mobile
    - Stack vertically on viewports <640px
    - Ensure 44px minimum touch target height
    - _Requirements: 9.1_
  
  - [x] 9.2 Add sticky submit button on mobile
    - Use sticky positioning for "Generera"-knappen
    - Keep button accessible while scrolling
    - _Requirements: 9.2_
  
  - [x] 9.3 Collapse less important groups on mobile
    - Default collapse optional groups on <768px viewports
    - Keep critical and important groups expanded
    - _Requirements: 9.4_
  
  - [x] 9.4 Add floating progress indicator for mobile
    - Show completed/total priority fields on scroll
    - Display on viewports <768px
    - _Requirements: 9.5_
  
  - [ ]* 9.5 Write property tests for mobile responsiveness
    - **Property 15: Mobile Responsive Layout**
    - **Property 16: Mobile Floating Progress**
    - **Validates: Requirements 9.1, 9.3, 9.4, 9.5**

- [x] 10. Implement contextual help system
  - [x] 10.1 Create FieldGuide component
    - Define FieldGuideProps and FieldGuideContent interfaces
    - Implement slide-in sidebar using Sheet component
    - Add searchable field list
    - Include examples and best practices
    - _Requirements: 4.5, 10.4_
  
  - [x] 10.2 Add contextual help triggers
    - Detect help trigger patterns in user input
    - Display contextual tips for quality improvement
    - _Requirements: 10.2_
  
  - [x] 10.3 Add help icons to field groups
    - Add "?" icon to each FieldGroup
    - Open popover with best practices on click
    - _Requirements: 10.4_
  
  - [x] 10.4 Implement idle field animation
    - Add pulsating animation for empty important fields after 30s
    - Only trigger when user is active in form
    - _Requirements: 10.5_
  
  - [ ]* 10.5 Write property tests for contextual help
    - **Property 17: Contextual Help Triggers**
    - **Property 18: Field Group Help Icons**
    - **Property 19: Idle Field Animation**
    - **Validates: Requirements 10.2, 10.4, 10.5**

- [x] 11. Improve error handling and resilience
  - [x] 11.1 Enhance API error handling
    - Preserve form data on API failures
    - Display error toast with retry button
    - Maintain draft in localStorage as backup
    - _Requirements: 11.3_
  
  - [x] 11.2 Update address lookup error handling
    - Handle UPGRADE_REQUIRED errors with upgrade prompt
    - Show specific error messages with retry option
    - _Requirements: 11.3_
  
  - [ ]* 11.3 Write property test for API failure resilience
    - **Property 21: API Failure Resilience**
    - **Validates: Requirements 11.3**

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Integration and final polish
  - [x] 13.1 Integrate all components into PromptFormProfessional
    - Wire PriorityChecklist, FieldGroup, FieldImpactBadge components
    - Connect ValidationFeedback and FieldGuide
    - Ensure all components work together seamlessly
    - _Requirements: All_
  
  - [x] 13.2 Add keyboard shortcut documentation
    - Document Cmd/Ctrl+Enter to submit (already implemented)
    - Add tooltip or help text for keyboard shortcuts
    - _Requirements: 8.5_
  
  - [x] 13.3 Optimize performance
    - Add React.memo to ChipSelector and NumberStepper
    - Implement debouncing for localStorage saves
    - Lazy-load "Mer detaljer" section
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [ ]* 13.4 Write unit tests for edge cases
    - Test empty form state
    - Test all fields filled state
    - Test conflicting selections
    - Test localStorage quota exceeded
    - Test corrupted draft data

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility with existing data pipeline
- All text and UI elements use Swedish language for broker users
