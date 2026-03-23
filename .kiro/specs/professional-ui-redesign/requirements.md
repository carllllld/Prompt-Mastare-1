# Requirements Document

## Introduction

OptiPrompt currently suffers from a visual design that users describe as "bad and cheaply made with the colours and the form and the texts and icons and almost everything." This comprehensive UI redesign addresses the entire application's visual design system to create a professional, modern SaaS aesthetic that inspires trust among Swedish real estate brokers.

The redesign focuses on establishing a cohesive design language, replacing inline styles with Tailwind design tokens, improving typography hierarchy, and creating a polished, premium appearance across all pages and components.

## Glossary

- **Design_System**: The complete set of design tokens, color variables, typography scales, spacing units, and component styles that define the visual language
- **Design_Token**: A named variable (e.g., `--primary`, `text-base`) that replaces inline style values for consistency
- **Typography_Hierarchy**: The structured system of font sizes, weights, and line heights that creates visual order
- **Component_Library**: The collection of UI primitives in `client/src/components/ui/` built on Radix UI
- **Landing_Page**: The public-facing marketing page at `/` (Landing.tsx)
- **App_Page**: The authenticated application interface at `/app` (Home.tsx)
- **Result_Section**: The component displaying generated text outputs (ResultSection.tsx)
- **Form_Component**: The input form for property data (PromptFormProfessional.tsx)
- **Color_Palette**: The complete set of brand colors including primary, secondary, accent, and semantic colors
- **Visual_Depth**: The use of shadows, borders, and layering to create hierarchy and dimension
- **Inline_Style**: Hard-coded style values (e.g., `style={{ color: "#2D6A4F" }}`) that should be replaced with design tokens

## Requirements

### Requirement 1: Establish Professional Color System

**User Story:** As a Swedish real estate broker, I want the application to have a professional, trustworthy color palette, so that I feel confident using it for my business.

#### Acceptance Criteria

1. THE Design_System SHALL define a cohesive color palette with primary, secondary, accent, and semantic colors
2. THE Design_System SHALL replace the current emerald green (#2D6A4F) with a more sophisticated primary color
3. THE Design_System SHALL replace warm beige backgrounds (#FAFAF8, #F8F6F1) with cleaner, more modern neutrals
4. THE Design_System SHALL define all colors as CSS custom properties in `client/src/index.css`
5. WHEN colors are needed in components, THE Component_Library SHALL use Tailwind design tokens instead of inline hex values
6. THE Color_Palette SHALL include proper contrast ratios meeting WCAG AA standards for all text
7. THE Color_Palette SHALL support both light mode and semantic color variants (success, warning, error, info)
8. THE Design_System SHALL eliminate all inline `style={{ color: "..." }}` declarations in favor of Tailwind classes

### Requirement 2: Modernize Typography System

**User Story:** As a user, I want text to be readable and professionally styled, so that the interface feels polished and easy to scan.

#### Acceptance Criteria

1. THE Typography_Hierarchy SHALL replace Lora serif font with a modern sans-serif for headings
2. THE Typography_Hierarchy SHALL eliminate very small font sizes (text-[10px], text-[11px]) in favor of standard Tailwind scale
3. THE Typography_Hierarchy SHALL define clear heading levels (h1-h6) with consistent sizing and spacing
4. THE Typography_Hierarchy SHALL use a minimum font size of `text-xs` (12px) for body text
5. THE Typography_Hierarchy SHALL define line-height values that improve readability
6. THE Typography_Hierarchy SHALL use font weights consistently (400 for body, 500 for medium, 600 for semibold, 700 for bold)
7. WHEN displaying labels or metadata, THE Component_Library SHALL use `text-sm` (14px) minimum instead of custom pixel values
8. THE Typography_Hierarchy SHALL define letter-spacing values for uppercase labels that improve legibility

### Requirement 3: Redesign Landing Page Visual Identity

**User Story:** As a potential customer, I want the landing page to look professional and modern, so that I trust the service with my business content.

#### Acceptance Criteria

1. THE Landing_Page SHALL use a clean, modern hero section with improved visual hierarchy
2. THE Landing_Page SHALL replace the current gradient background with a more subtle, professional design
3. THE Landing_Page SHALL use consistent card styling with proper shadows and borders
4. THE Landing_Page SHALL improve the before/after demo section with better visual contrast
5. THE Landing_Page SHALL use consistent button styles that match the new design system
6. THE Landing_Page SHALL improve spacing and padding for better visual breathing room
7. THE Landing_Page SHALL use icons consistently with proper sizing and color
8. WHEN displaying pricing cards, THE Landing_Page SHALL use elevated card designs with clear visual hierarchy

### Requirement 4: Redesign Application Interface

**User Story:** As a broker using the application, I want the main interface to feel professional and polished, so that I enjoy using it daily.

#### Acceptance Criteria

1. THE App_Page SHALL use a clean, modern layout with improved spacing
2. THE App_Page SHALL replace the current background gradient with a more subtle design
3. THE App_Page SHALL improve the header/navigation bar with better visual weight
4. THE App_Page SHALL use consistent card styling throughout the interface
5. THE App_Page SHALL improve the form section with better visual organization
6. THE App_Page SHALL use proper visual hierarchy for primary and secondary actions
7. WHEN displaying user status or quota information, THE App_Page SHALL use clear, readable badges
8. THE App_Page SHALL eliminate all inline style declarations in favor of Tailwind classes

### Requirement 5: Redesign Result Section Component

**User Story:** As a broker, I want the generated text results to be displayed in a clean, professional format, so that I can easily read and copy them.

#### Acceptance Criteria

1. THE Result_Section SHALL use consistent card styling with proper elevation
2. THE Result_Section SHALL improve the copy button design and interaction states
3. THE Result_Section SHALL use better visual separation between different text outputs
4. THE Result_Section SHALL improve the header sections with clearer typography
5. THE Result_Section SHALL use consistent icon sizing and coloring
6. WHEN displaying expert feedback, THE Result_Section SHALL use clear, readable panels
7. THE Result_Section SHALL improve the inline highlights with better visual contrast
8. THE Result_Section SHALL eliminate all inline color values in favor of design tokens

### Requirement 6: Redesign Form Component

**User Story:** As a broker, I want the input form to be clean and easy to use, so that I can quickly enter property data.

#### Acceptance Criteria

1. THE Form_Component SHALL use consistent input styling with proper focus states
2. THE Form_Component SHALL improve label typography and spacing
3. THE Form_Component SHALL use better visual grouping for related fields
4. THE Form_Component SHALL improve button styling and hierarchy
5. THE Form_Component SHALL use consistent icon sizing and positioning
6. WHEN displaying validation errors, THE Form_Component SHALL use clear, readable error messages
7. THE Form_Component SHALL improve the overall spacing and padding for better visual flow
8. THE Form_Component SHALL eliminate all inline style declarations

### Requirement 7: Standardize UI Primitives Library

**User Story:** As a developer, I want all UI primitives to follow consistent design patterns, so that the interface feels cohesive.

#### Acceptance Criteria

1. THE Component_Library SHALL update all button variants with new design system colors
2. THE Component_Library SHALL improve card component styling with better shadows and borders
3. THE Component_Library SHALL update input components with better focus states
4. THE Component_Library SHALL improve dialog and modal styling
5. THE Component_Library SHALL update badge components with new color palette
6. THE Component_Library SHALL improve dropdown and select components
7. THE Component_Library SHALL update all components to use design tokens instead of hard-coded values
8. WHEN a component has multiple variants, THE Component_Library SHALL ensure visual consistency across variants

### Requirement 8: Improve Visual Depth and Hierarchy

**User Story:** As a user, I want the interface to have clear visual hierarchy, so that I can easily understand what's important.

#### Acceptance Criteria

1. THE Design_System SHALL define a consistent shadow scale (sm, md, lg, xl) for elevation
2. THE Design_System SHALL use shadows to create depth and separate content layers
3. THE Design_System SHALL define border styles that create subtle separation without harshness
4. THE Design_System SHALL use spacing consistently to create visual grouping
5. WHEN displaying cards, THE Component_Library SHALL use appropriate elevation levels
6. THE Design_System SHALL use color contrast to establish hierarchy
7. THE Design_System SHALL use size and weight to establish importance
8. THE Visual_Depth SHALL be applied consistently across all pages and components

### Requirement 9: Standardize Icon Usage

**User Story:** As a user, I want icons to be consistent and professional, so that the interface feels polished.

#### Acceptance Criteria

1. THE Component_Library SHALL use consistent icon sizing (w-4 h-4 for inline, w-5 h-5 for buttons, w-6 h-6 for headers)
2. THE Component_Library SHALL use consistent icon colors from the design system
3. THE Component_Library SHALL use icons from Lucide React consistently
4. THE Component_Library SHALL position icons consistently relative to text
5. WHEN icons are used in buttons, THE Component_Library SHALL use proper spacing (gap-2)
6. THE Component_Library SHALL use semantic icon colors (success, warning, error) appropriately
7. THE Component_Library SHALL eliminate inline icon color styles
8. THE Component_Library SHALL use icon stroke width consistently

### Requirement 10: Improve Interactive States

**User Story:** As a user, I want buttons and interactive elements to have clear hover and active states, so that I know what's clickable.

#### Acceptance Criteria

1. THE Component_Library SHALL define hover states for all interactive elements
2. THE Component_Library SHALL define active/pressed states for buttons
3. THE Component_Library SHALL define focus states that meet accessibility standards
4. THE Component_Library SHALL define disabled states with appropriate visual feedback
5. WHEN a user hovers over a button, THE Component_Library SHALL provide clear visual feedback
6. THE Component_Library SHALL use transitions for smooth state changes
7. THE Component_Library SHALL use cursor styles appropriately (pointer, not-allowed, etc.)
8. THE Component_Library SHALL ensure all interactive states use design tokens

### Requirement 11: Improve Spacing and Layout

**User Story:** As a user, I want the interface to have proper spacing and breathing room, so that it doesn't feel cramped.

#### Acceptance Criteria

1. THE Design_System SHALL define a consistent spacing scale using Tailwind's default scale
2. THE Design_System SHALL use larger padding values for cards and containers
3. THE Design_System SHALL use consistent gap values for flex and grid layouts
4. THE Design_System SHALL improve vertical rhythm with consistent margin-bottom values
5. WHEN displaying content sections, THE Component_Library SHALL use adequate spacing between sections
6. THE Design_System SHALL use responsive spacing that adapts to screen size
7. THE Design_System SHALL eliminate cramped layouts with insufficient padding
8. THE Design_System SHALL use whitespace strategically to create visual hierarchy

### Requirement 12: Improve Responsive Design

**User Story:** As a mobile user, I want the interface to look professional on all devices, so that I can use it anywhere.

#### Acceptance Criteria

1. THE Design_System SHALL ensure all components are responsive and mobile-friendly
2. THE Design_System SHALL use appropriate breakpoints (sm, md, lg, xl) consistently
3. THE Design_System SHALL adjust typography sizes for mobile devices
4. THE Design_System SHALL adjust spacing for mobile devices
5. WHEN viewing on mobile, THE Component_Library SHALL stack layouts appropriately
6. THE Design_System SHALL ensure touch targets are at least 44x44px on mobile
7. THE Design_System SHALL test all pages on mobile, tablet, and desktop viewports
8. THE Design_System SHALL ensure horizontal scrolling is never required

### Requirement 13: Create Design System Documentation

**User Story:** As a developer, I want clear documentation of the design system, so that I can implement features consistently.

#### Acceptance Criteria

1. THE Design_System SHALL document all color tokens with usage guidelines
2. THE Design_System SHALL document typography scale with examples
3. THE Design_System SHALL document spacing scale with examples
4. THE Design_System SHALL document shadow scale with examples
5. THE Design_System SHALL document component variants with visual examples
6. THE Design_System SHALL provide before/after examples of the redesign
7. THE Design_System SHALL include guidelines for when to use each design token
8. THE Design_System SHALL be maintained in a markdown file in the project

### Requirement 14: Eliminate Inline Styles

**User Story:** As a developer, I want all styling to use Tailwind classes, so that the codebase is maintainable and consistent.

#### Acceptance Criteria

1. THE Component_Library SHALL remove all inline `style={{ ... }}` declarations from Landing.tsx
2. THE Component_Library SHALL remove all inline style declarations from Home.tsx
3. THE Component_Library SHALL remove all inline style declarations from ResultSection.tsx
4. THE Component_Library SHALL remove all inline style declarations from PromptFormProfessional.tsx
5. THE Component_Library SHALL remove all inline style declarations from UI primitives
6. WHEN styling is needed, THE Component_Library SHALL use Tailwind utility classes
7. WHEN custom values are needed, THE Component_Library SHALL extend Tailwind config
8. THE Component_Library SHALL use CSS custom properties for dynamic values only

### Requirement 15: Improve Loading and Empty States

**User Story:** As a user, I want loading and empty states to be visually polished, so that the interface feels complete.

#### Acceptance Criteria

1. THE Component_Library SHALL improve loading skeleton designs
2. THE Component_Library SHALL improve loading spinner designs
3. THE Component_Library SHALL improve empty state illustrations and messaging
4. THE Component_Library SHALL use consistent animation timing for loading states
5. WHEN content is loading, THE Component_Library SHALL provide clear visual feedback
6. THE Component_Library SHALL use skeleton screens that match final content layout
7. THE Component_Library SHALL improve progress indicators with better visual design
8. THE Component_Library SHALL ensure all loading states use design system colors

### Requirement 16: Improve Error and Success States

**User Story:** As a user, I want error and success messages to be clear and professional, so that I understand what happened.

#### Acceptance Criteria

1. THE Component_Library SHALL improve toast notification designs
2. THE Component_Library SHALL improve alert component designs
3. THE Component_Library SHALL use semantic colors for error, warning, success, and info states
4. THE Component_Library SHALL improve error message typography and spacing
5. WHEN an error occurs, THE Component_Library SHALL display clear, actionable messages
6. THE Component_Library SHALL use appropriate icons for different message types
7. THE Component_Library SHALL ensure error states are accessible and readable
8. THE Component_Library SHALL use consistent styling for all feedback messages

### Requirement 17: Improve Modal and Dialog Designs

**User Story:** As a user, I want modals and dialogs to be clean and professional, so that they don't disrupt my workflow.

#### Acceptance Criteria

1. THE Component_Library SHALL improve dialog component styling with better shadows
2. THE Component_Library SHALL improve modal backdrop opacity and blur
3. THE Component_Library SHALL improve dialog header and footer designs
4. THE Component_Library SHALL use consistent padding and spacing in dialogs
5. WHEN a dialog opens, THE Component_Library SHALL use smooth animations
6. THE Component_Library SHALL improve close button designs
7. THE Component_Library SHALL ensure dialogs are properly centered and responsive
8. THE Component_Library SHALL use design system colors for all dialog elements

### Requirement 18: Improve Table and List Designs

**User Story:** As a user, I want tables and lists to be easy to read, so that I can quickly scan information.

#### Acceptance Criteria

1. THE Component_Library SHALL improve table styling with better borders and spacing
2. THE Component_Library SHALL improve table header designs
3. THE Component_Library SHALL use zebra striping or hover states for table rows
4. THE Component_Library SHALL improve list item designs with better spacing
5. WHEN displaying tabular data, THE Component_Library SHALL ensure proper alignment
6. THE Component_Library SHALL use consistent padding in table cells
7. THE Component_Library SHALL improve empty table states
8. THE Component_Library SHALL ensure tables are responsive on mobile devices

### Requirement 19: Improve Badge and Tag Designs

**User Story:** As a user, I want badges and tags to be visually distinct, so that I can quickly identify status and categories.

#### Acceptance Criteria

1. THE Component_Library SHALL improve badge component designs with better colors
2. THE Component_Library SHALL use consistent badge sizing and padding
3. THE Component_Library SHALL define badge variants (default, success, warning, error, info)
4. THE Component_Library SHALL improve tag designs for filtering and categorization
5. WHEN displaying status, THE Component_Library SHALL use semantic badge colors
6. THE Component_Library SHALL use consistent typography in badges
7. THE Component_Library SHALL ensure badges are readable against all backgrounds
8. THE Component_Library SHALL eliminate inline badge styles

### Requirement 20: Create Visual Consistency Audit

**User Story:** As a product owner, I want to ensure visual consistency across the entire application, so that users have a cohesive experience.

#### Acceptance Criteria

1. THE Design_System SHALL audit all pages for visual consistency
2. THE Design_System SHALL audit all components for design token usage
3. THE Design_System SHALL identify and fix inconsistent spacing
4. THE Design_System SHALL identify and fix inconsistent colors
5. THE Design_System SHALL identify and fix inconsistent typography
6. THE Design_System SHALL identify and fix inconsistent shadows and borders
7. WHEN the audit is complete, THE Design_System SHALL document all changes made
8. THE Design_System SHALL provide a checklist for maintaining consistency in future development
