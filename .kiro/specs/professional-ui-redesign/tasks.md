# Implementation Plan: Professional UI Redesign (Mäklaraktig Style)

## Overview

This implementation plan transforms OptiPrompt from its current "AI-generated and cheap" appearance into a professional, clean, minimalist interface matching Swedish real estate agencies like Hemnet and Svensk Fastighetsförmedling. The redesign focuses on radical simplification: 90% white backgrounds, minimal color usage (only dark green for CTAs), generous white space, and natural Swedish language.

## Tasks

- [ ] 1. Design token setup and configuration
  - [ ] 1.1 Create mäklaraktig color tokens in CSS
    - Update `client/src/index.css` with minimal color palette
    - Define CSS custom properties for white, subtle gray, dark green, and border colors
    - Remove all colored background/border token definitions (red-50, blue-50, yellow-50, warning-bg, etc.)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_
  
  - [ ] 1.2 Update Tailwind configuration
    - Modify `client/tailwind.config.ts` with simplified theme
    - Configure only 3 font sizes (text-xs: 12px, text-sm: 13px, text-base: 15px, text-md: 16px)
    - Configure spacing scale (gap-3, gap-4, gap-5, gap-6)
    - Configure minimal shadow scale (shadow-sm, shadow-md only)
    - Configure border radius (rounded-md: 6px, rounded-lg: 8px)
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.5, 4.5, 4.6_
  
  - [ ] 1.3 Create ESLint rules for design system enforcement
    - Create custom ESLint rule to detect colored backgrounds (red-50, blue-50, yellow-50, etc.)
    - Create custom ESLint rule to detect colored borders (red-300, blue-300, border-warning, etc.)
    - Create custom ESLint rule to detect uppercase text transformation
    - Create custom ESLint rule to detect thick borders (border-2, border-4)
    - Create custom ESLint rule to detect non-standard font sizes in form components
    - _Requirements: 1.7, 1.8, 2.4, 4.1, 4.2, 4.4_


- [ ] 2. Base UI component updates
  - [ ] 2.1 Update Button component with mäklaraktig variants
    - Modify `client/src/components/ui/button.tsx`
    - Implement primary variant (bg-primary #2D5016, white text, rounded-lg, px-6 py-3)
    - Implement secondary variant (bg-white, gray border, gray text, rounded-lg, px-6 py-3)
    - Implement text variant (no background, no border, gray text)
    - Remove icon props unless absolutely necessary
    - Update disabled state (bg-gray-200, text-gray-400, cursor-not-allowed)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9_
  
  - [ ]* 2.2 Write unit tests for Button component
    - Test primary variant renders with dark green background
    - Test secondary variant renders with white background and gray border
    - Test text variant has no background or border
    - Test disabled state styling
    - Test hover states
    - _Requirements: 5.1, 5.2, 5.9_
  
  - [ ] 2.3 Update Input component with mäklaraktig styling
    - Modify `client/src/components/ui/input.tsx`
    - Set height to h-10 (40px) for normal mode
    - Use light gray border (#E5E7EB, 1px width)
    - Use rounded-md (6px) border radius
    - Use px-3 (12px) horizontal padding
    - Style placeholder as italic with muted gray color
    - Implement focus state (ring-2 ring-primary, hide placeholder)
    - Implement error state (border-red-500, ring-2 ring-red-500)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_
  
  - [ ]* 2.4 Write unit tests for Input component
    - Test default styling (height, border, padding, radius)
    - Test focus state (ring, placeholder hidden)
    - Test error state (red border and ring)
    - Test disabled state
    - _Requirements: 7.1, 7.8, 7.9_
  
  - [ ] 2.5 Update Card component with minimal styling
    - Modify `client/src/components/ui/card.tsx`
    - Use white background (bg-white)
    - Use light gray border (border border-gray-200, 1px)
    - Use rounded-lg (8px) border radius
    - Use subtle shadow (shadow-sm)
    - Use p-6 (24px) padding
    - Remove any colored backgrounds or borders
    - _Requirements: 18.6_
  
  - [ ] 2.6 Update or remove Badge component
    - Modify `client/src/components/ui/badge.tsx`
    - Remove all colored variants (warning, info, success, error)
    - Keep only gray variant if needed
    - Consider removing component entirely if not essential
    - _Requirements: 18.5_
  
  - [ ] 2.7 Update ChipSelector component
    - Modify `client/src/components/FormSections/CollapsibleChipSelector.tsx`
    - Unselected state: white background, light gray border, gray text, rounded-full, px-3 py-2
    - Selected state: dark green background (#2D5016), white text, checkmark icon
    - Hover state: subtle gray background (#F3F4F6) when unselected
    - Use text-xs (12px) font size
    - Ensure minimum 44px touch target for accessibility
    - Remove all colored variants (warning-bg, info-bg, success-bg, error-bg)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_
  
  - [ ]* 2.8 Write unit tests for ChipSelector component
    - Test unselected state (white background, gray border)
    - Test selected state (dark green background, white text, checkmark)
    - Test hover states
    - Test minimum 44px touch target
    - _Requirements: 6.1, 6.2, 6.9_


- [ ] 3. Form component redesign (PromptFormProfessionalV2)
  - [ ] 3.1 Remove all colored backgrounds from form
    - Modify `client/src/components/PromptFormProfessionalV2.tsx`
    - Remove all instances of bg-red-50, bg-blue-50, bg-yellow-50
    - Remove all instances of bg-warning-bg, bg-info-bg, bg-success-bg, bg-error-bg
    - Replace with bg-white or bg-gray-50 (subtle gray) only
    - Ensure 90% of form uses white background
    - _Requirements: 1.1, 1.2, 1.7_
  
  - [ ] 3.2 Remove all colored borders from form
    - Remove all instances of border-red-300, border-blue-300, border-yellow-300
    - Remove all instances of border-warning, border-info, border-success, border-error
    - Replace all borders with border-gray-300 (light gray #E5E7EB)
    - Ensure all borders are 1px width (border, not border-2)
    - _Requirements: 1.6, 1.8, 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 3.3 Update form section spacing
    - Use gap-6 (24px) between form sections
    - Use p-5 or p-6 (20-24px) padding inside sections
    - Use gap-4 (16px) between form fields within sections
    - Use gap-3 (12px) between chips and small elements
    - Ensure no padding smaller than 16px for interactive elements
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 3.4 Update form labels and typography
    - Change all form labels to text-sm (13px), font-normal, text-gray-600
    - Change section headings to text-md (16px), font-semibold, text-gray-900
    - Change body text to text-base (15px)
    - Remove all uppercase text transformations
    - Ensure only 3 font sizes used throughout form
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8_
  
  - [ ] 3.5 Update ChipSelector instances in form
    - Update all ChipSelector usages to use new mäklaraktig styling
    - Ensure unselected chips are white with gray border
    - Ensure selected chips are dark green with white text
    - Remove any colored chip variants
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 3.6 Update button styling in form
    - Update primary submit button to dark green (#2D5016) with white text
    - Update secondary buttons to white with gray border
    - Update tertiary actions to text-only buttons
    - Remove icons from buttons unless essential
    - Ensure px-6 py-3 padding on all buttons
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.8_


- [ ] 4. FormSections component updates
  - [ ] 4.1 Update EssentialFieldsSection component
    - Modify `client/src/components/FormSections/EssentialFieldsSection.tsx`
    - Apply mäklaraktig styling (white background, gray borders, proper spacing)
    - Update section header (text-md, font-semibold, mb-4)
    - Update field labels (text-sm, font-normal, text-gray-600)
    - Remove colored backgrounds and borders
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 4.2 Update DetailsSection component
    - Modify `client/src/components/FormSections/DetailsSection.tsx`
    - Apply mäklaraktig styling
    - Update section header and field labels
    - Remove colored backgrounds and borders
    - Ensure proper spacing (gap-4 between fields)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 4.3 Update ImageSection component
    - Modify `client/src/components/FormSections/ImageSection.tsx`
    - Use white background for upload area
    - Use light gray border for thumbnails (border-gray-200)
    - Use dark green (#2D5016) for upload progress indicator
    - Show remove button as small gray X icon on hover
    - Display image count as "X / 20 bilder" in text-sm text-gray-600
    - Use gap-3 between thumbnails
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_
  
  - [ ] 4.4 Update ImportSection component
    - Modify `client/src/components/FormSections/ImportSection.tsx`
    - Style Hemnet and Vitec import buttons as secondary buttons (white with gray border)
    - Use consistent spacing (gap-2) between buttons
    - Use 14px text size for button labels
    - Show loading state with subtle spinner (no colored backgrounds)
    - Use gray icon color matching text
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_
  
  - [ ] 4.5 Update StickyHeader component
    - Modify `client/src/components/FormSections/StickyHeader.tsx`
    - Use white background (bg-white)
    - Use light gray bottom border (border-b border-gray-200)
    - Use subtle shadow (shadow-sm)
    - Use p-4 (16px) padding
    - Display control buttons as text-only with hover states
    - Remove colored backgrounds and heavy shadows
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6, 11.7, 11.8_
  
  - [ ] 4.6 Update StickyFooter component
    - Modify `client/src/components/FormSections/StickyFooter.tsx`
    - Use white background (bg-white)
    - Use light gray top border (border-t border-gray-200)
    - Use subtle shadow (shadow-sm)
    - Use p-4 (16px) padding
    - Style primary submit button in dark green (#2D5016)
    - Style secondary buttons with gray outline
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.8_
  
  - [ ] 4.7 Update ProgressIndicator component
    - Modify `client/src/components/FormSections/ProgressIndicator.tsx`
    - Use light gray (#E5E7EB) for incomplete progress background
    - Use dark green (#2D5016) for completed progress
    - Display completion count as "X / Y fält" in text-sm text-gray-600
    - Remove colored badges for priority levels
    - Use subtle left border for priority (border-l-4 border-amber-500 for critical, border-green-500 for important, border-gray-400 for optional)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_
  
  - [ ] 4.8 Update CollapsibleChipSelector component
    - Modify `client/src/components/FormSections/CollapsibleChipSelector.tsx`
    - Display collapse/expand indicator as simple arrow (▼/▲) in gray (#9CA3AF)
    - Show subtle hover background (#F3F4F6) on section headers
    - Display completion percentage in text-sm text-gray-600
    - Show checkmark icon when section is 100% complete
    - Remove colored backgrounds for collapsed sections
    - Use smooth 200ms transition for collapse/expand
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_


- [ ] 5. Swedish language review and naturalization
  - [ ] 5.1 Review and update form field labels
    - Review all labels in PromptFormProfessionalV2.tsx
    - Replace AI-generated or awkward phrases with natural Swedish
    - Use language that real estate brokers actually use
    - Ensure concise, clear labels without unnecessary words
    - Use sentence case, not title case or uppercase
    - Ensure consistent terminology (e.g., always "boarea" not mixing with "boyta")
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8, 8.9_
  
  - [ ] 5.2 Review and update placeholder text
    - Review all placeholder text in form inputs
    - Provide realistic examples that brokers would actually write
    - Remove generic or vague examples
    - Ensure placeholders sound natural and professional
    - _Requirements: 8.5, 8.6_
  
  - [ ] 5.3 Review and update button text
    - Review all button labels for clarity and professionalism
    - Use natural Swedish language
    - Ensure consistency across all buttons
    - _Requirements: 8.1, 8.4_
  
  - [ ] 5.4 Review and update section titles
    - Review all section headers for broker terminology
    - Ensure titles are clear and professional
    - Use standard Swedish real estate terminology
    - _Requirements: 8.1, 8.8, 8.9_
  
  - [ ] 5.5 Review and update error messages
    - Review all validation error messages
    - Use helpful, natural language
    - Avoid overly technical or formal language
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [ ] 5.6 Review and update tooltip text
    - Review all tooltip content for accuracy and clarity
    - Use natural Swedish language
    - Ensure tooltips are helpful and concise
    - _Requirements: 8.1, 8.4_
  
  - [ ] 5.7 Create Swedish language quality checklist
    - Document all reviewed text elements
    - Create guidelines for future text additions
    - Ensure all text has been reviewed from a Swedish broker's perspective
    - _Requirements: 8.10_


- [ ] 6. Responsive design and mobile optimization
  - [ ] 6.1 Verify responsive breakpoints
    - Test 3-column layout on desktop (≥1024px)
    - Test 2-column layout on tablet (768px-1023px)
    - Test 1-column layout on mobile (<768px)
    - Ensure layout transitions smoothly between breakpoints
    - _Requirements: 16.1, 16.2, 16.3_
  
  - [ ] 6.2 Verify mobile touch targets
    - Test all interactive elements on mobile viewports
    - Ensure minimum 44px height and width for all buttons, inputs, chips
    - Adjust padding if needed to meet touch target requirements
    - _Requirements: 16.4_
  
  - [ ] 6.3 Optimize mobile spacing
    - Adjust padding to p-4 (16px) on mobile devices
    - Ensure spacing remains readable and comfortable
    - Test compact mode on mobile
    - _Requirements: 16.5_
  
  - [ ] 6.4 Optimize mobile button layout
    - Stack buttons vertically on mobile
    - Ensure buttons remain easily tappable
    - Test sticky footer on mobile
    - _Requirements: 16.6_
  
  - [ ] 6.5 Verify mobile typography
    - Ensure font sizes remain readable on mobile (minimum 13px)
    - Test line-height and spacing on small screens
    - _Requirements: 16.7_
  
  - [ ] 6.6 Test sticky elements on mobile
    - Verify sticky header works properly on mobile
    - Verify sticky footer works properly on mobile
    - Ensure sticky elements don't obscure content
    - _Requirements: 16.8_


- [ ] 7. Accessibility compliance (WCAG 2.1 AA)
  - [ ] 7.1 Verify color contrast ratios
    - Test dark gray text (#1A1A1A) on white background (should be ≥4.5:1)
    - Test muted gray labels (#6B7280) on white background (should be ≥4.5:1)
    - Test dark green button (#2D5016) with white text (should be ≥4.5:1)
    - Test all text-background combinations meet WCAG AA standards
    - _Requirements: 17.1_
  
  - [ ] 7.2 Implement keyboard navigation
    - Ensure all interactive elements are reachable via Tab key
    - Verify logical tab order throughout form
    - Test keyboard shortcuts (Cmd/Ctrl+Enter to submit)
    - _Requirements: 17.2, 17.8, 17.9_
  
  - [ ] 7.3 Add focus indicators
    - Ensure all focusable elements have visible focus indicators (ring-2)
    - Test focus indicators are clearly visible
    - Verify focus indicators meet contrast requirements
    - _Requirements: 17.3_
  
  - [ ] 7.4 Add ARIA labels to form fields
    - Ensure all form inputs have associated label elements or aria-label
    - Add aria-describedby for helper text
    - Add aria-invalid for error states
    - _Requirements: 17.4, 17.7_
  
  - [ ] 7.5 Add ARIA attributes to collapsible sections
    - Add aria-expanded to collapsible section headers
    - Add aria-controls to link headers to content
    - Add role="region" to collapsible content areas
    - _Requirements: 17.5_
  
  - [ ] 7.6 Add ARIA attributes to ChipSelector
    - Add role="checkbox" to chip elements
    - Add aria-checked to indicate selected state
    - Add aria-label for screen reader context
    - _Requirements: 17.6_
  
  - [ ] 7.7 Implement screen reader announcements
    - Announce form validation errors to screen readers
    - Use aria-live regions for dynamic content updates
    - Test with screen readers (NVDA, JAWS, VoiceOver)
    - _Requirements: 17.7_
  
  - [ ]* 7.8 Write accessibility tests
    - Test keyboard navigation completeness
    - Test focus indicator visibility
    - Test ARIA attribute presence
    - Test screen reader compatibility
    - Run automated accessibility audit (axe-core)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_


- [ ] 8. Additional UI component updates
  - [ ] 8.1 Update Alert component
    - Modify `client/src/components/ui/alert.tsx`
    - Use white background (bg-white)
    - Use light gray border (border border-gray-200)
    - Use subtle left border (border-l-4) with semantic color for type indication
    - Error: border-l-4 border-red-500
    - Warning: border-l-4 border-amber-500
    - Info: border-l-4 border-blue-500
    - Success: border-l-4 border-green-500
    - Remove colored backgrounds (red-50, yellow-50, blue-50, green-50)
    - _Requirements: 15.7, 15.8, 18.7_
  
  - [ ] 8.2 Update Dialog component
    - Modify `client/src/components/ui/dialog.tsx`
    - Use white background (bg-white)
    - Use light gray border (border border-gray-200)
    - Use dark gray (#1A1A1A) for dialog titles (text-md font-semibold)
    - Use standard gray (#6B7280) for dialog body text (text-sm)
    - Use dark green (#2D5016) for primary dialog actions
    - Use gray outline button for secondary dialog actions
    - Display close button as simple X icon in gray
    - Use p-4 (16px) padding
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.9, 15.10, 18.8_
  
  - [ ] 8.3 Update Tooltip component
    - Modify `client/src/components/ui/tooltip.tsx` (if exists) or create tooltip styling
    - Use white background (bg-white)
    - Use light gray border (border border-gray-200)
    - Use subtle shadow (shadow-md)
    - Use text-xs (12px) for tooltip content in dark gray (#1A1A1A)
    - Position tooltips above or below trigger element
    - Show tooltips on hover with 200ms delay
    - Limit tooltip width to max-w-xs (320px)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 18.9_
  
  - [ ] 8.4 Update Textarea component
    - Modify `client/src/components/ui/textarea.tsx` (if exists) or ensure consistent styling
    - Apply same styling as Input component
    - Use light gray border (#E5E7EB, 1px width)
    - Use rounded-md (6px) border radius
    - Use px-3 (12px) horizontal padding
    - Style placeholder as italic with muted gray color
    - _Requirements: 18.3_
  
  - [ ] 8.5 Update Select component
    - Modify `client/src/components/ui/select.tsx` (if exists) or ensure consistent styling
    - Apply same styling as Input component
    - Use light gray border, rounded-md, proper padding
    - _Requirements: 18.4_


- [ ] 9. Form validation and feedback
  - [ ] 9.1 Update validation error display
    - Display error messages below fields in text-xs text-red-600
    - Remove red borders on inputs in default state
    - Only show red border when field has error and form is submitted
    - Clear error messages when user starts typing
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.9, 19.10_
  
  - [ ] 9.2 Implement error scrolling
    - Scroll to first error field when validation fails
    - Ensure error field is visible and focused
    - _Requirements: 19.5_
  
  - [ ] 9.3 Update toast notifications
    - Display toast with list of missing required fields
    - Use white background with subtle border
    - Remove colored backgrounds from toasts
    - Use text-sm for toast content
    - _Requirements: 19.6, 19.7, 19.8_

- [ ] 10. Animation and transition refinement
  - [ ] 10.1 Standardize transition durations
    - Use 200ms transition duration for all hover states
    - Use 200ms transition duration for collapse/expand animations
    - Use ease-in-out timing function for all transitions
    - _Requirements: 22.1, 22.2, 22.3_
  
  - [ ] 10.2 Implement reduced motion support
    - Respect prefers-reduced-motion user preference
    - Disable animations when user has reduced motion enabled
    - _Requirements: 22.4_
  
  - [ ] 10.3 Simplify animation types
    - Remove bounce, slide, or complex animations
    - Use simple fade transitions for tooltips and dialogs
    - Use transform transitions for collapse/expand (not height)
    - Use instant transitions for color changes (no animation)
    - Use subtle opacity changes (0.9-1.0) for hover states
    - _Requirements: 22.5, 22.6, 22.7, 22.9, 22.10_
  
  - [ ] 10.4 Verify animation performance
    - Test animations maintain 60fps performance
    - Optimize any animations causing performance issues
    - _Requirements: 22.8_


- [ ] 11. Print and export styling
  - [ ] 11.1 Implement print mode styles
    - Expand all collapsed sections when print mode is activated
    - Hide interactive controls (expand/collapse buttons)
    - Use black text on white background
    - Remove shadows and hover states
    - Maintain section borders for structure
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_
  
  - [ ] 11.2 Optimize print spacing
    - Reduce spacing to 12px gaps for print
    - Ensure all text is readable (minimum 12px)
    - _Requirements: 23.6, 23.7_
  
  - [ ] 11.3 Hide non-printable elements
    - Hide sticky header and footer in print mode
    - Display selected chips as comma-separated text
    - _Requirements: 23.8, 23.9_
  
  - [ ] 11.4 Implement print mode toggle
    - Restore normal view when print mode is deactivated
    - _Requirements: 23.10_

- [ ] 12. Checkpoint - Verify core implementation
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 13. Property-based testing implementation
  - [ ]* 13.1 Write property test: No colored backgrounds
    - **Property 1: White Background Dominance**
    - **Validates: Requirements 1.1, 1.2, 1.7**
    - Scan all component files for colored background classes (red-50, blue-50, yellow-50, warning-bg, etc.)
    - Fail if any colored backgrounds found
    - Use fast-check with 100 iterations
  
  - [ ]* 13.2 Write property test: Border color uniformity
    - **Property 4: Border Color Uniformity**
    - **Validates: Requirements 1.6, 1.8, 4.3, 4.4**
    - Scan all component files for colored border classes (red-300, blue-300, border-warning, etc.)
    - Allow colored borders only in focus states
    - Fail if colored borders found outside focus states
  
  - [ ]* 13.3 Write property test: Typography size limitation
    - **Property 6: Typography Size Limitation**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.8**
    - Scan form component files for font size classes
    - Ensure only text-xs, text-sm, text-base, text-md are used
    - Fail if forbidden sizes found (text-lg, text-xl, text-2xl, etc.)
  
  - [ ]* 13.4 Write property test: Uppercase elimination
    - **Property 7: Uppercase Elimination**
    - **Validates: Requirements 2.4**
    - Scan all component files for uppercase class or inline uppercase styles
    - Fail if any uppercase transformations found
  
  - [ ]* 13.5 Write property test: Spacing scale adherence
    - **Property 10: Spacing Scale Adherence**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6**
    - Scan component files for spacing classes
    - Warn if non-standard spacing values found (gap-1, gap-2, gap-7, p-1, p-2, etc.)
    - Ensure spacing follows scale: gap-3, gap-4, gap-5, gap-6, p-5, p-6
  
  - [ ]* 13.6 Write property test: Border width uniformity
    - **Property 13: Border Width Uniformity**
    - **Validates: Requirements 4.1, 4.2**
    - Scan component files for thick border classes (border-2, border-4, border-8)
    - Allow border-l-4, border-r-4, border-t-4, border-b-4 for priority indicators
    - Fail if thick borders found on all sides
  
  - [ ]* 13.7 Write property test: Mobile touch targets
    - **Property 27: Mobile Touch Target Minimum**
    - **Validates: Requirements 16.4**
    - Render form on mobile viewports (375px, 414px, 390px)
    - Measure all interactive elements (buttons, inputs, chips)
    - Fail if any element smaller than 44x44px
    - Use fast-check with 100 iterations
  
  - [ ]* 13.8 Write property test: WCAG contrast compliance
    - **Property 28: WCAG Contrast Compliance**
    - **Validates: Requirements 17.1**
    - Test all text-background color combinations
    - Calculate contrast ratios using WCAG formula
    - Fail if any combination below 4.5:1 for normal text or 3:1 for large text
  
  - [ ]* 13.9 Write property test: Animation timing uniformity
    - **Property 31: Animation Timing Uniformity**
    - **Validates: Requirements 22.1, 22.2, 22.3**
    - Scan component files for transition/animation durations
    - Ensure all use 200ms with ease-in-out
    - Fail if non-standard durations found
  
  - [ ]* 13.10 Write property test: CSS custom property usage
    - **Property 34: CSS Custom Property Usage**
    - **Validates: Requirements 24.1, 24.2, 24.6**
    - Scan component JSX for hard-coded hex color values
    - Ensure all colors use Tailwind classes or CSS custom properties
    - Fail if hard-coded hex values found


- [ ] 14. Unit testing implementation
  - [ ]* 14.1 Write unit tests for color contrast
    - Test primary button (dark green #2D5016 on white) meets WCAG AA (≥4.5:1)
    - Test dark gray text (#1A1A1A on white) meets WCAG AA
    - Test muted gray labels (#6B7280 on white) meets WCAG AA
    - _Requirements: 17.1_
  
  - [ ]* 14.2 Write unit tests for form accessibility
    - Test all form inputs have associated labels or aria-label
    - Test all interactive elements have minimum 44px touch targets on mobile
    - Test keyboard navigation reaches all interactive elements
    - _Requirements: 17.2, 17.4, 16.4_
  
  - [ ]* 14.3 Write unit tests for component variants
    - Test Button primary/secondary/text variants render correctly
    - Test Input default/focus/error/disabled states
    - Test ChipSelector selected/unselected states
    - _Requirements: 5.1, 5.2, 7.1, 7.8, 7.9, 6.1, 6.2_
  
  - [ ]* 14.4 Write unit tests for responsive behavior
    - Test 3-column layout on desktop (≥1024px)
    - Test 2-column layout on tablet (768px-1023px)
    - Test 1-column layout on mobile (<768px)
    - _Requirements: 16.1, 16.2, 16.3_

- [ ] 15. Visual regression testing
  - [ ]* 15.1 Create visual regression baseline
    - Capture screenshots of all component variants
    - Capture screenshots of form in different states
    - Capture screenshots on different viewports (desktop, tablet, mobile)
    - Store baseline images for comparison
  
  - [ ]* 15.2 Set up visual regression testing
    - Configure visual regression testing tool (Chromatic or Percy)
    - Set up CI integration for automatic visual testing
    - Define acceptable visual difference thresholds
  
  - [ ]* 15.3 Run visual regression tests
    - Compare current implementation against baseline
    - Review and approve visual changes
    - Update baseline if changes are intentional


- [ ] 16. Documentation and style guide
  - [ ] 16.1 Document color tokens
    - Create documentation file for mäklaraktig color system
    - Document all color tokens with hex values and usage guidelines
    - Provide examples of correct and incorrect color usage
    - _Requirements: 25.1_
  
  - [ ] 16.2 Document typography system
    - Document all typography scales with sizes and use cases
    - Provide examples of text-sm (labels), text-base (body), text-md (headings)
    - Document font weight usage (normal for body, semibold for headings)
    - _Requirements: 25.2_
  
  - [ ] 16.3 Document spacing system
    - Document all spacing values with examples
    - Provide guidelines for gap-3, gap-4, gap-6, p-5, p-6
    - Show examples of proper spacing in sections and forms
    - _Requirements: 25.3_
  
  - [ ] 16.4 Document border system
    - Document all border styles with examples
    - Show proper usage of 1px light gray borders
    - Document border radius values (rounded-md, rounded-lg)
    - _Requirements: 25.4_
  
  - [ ] 16.5 Create component usage examples
    - Provide code examples for Button variants
    - Provide code examples for Input states
    - Provide code examples for ChipSelector usage
    - Provide code examples for form sections
    - _Requirements: 25.5_
  
  - [ ] 16.6 Document mäklaraktig design philosophy
    - Document the mäklaraktig design principles
    - Explain the 90% white rule
    - Explain the one accent color rule
    - Explain the generous white space principle
    - _Requirements: 25.6_
  
  - [ ] 16.7 Create before/after examples
    - Capture before screenshots of current UI
    - Capture after screenshots of redesigned UI
    - Create side-by-side comparisons
    - Highlight key improvements
    - _Requirements: 25.7_
  
  - [ ] 16.8 Document accessibility requirements
    - Document WCAG 2.1 AA compliance requirements
    - Provide guidelines for keyboard navigation
    - Provide guidelines for ARIA attributes
    - Provide guidelines for color contrast
    - _Requirements: 25.8_
  
  - [ ] 16.9 Create code snippet library
    - Provide code snippets for common patterns
    - Include button patterns (primary, secondary, text)
    - Include input patterns (default, focus, error)
    - Include section patterns (header, body, spacing)
    - _Requirements: 25.10_


- [ ] 17. Cross-browser and device testing
  - [ ] 17.1 Test on Chrome/Chromium
    - Test all functionality on latest Chrome
    - Verify styling renders correctly
    - Test responsive breakpoints
    - Test animations and transitions
  
  - [ ] 17.2 Test on Firefox
    - Test all functionality on latest Firefox
    - Verify styling renders correctly
    - Test responsive breakpoints
    - Test animations and transitions
  
  - [ ] 17.3 Test on Safari
    - Test all functionality on latest Safari
    - Verify styling renders correctly
    - Test responsive breakpoints
    - Test animations and transitions
  
  - [ ] 17.4 Test on mobile devices
    - Test on iOS Safari (iPhone)
    - Test on Android Chrome
    - Verify touch targets are adequate (≥44px)
    - Test sticky header/footer on mobile
    - Test form usability on mobile
  
  - [ ] 17.5 Test on tablet devices
    - Test on iPad Safari
    - Test on Android tablet
    - Verify 2-column layout works correctly
    - Test form usability on tablet

- [ ] 18. Performance optimization
  - [ ] 18.1 Optimize CSS bundle size
    - Remove unused Tailwind classes
    - Purge unused CSS
    - Verify CSS bundle size is reasonable
  
  - [ ] 18.2 Optimize animation performance
    - Ensure animations use transform/opacity (GPU-accelerated)
    - Verify 60fps performance during animations
    - Test on lower-end devices
  
  - [ ] 18.3 Optimize component re-renders
    - Verify form components don't re-render unnecessarily
    - Use React.memo where appropriate
    - Test form performance with many fields


- [ ] 19. Quality assurance and bug fixes
  - [ ] 19.1 Run automated test suite
    - Run all unit tests (npm run test)
    - Run all property-based tests
    - Run accessibility tests (axe-core)
    - Ensure all tests pass
  
  - [ ] 19.2 Manual QA testing
    - Test all form interactions manually
    - Test all button states and variants
    - Test all input states (focus, error, disabled)
    - Test collapsible sections
    - Test image upload functionality
    - Test import integrations (Hemnet, Vitec)
  
  - [ ] 19.3 Accessibility audit
    - Run automated accessibility audit (axe-core, Lighthouse)
    - Test with screen readers (NVDA, JAWS, VoiceOver)
    - Test keyboard navigation thoroughly
    - Verify all WCAG 2.1 AA requirements met
  
  - [ ] 19.4 Swedish language review
    - Have native Swedish speaker review all text
    - Verify all text sounds natural and professional
    - Ensure consistency in terminology
    - Get feedback from Swedish real estate professionals if possible
  
  - [ ] 19.5 Fix identified issues
    - Address any bugs found during testing
    - Fix any accessibility issues
    - Fix any visual inconsistencies
    - Fix any language issues

- [ ] 20. Final checkpoint and deployment preparation
  - Ensure all tests pass, ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across the entire codebase
- Unit tests validate specific component states and examples
- The redesign focuses on radical simplification: 90% white, minimal colors, generous spacing
- All text should sound natural in Swedish, not AI-generated
- Accessibility is a core requirement, not an afterthought
- The goal is to match the professional aesthetic of Hemnet and Svensk Fastighetsförmedling

## Success Criteria

The redesign is complete when:
- Zero colored backgrounds (red-50, blue-50, yellow-50, warning-bg, etc.) remain in the codebase
- Zero colored borders (red-300, blue-300, border-warning, etc.) remain in the codebase
- Only three font sizes are used in form components (13px, 15px, 16px)
- All borders are 1px light gray (#E5E7EB)
- All spacing follows the standard scale (gap-3, gap-4, gap-6, p-5, p-6)
- All interactive elements have minimum 44px touch targets on mobile
- All text meets WCAG 2.1 AA contrast standards
- All Swedish text sounds natural and professional
- All tests pass (unit tests, property tests, accessibility tests)
- The interface looks professionally designed by a Swedish real estate agency

