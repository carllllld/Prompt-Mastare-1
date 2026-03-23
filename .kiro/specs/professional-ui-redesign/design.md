# Design Document: Professional UI Redesign

## Overview

This design transforms OptiPrompt from its current state—described by users as "bad and cheaply made with the colours and the form and the texts and icons and almost everything"—into a professional, modern SaaS application that inspires trust among Swedish real estate brokers.

The redesign establishes a cohesive design system built on Tailwind CSS design tokens, eliminates all inline styles, modernizes typography, and creates a polished visual identity across all pages and components.

### Current State Analysis

The existing UI suffers from:
- Heavy reliance on inline `style={{ ... }}` declarations (hundreds of instances)
- Inconsistent color usage with hard-coded hex values (#2D6A4F, #FAFAF8, #F8F6F1)
- Very small font sizes (text-[10px], text-[11px]) that hurt readability
- Serif font (Lora) for headings that feels dated
- Warm beige backgrounds that lack modern polish
- Inconsistent spacing, shadows, and visual hierarchy
- Mixed design patterns across Landing, App, and Result sections

### Design Goals

1. **Professional Trust**: Create a visual identity that Swedish brokers trust for business content
2. **Modern SaaS Aesthetic**: Match contemporary SaaS applications (Linear, Notion, Vercel)
3. **Design System Consistency**: Use Tailwind design tokens exclusively
4. **Improved Readability**: Larger font sizes, better contrast, clearer hierarchy
5. **Visual Polish**: Proper shadows, spacing, and interactive states
6. **Maintainability**: Zero inline styles, all styling through Tailwind classes

## Architecture

### Design System Foundation

The redesign is built on a three-layer architecture:

1. **Design Tokens Layer** (CSS custom properties in `index.css`)
   - Color palette variables
   - Typography scale
   - Spacing units
   - Shadow definitions
   - Border radius values

2. **Tailwind Configuration Layer** (`tailwind.config.ts`)
   - Maps design tokens to Tailwind utilities
   - Extends default theme with custom values
   - Defines component-specific utilities

3. **Component Layer** (`components/ui/`)
   - Radix UI primitives styled with design tokens
   - Consistent variants across all components
   - Proper interactive states

### Technology Stack

- **Styling**: Tailwind CSS 3.x with custom design tokens
- **UI Primitives**: Radix UI (already in use)
- **Typography**: Inter (sans-serif) for all text
- **Icons**: Lucide React (already in use)
- **Animations**: Tailwind transitions + custom keyframes

## Components and Interfaces

### 1. Design Token System

#### Color Palette

Replace the current warm, earthy palette with a modern, professional system:

**Primary Colors** (Brand identity)
```css
--primary: 220 70% 50%;           /* Modern blue #2563EB */
--primary-foreground: 0 0% 100%;  /* White text on primary */
--primary-hover: 220 70% 45%;     /* Darker on hover */
--primary-border: 220 70% 55%;    /* Border variant */
```

**Neutral Colors** (Backgrounds, text, borders)
```css
--background: 0 0% 100%;          /* Pure white */
--foreground: 220 13% 18%;        /* Near-black text #1E293B */

--muted: 220 13% 96%;             /* Light gray bg #F8FAFC */
--muted-foreground: 220 9% 46%;   /* Muted text #64748B */

--card: 0 0% 100%;                /* White cards */
--card-foreground: 220 13% 18%;   /* Card text */
--card-border: 220 13% 91%;       /* Card borders #E2E8F0 */

--border: 220 13% 91%;            /* Default borders */
--input: 220 13% 91%;             /* Input borders */
--ring: 220 70% 50%;              /* Focus rings */
```

**Semantic Colors**
```css
--success: 142 71% 45%;           /* Green #10B981 */
--success-foreground: 0 0% 100%;
--success-bg: 142 76% 96%;        /* Light green bg */

--warning: 38 92% 50%;            /* Amber #F59E0B */
--warning-foreground: 0 0% 100%;
--warning-bg: 48 96% 95%;         /* Light amber bg */

--error: 0 72% 51%;               /* Red #DC2626 */
--error-foreground: 0 0% 100%;
--error-bg: 0 86% 97%;            /* Light red bg */

--info: 199 89% 48%;              /* Cyan #0EA5E9 */
--info-foreground: 0 0% 100%;
--info-bg: 199 95% 96%;           /* Light cyan bg */
```

**Accent Colors** (Secondary actions, highlights)
```css
--accent: 220 13% 96%;            /* Light gray */
--accent-foreground: 220 13% 18%;
--accent-hover: 220 13% 91%;

--secondary: 220 13% 96%;
--secondary-foreground: 220 13% 18%;
--secondary-border: 220 13% 86%;
```

#### Typography Scale

Replace Lora serif with Inter sans-serif and eliminate tiny font sizes:

**Font Families**
```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Font Sizes** (Minimum 12px, standard Tailwind scale)
```css
--text-xs: 0.75rem;      /* 12px - minimum size */
--text-sm: 0.875rem;     /* 14px - body text */
--text-base: 1rem;       /* 16px - default */
--text-lg: 1.125rem;     /* 18px - large body */
--text-xl: 1.25rem;      /* 20px - small headings */
--text-2xl: 1.5rem;      /* 24px - headings */
--text-3xl: 1.875rem;    /* 30px - large headings */
--text-4xl: 2.25rem;     /* 36px - hero */
--text-5xl: 3rem;        /* 48px - hero large */
```

**Font Weights**
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

**Line Heights**
```css
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

#### Spacing Scale

Use Tailwind's default 4px-based scale consistently:
- `space-1` = 4px
- `space-2` = 8px
- `space-3` = 12px
- `space-4` = 16px
- `space-5` = 20px
- `space-6` = 24px
- `space-8` = 32px
- `space-10` = 40px
- `space-12` = 48px
- `space-16` = 64px

#### Shadow Scale

Define elevation levels for visual depth:

```css
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
```

#### Border Radius

```css
--radius-sm: 0.375rem;   /* 6px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.5rem;    /* 24px */
--radius-full: 9999px;   /* Pills/circles */
```

### 2. Component Redesigns

#### Button Component

**Variants**
- `default`: Primary blue background, white text
- `secondary`: Light gray background, dark text
- `outline`: White background, border, dark text
- `ghost`: Transparent background, dark text
- `destructive`: Red background, white text

**Sizes**
- `sm`: h-8 px-3 text-xs
- `default`: h-10 px-4 text-sm
- `lg`: h-12 px-6 text-base
- `icon`: h-10 w-10

**Interactive States**
- Hover: Darken background by 5%, lift with shadow-sm
- Active: Darken background by 10%, remove shadow
- Focus: ring-2 ring-primary ring-offset-2
- Disabled: opacity-50 cursor-not-allowed

**Implementation**
```typescript
const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md active:shadow-none",
  secondary: "bg-secondary text-secondary-foreground border border-secondary-border hover:bg-accent",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-error text-error-foreground hover:bg-error/90"
}
```

#### Card Component

**Base Styles**
- Background: white
- Border: 1px solid var(--card-border)
- Border radius: rounded-xl (12px)
- Shadow: shadow-sm
- Padding: p-6

**Variants**
- `elevated`: shadow-md hover:shadow-lg
- `flat`: shadow-none border-2
- `interactive`: hover:shadow-md cursor-pointer transition-shadow

**Header/Footer**
- Header: border-b border-border pb-4 mb-4
- Footer: border-t border-border pt-4 mt-4

#### Input Component

**Base Styles**
- Height: h-10
- Border: border border-input
- Border radius: rounded-md
- Background: bg-background
- Text: text-sm
- Padding: px-3

**States**
- Focus: ring-2 ring-ring ring-offset-2 border-primary
- Error: border-error ring-error
- Disabled: bg-muted opacity-50 cursor-not-allowed

**Placeholder**
- Color: text-muted-foreground
- Italic: italic
- Transition: focus:placeholder-transparent

#### Badge Component

**Variants**
- `default`: bg-primary text-primary-foreground
- `secondary`: bg-secondary text-secondary-foreground
- `success`: bg-success-bg text-success border border-success
- `warning`: bg-warning-bg text-warning border border-warning
- `error`: bg-error-bg text-error border border-error
- `outline`: border border-input

**Sizes**
- `sm`: px-2 py-0.5 text-xs
- `default`: px-2.5 py-1 text-sm
- `lg`: px-3 py-1.5 text-base

### 3. Page-Specific Designs

#### Landing Page Redesign

**Hero Section**
- Background: Clean white with subtle gradient overlay
- Heading: text-5xl font-bold text-foreground
- Subheading: text-xl text-muted-foreground
- CTA Button: Large primary button with shadow-lg
- Stats: Grid of metric cards with shadow-sm

**Before/After Demo**
- Container: Card with shadow-md
- Tabs: Pill-shaped buttons with active state
- Content: Two-column grid on desktop, stacked on mobile
- Labels: Small badges with semantic colors

**Features Grid**
- Cards: shadow-sm hover:shadow-md transition
- Icons: w-10 h-10 in colored circles
- Titles: text-lg font-semibold
- Descriptions: text-sm text-muted-foreground

**Pricing Cards**
- Container: Card with shadow-md
- Highlight: border-2 border-primary shadow-lg
- Price: text-4xl font-bold
- Features: List with checkmark icons
- CTA: Full-width button

#### App Page Redesign

**Navigation Bar**
- Background: bg-background/95 backdrop-blur-sm
- Border: border-b border-border
- Height: h-16
- Logo: text-xl font-bold
- User Menu: Dropdown with shadow-lg

**Form Section**
- Container: Card with shadow-md
- Field Groups: Collapsible sections with borders
- Labels: text-sm font-medium text-foreground
- Inputs: Consistent styling with focus states
- Chips: Pill-shaped buttons with toggle states

**Status Bar**
- Background: bg-muted
- Border: rounded-lg
- Badges: Semantic colors for different statuses
- Icons: w-4 h-4 inline with text

#### Result Section Redesign

**Main Container**
- Background: bg-background
- Spacing: space-y-6 between sections

**Text Cards**
- Container: Card with shadow-md
- Header: bg-muted border-b
- Content: p-6 text-base leading-relaxed
- Copy Button: Outline variant with icon

**Expert Feedback Panel**
- Container: Card with border-warning
- Background: bg-warning-bg
- Items: List with hover states
- Actions: Small buttons with icons

**Status Indicators**
- Quality Score: Progress bar with gradient
- Fact Check: Badge with semantic color
- Warnings: Alert component with icon

## Data Models

### Design Token Configuration

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          border: "hsl(var(--primary-border))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          border: "hsl(var(--secondary-border))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "hsl(var(--accent-hover))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          border: "hsl(var(--card-border))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          bg: "hsl(var(--success-bg))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          bg: "hsl(var(--warning-bg))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
          bg: "hsl(var(--error-bg))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          bg: "hsl(var(--info-bg))",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }],
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
    },
  },
}
```

### Component Prop Interfaces

```typescript
// Button
interface ButtonProps {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
}

// Card
interface CardProps {
  variant?: "default" | "elevated" | "flat" | "interactive";
  padding?: "none" | "sm" | "default" | "lg";
}

// Badge
interface BadgeProps {
  variant?: "default" | "secondary" | "success" | "warning" | "error" | "outline";
  size?: "sm" | "default" | "lg";
}

// Input
interface InputProps {
  error?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:

**Redundancy Group 1: Inline Style Elimination**
- Properties 1.5, 1.8, 4.8, 5.8, 6.8, 7.7, 9.7, 14.1-14.5, 14.8 all test for absence of inline styles
- These can be combined into a single comprehensive property: "No inline style attributes with hard-coded values in any component file"

**Redundancy Group 2: Icon Consistency**
- Properties 3.7, 5.5, 6.5, 9.1-9.8 all test icon styling consistency
- These can be combined into: "All icons use consistent sizing, coloring, and spacing from design tokens"

**Redundancy Group 3: Interactive States**
- Properties 5.2, 10.1-10.8 all test interactive state definitions
- These can be combined into: "All interactive elements have hover, active, focus, and disabled states using design tokens"

**Redundancy Group 4: Component Consistency**
- Properties 3.3, 3.5, 4.4, 4.6, 5.1, 6.1, 6.4 all test that components use design system classes
- These can be combined into: "All component instances use design system classes, not custom styles"

**Redundancy Group 5: Typography Minimums**
- Properties 2.2, 2.4, 2.7 all test minimum font sizes
- These can be combined into: "All text elements use minimum font size of text-xs (12px)"

**Redundancy Group 6: Responsive Design**
- Properties 11.6, 12.2-12.6 all test responsive behavior
- These can be combined into: "All layouts use responsive classes with appropriate breakpoints and mobile touch targets"

After reflection, I will write 15 unique properties that provide comprehensive coverage without redundancy.

### Property 1: No Inline Style Attributes

*For any* component file in the codebase, all style attributes should either be absent or contain only CSS custom properties (no hard-coded color, size, or spacing values)

**Validates: Requirements 1.5, 1.8, 4.8, 5.8, 6.8, 7.7, 9.7, 14.1, 14.2, 14.3, 14.4, 14.5, 14.8**

### Property 2: Design Token Color Usage

*For any* component that needs colors, all color values should be referenced through Tailwind utility classes (text-*, bg-*, border-*) using design token names, not hex values

**Validates: Requirements 1.5, 1.8, 5.8, 7.7, 9.2, 10.8**

### Property 3: Minimum Font Size

*For any* text element in the application, the font size should be at least text-xs (12px), with no text-[10px] or text-[11px] classes

**Validates: Requirements 2.2, 2.4, 2.7**

### Property 4: Consistent Font Weights

*For any* text element, the font weight should be one of: 400 (normal), 500 (medium), 600 (semibold), or 700 (bold), with no custom numeric values

**Validates: Requirements 2.6**

### Property 5: Uppercase Letter Spacing

*For any* text element with uppercase transformation, letter-spacing should be defined (tracking-wide or tracking-wider)

**Validates: Requirements 2.8**

### Property 6: Icon Size Consistency

*For any* icon element, the size classes should be one of: w-3 h-3 (small), w-4 h-4 (inline), w-5 h-5 (buttons), w-6 h-6 (headers), or w-8 h-8 (large)

**Validates: Requirements 3.7, 5.5, 6.5, 9.1**

### Property 7: Icon Color Tokens

*For any* icon element, colors should be applied through Tailwind classes using design tokens, not inline styles

**Validates: Requirements 9.2, 9.7**

### Property 8: Icon Import Source

*For any* icon import statement, the source should be 'lucide-react'

**Validates: Requirements 9.3**

### Property 9: Icon-Text Spacing

*For any* element containing both an icon and text, the container should use gap-1, gap-1.5, gap-2, or gap-3 for spacing

**Validates: Requirements 9.4, 9.5**

### Property 10: Interactive Element States

*For any* interactive element (button, link, input), the element should have hover:, active:, focus:, and disabled: state classes defined

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.8**

### Property 11: Interactive Element Cursors

*For any* interactive element, clickable elements should have cursor-pointer and disabled elements should have cursor-not-allowed

**Validates: Requirements 10.7**

### Property 12: Flex/Grid Gap Consistency

*For any* flex or grid container, gap values should use Tailwind's spacing scale (gap-1 through gap-16)

**Validates: Requirements 11.3**

### Property 13: Vertical Spacing Consistency

*For any* section container, vertical spacing between child elements should use space-y-* classes from Tailwind's spacing scale

**Validates: Requirements 11.4**

### Property 14: Responsive Breakpoints

*For any* responsive class, the breakpoint prefix should be one of Tailwind's standard breakpoints: sm:, md:, lg:, xl:, or 2xl:

**Validates: Requirements 12.2**

### Property 15: Mobile Touch Targets

*For any* interactive element on mobile viewports, the minimum height and width should be 44px (h-11 w-11 or larger)

**Validates: Requirements 12.6**

### Property 16: WCAG Contrast Ratios

*For any* text-background color combination, the contrast ratio should meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)

**Validates: Requirements 1.6**

### Property 17: Semantic Color Usage

*For any* status indicator (success, warning, error, info), the element should use the corresponding semantic color class (text-success, bg-warning-bg, etc.)

**Validates: Requirements 9.6**

### Property 18: Card Component Consistency

*For any* card element, the styling should use the Card component classes (rounded-xl, border, shadow-sm/md/lg) from the design system

**Validates: Requirements 3.3, 4.4, 5.1**

### Property 19: Button Component Consistency

*For any* button element, the styling should use the Button component variants (default, secondary, outline, ghost, destructive) from the design system

**Validates: Requirements 3.5, 4.6, 6.4**

### Property 20: Input Focus States

*For any* input element, focus states should include ring-2 and ring-ring classes

**Validates: Requirements 6.1**

## Error Handling

### Design System Validation Errors

**Missing Design Tokens**
- Error: Component references undefined CSS custom property
- Handling: Build-time validation checks all CSS custom properties are defined
- Recovery: Provide clear error message with missing token name and suggested alternatives

**Invalid Color Contrast**
- Error: Text-background combination fails WCAG AA standards
- Handling: Automated contrast checker runs during build
- Recovery: Fail build with specific color combinations that need adjustment

**Inline Style Detection**
- Error: Component contains inline style attribute with hard-coded values
- Handling: ESLint rule detects inline styles during development
- Recovery: Provide error message with file location and suggested Tailwind class

### Component Variant Errors

**Invalid Variant Prop**
- Error: Component receives variant prop not defined in variants object
- Handling: TypeScript type checking catches invalid variants at compile time
- Recovery: Show TypeScript error with valid variant options

**Missing Required Props**
- Error: Component missing required accessibility props (aria-label, etc.)
- Handling: TypeScript and ESLint enforce required props
- Recovery: Build fails with clear message about missing props

### Responsive Design Errors

**Touch Target Too Small**
- Error: Interactive element smaller than 44x44px on mobile
- Handling: Automated accessibility checker during build
- Recovery: Fail build with specific elements that need size adjustment

**Horizontal Overflow**
- Error: Element width exceeds viewport on mobile
- Handling: Visual regression testing catches overflow issues
- Recovery: Manual review and adjustment of element widths

### Migration Errors

**Incomplete Style Removal**
- Error: Old inline styles still present after migration
- Handling: Automated script scans for old color values and style attributes
- Recovery: Generate report of files needing manual review

**Broken Component References**
- Error: Component imports old UI primitive that was renamed
- Handling: TypeScript catches missing imports at compile time
- Recovery: Update import statements to new component names

## Testing Strategy

### Dual Testing Approach

This redesign requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and component rendering
- Component snapshot tests for visual regression
- Specific color contrast ratio checks
- Individual component variant rendering
- Accessibility attribute presence

**Property Tests**: Verify universal properties across all components
- No inline styles across entire codebase
- Consistent icon sizing across all icon instances
- Interactive states on all clickable elements
- Minimum font sizes across all text elements

### Unit Testing Strategy

**Component Snapshot Tests**
```typescript
describe('Button Component', () => {
  it('renders default variant correctly', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container).toMatchSnapshot();
  });

  it('renders all variants correctly', () => {
    const variants = ['default', 'secondary', 'outline', 'ghost', 'destructive'];
    variants.forEach(variant => {
      const { container } = render(<Button variant={variant}>Click</Button>);
      expect(container).toMatchSnapshot();
    });
  });
});
```

**Color Contrast Tests**
```typescript
describe('Color Contrast', () => {
  it('primary button meets WCAG AA standards', () => {
    const primaryBg = getComputedColor('--primary');
    const primaryFg = getComputedColor('--primary-foreground');
    const ratio = calculateContrastRatio(primaryBg, primaryFg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('all semantic colors meet WCAG AA standards', () => {
    const semanticPairs = [
      ['--success', '--success-foreground'],
      ['--warning', '--warning-foreground'],
      ['--error', '--error-foreground'],
      ['--info', '--info-foreground'],
    ];
    
    semanticPairs.forEach(([bg, fg]) => {
      const bgColor = getComputedColor(bg);
      const fgColor = getComputedColor(fg);
      const ratio = calculateContrastRatio(bgColor, fgColor);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
```

**Accessibility Tests**
```typescript
describe('Accessibility', () => {
  it('all buttons have accessible names', () => {
    const { getAllByRole } = render(<App />);
    const buttons = getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
  });

  it('all inputs have associated labels', () => {
    const { getAllByRole } = render(<PromptFormProfessional />);
    const inputs = getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAccessibleName();
    });
  });
});
```

### Property-Based Testing Strategy

**Configuration**: Each property test runs minimum 100 iterations with randomized inputs

**Test Library**: fast-check for TypeScript property-based testing

**Property Test 1: No Inline Styles**
```typescript
import fc from 'fast-check';
import { glob } from 'glob';
import fs from 'fs';

describe('Property: No Inline Styles', () => {
  it('no component files contain inline style attributes with hard-coded values', () => {
    // Feature: professional-ui-redesign, Property 1: For any component file in the codebase, all style attributes should either be absent or contain only CSS custom properties
    
    const componentFiles = glob.sync('client/src/**/*.{tsx,jsx}');
    
    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for inline style with hard-coded values
      const inlineStyleRegex = /style=\{\{[^}]*(?:color|background|fontSize|padding|margin|width|height):\s*["'](?!var\()[^"']+["'][^}]*\}\}/g;
      const matches = content.match(inlineStyleRegex);
      
      expect(matches).toBeNull();
    });
  });
});
```

**Property Test 2: Design Token Color Usage**
```typescript
describe('Property: Design Token Color Usage', () => {
  it('all color values use Tailwind classes, not hex values', () => {
    // Feature: professional-ui-redesign, Property 2: For any component that needs colors, all color values should be referenced through Tailwind utility classes
    
    const componentFiles = glob.sync('client/src/**/*.{tsx,jsx}');
    
    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for hex color values in className or style
      const hexColorRegex = /#[0-9A-Fa-f]{3,8}/g;
      const matches = content.match(hexColorRegex);
      
      // Allow hex colors only in comments or test files
      if (matches && !file.includes('.test.') && !file.includes('.spec.')) {
        const nonCommentMatches = matches.filter(match => {
          const index = content.indexOf(match);
          const lineStart = content.lastIndexOf('\n', index);
          const line = content.substring(lineStart, content.indexOf('\n', index));
          return !line.trim().startsWith('//') && !line.trim().startsWith('*');
        });
        
        expect(nonCommentMatches).toHaveLength(0);
      }
    });
  });
});
```

**Property Test 3: Minimum Font Size**
```typescript
describe('Property: Minimum Font Size', () => {
  it('all text elements use minimum font size of text-xs (12px)', () => {
    // Feature: professional-ui-redesign, Property 3: For any text element in the application, the font size should be at least text-xs (12px)
    
    const componentFiles = glob.sync('client/src/**/*.{tsx,jsx}');
    
    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for forbidden small font sizes
      const tinyFontRegex = /text-\[(10|11)px\]/g;
      const matches = content.match(tinyFontRegex);
      
      expect(matches).toBeNull();
    });
  });
});
```

**Property Test 4: Icon Size Consistency**
```typescript
describe('Property: Icon Size Consistency', () => {
  it('all icons use standard size classes', () => {
    // Feature: professional-ui-redesign, Property 6: For any icon element, the size classes should be one of the standard sizes
    
    fc.assert(
      fc.property(
        fc.constantFrom('w-3 h-3', 'w-4 h-4', 'w-5 h-5', 'w-6 h-6', 'w-8 h-8'),
        (validSize) => {
          const componentFiles = glob.sync('client/src/**/*.{tsx,jsx}');
          
          componentFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf-8');
            
            // Find all icon usages (Lucide React components)
            const iconRegex = /<[A-Z][a-zA-Z]*\s+className="([^"]*)"/g;
            let match;
            
            while ((match = iconRegex.exec(content)) !== null) {
              const className = match[1];
              
              // Check if it's an icon (has w-* h-* classes)
              if (className.includes('w-') && className.includes('h-')) {
                const sizeClasses = className.match(/w-\d+\s+h-\d+/);
                if (sizeClasses) {
                  const validSizes = ['w-3 h-3', 'w-4 h-4', 'w-5 h-5', 'w-6 h-6', 'w-8 h-8'];
                  expect(validSizes).toContain(sizeClasses[0]);
                }
              }
            }
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property Test 5: Interactive Element States**
```typescript
describe('Property: Interactive Element States', () => {
  it('all interactive elements have hover, active, focus, and disabled states', () => {
    // Feature: professional-ui-redesign, Property 10: For any interactive element, the element should have state classes defined
    
    const { container } = render(<App />);
    const interactiveElements = container.querySelectorAll('button, a, input, select, textarea');
    
    interactiveElements.forEach(element => {
      const className = element.className;
      
      // Check for state classes
      const hasHover = className.includes('hover:');
      const hasFocus = className.includes('focus:') || className.includes('focus-visible:');
      
      // Buttons should have active states
      if (element.tagName === 'BUTTON') {
        const hasActive = className.includes('active:');
        expect(hasActive).toBe(true);
      }
      
      expect(hasHover || hasFocus).toBe(true);
    });
  });
});
```

**Property Test 6: Responsive Breakpoints**
```typescript
describe('Property: Responsive Breakpoints', () => {
  it('all responsive classes use standard Tailwind breakpoints', () => {
    // Feature: professional-ui-redesign, Property 14: For any responsive class, the breakpoint prefix should be standard
    
    const componentFiles = glob.sync('client/src/**/*.{tsx,jsx}');
    const validBreakpoints = ['sm:', 'md:', 'lg:', 'xl:', '2xl:'];
    
    componentFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Find all responsive classes
      const responsiveRegex = /(\w+):/g;
      let match;
      
      while ((match = responsiveRegex.exec(content)) !== null) {
        const prefix = match[1] + ':';
        
        // Check if it's a breakpoint (not a pseudo-class like hover:)
        const pseudoClasses = ['hover', 'focus', 'active', 'disabled', 'group-hover', 'peer-focus'];
        if (!pseudoClasses.includes(match[1])) {
          // If it looks like a breakpoint, it should be valid
          if (match[1].length <= 3) {
            expect(validBreakpoints).toContain(prefix);
          }
        }
      }
    });
  });
});
```

**Property Test 7: WCAG Contrast Ratios**
```typescript
describe('Property: WCAG Contrast Ratios', () => {
  it('all text-background combinations meet WCAG AA standards', () => {
    // Feature: professional-ui-redesign, Property 16: For any text-background color combination, the contrast ratio should meet WCAG AA
    
    fc.assert(
      fc.property(
        fc.record({
          textColor: fc.constantFrom('foreground', 'muted-foreground', 'primary-foreground', 'success-foreground'),
          bgColor: fc.constantFrom('background', 'muted', 'primary', 'success'),
        }),
        ({ textColor, bgColor }) => {
          const textHsl = getComputedColor(`--${textColor}`);
          const bgHsl = getComputedColor(`--${bgColor}`);
          
          const ratio = calculateContrastRatio(textHsl, bgHsl);
          
          // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
          // We'll use 4.5:1 as the minimum for all text
          expect(ratio).toBeGreaterThanOrEqual(4.5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Utilities

**Contrast Ratio Calculator**
```typescript
function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hsl: string): number {
  // Convert HSL to RGB
  const [h, s, l] = hsl.match(/\d+/g)!.map(Number);
  const rgb = hslToRgb(h, s / 100, l / 100);
  
  // Calculate relative luminance
  const [r, g, b] = rgb.map(channel => {
    channel = channel / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
```

**CSS Custom Property Reader**
```typescript
function getComputedColor(propertyName: string): string {
  const root = document.documentElement;
  return getComputedStyle(root).getPropertyValue(propertyName).trim();
}
```

### Test Coverage Goals

- **Unit Tests**: 90% code coverage for UI components
- **Property Tests**: 100% coverage of design system properties
- **Visual Regression**: Snapshot tests for all component variants
- **Accessibility**: 100% WCAG AA compliance

### Continuous Integration

All tests run on every pull request:
1. Unit tests (Jest + React Testing Library)
2. Property tests (fast-check)
3. Visual regression tests (Chromatic or Percy)
4. Accessibility tests (axe-core)
5. Build-time validation (ESLint + TypeScript)

## Implementation Phases

### Phase 1: Design Token Foundation (Week 1)

**Tasks**:
1. Update `client/src/index.css` with new CSS custom properties
2. Update `tailwind.config.ts` to map design tokens
3. Add Inter font to project
4. Create design system documentation

**Deliverables**:
- Updated CSS with all design tokens
- Tailwind config with extended theme
- Font files and CSS imports
- Design system markdown documentation

### Phase 2: UI Primitives Update (Week 1-2)

**Tasks**:
1. Update Button component with new variants
2. Update Card component with new styling
3. Update Input component with focus states
4. Update Badge component with semantic colors
5. Update all other UI primitives

**Deliverables**:
- Updated component files in `client/src/components/ui/`
- Component snapshot tests
- Storybook stories for all variants

### Phase 3: Landing Page Redesign (Week 2)

**Tasks**:
1. Remove all inline styles from Landing.tsx
2. Update hero section with new design
3. Update before/after demo section
4. Update features grid
5. Update pricing cards
6. Update footer

**Deliverables**:
- Updated Landing.tsx with zero inline styles
- Visual regression tests
- Mobile responsive tests

### Phase 4: App Page Redesign (Week 3)

**Tasks**:
1. Remove all inline styles from Home.tsx
2. Update navigation bar
3. Update form section
4. Update status indicators
5. Update user menu

**Deliverables**:
- Updated Home.tsx with zero inline styles
- Component integration tests
- Accessibility tests

### Phase 5: Result Section Redesign (Week 3-4)

**Tasks**:
1. Remove all inline styles from ResultSection.tsx
2. Update text cards
3. Update expert feedback panel
4. Update status badges
5. Update copy buttons

**Deliverables**:
- Updated ResultSection.tsx with zero inline styles
- Property tests for consistency
- Visual regression tests

### Phase 6: Form Component Redesign (Week 4)

**Tasks**:
1. Remove all inline styles from PromptFormProfessional.tsx
2. Update input fields
3. Update chip selectors
4. Update field groups
5. Update validation states

**Deliverables**:
- Updated PromptFormProfessional.tsx with zero inline styles
- Form interaction tests
- Accessibility tests

### Phase 7: Testing & Quality Assurance (Week 5)

**Tasks**:
1. Write all property-based tests
2. Run visual regression tests
3. Perform accessibility audit
4. Test on multiple devices
5. Fix any issues found

**Deliverables**:
- Complete test suite
- Accessibility compliance report
- Cross-browser test results
- Bug fixes

### Phase 8: Documentation & Handoff (Week 5)

**Tasks**:
1. Complete design system documentation
2. Create migration guide
3. Document component usage
4. Create before/after comparison
5. Train team on new system

**Deliverables**:
- Design system documentation
- Migration guide
- Component usage examples
- Training materials

## Success Metrics

### Quantitative Metrics

1. **Zero Inline Styles**: 0 inline style attributes with hard-coded values
2. **Design Token Coverage**: 100% of colors use design tokens
3. **Font Size Compliance**: 0 instances of text-[10px] or text-[11px]
4. **WCAG Compliance**: 100% of text meets AA contrast standards
5. **Test Coverage**: 90% unit test coverage, 100% property test coverage
6. **Build Time**: No increase in build time
7. **Bundle Size**: No significant increase in bundle size

### Qualitative Metrics

1. **User Feedback**: Positive feedback from Swedish brokers on professional appearance
2. **Design Consistency**: Visual audit shows consistent styling across all pages
3. **Developer Experience**: Team reports easier styling with design tokens
4. **Accessibility**: Screen reader testing shows improved experience
5. **Mobile Experience**: Touch testing shows improved usability

### Before/After Comparison

**Before**:
- 500+ inline style declarations
- 50+ unique hex color values
- 100+ instances of text-[10px] and text-[11px]
- Inconsistent spacing and shadows
- Mixed serif/sans-serif typography

**After**:
- 0 inline style declarations with hard-coded values
- All colors through design tokens
- Minimum text-xs (12px) font size
- Consistent spacing scale
- Modern sans-serif typography throughout

## Maintenance Guidelines

### Adding New Components

1. Use existing UI primitives from `components/ui/`
2. Reference design tokens through Tailwind classes
3. Never use inline styles with hard-coded values
4. Include all interactive states (hover, active, focus, disabled)
5. Write snapshot tests for new components
6. Document component usage in Storybook

### Modifying Design Tokens

1. Update CSS custom properties in `index.css`
2. Run contrast checker to verify WCAG compliance
3. Update Tailwind config if needed
4. Run full test suite to catch breaking changes
5. Update design system documentation
6. Create visual regression baseline

### Code Review Checklist

- [ ] No inline style attributes with hard-coded values
- [ ] All colors use design token classes
- [ ] Minimum font size is text-xs (12px)
- [ ] Icons use standard size classes
- [ ] Interactive elements have all state classes
- [ ] Responsive classes use standard breakpoints
- [ ] Component has snapshot test
- [ ] Accessibility attributes present
- [ ] Mobile touch targets meet 44px minimum

## Conclusion

This design transforms OptiPrompt from a visually inconsistent application into a professional, modern SaaS product that Swedish real estate brokers can trust. By establishing a comprehensive design system built on Tailwind CSS design tokens, eliminating all inline styles, and implementing rigorous testing, we ensure visual consistency, maintainability, and accessibility across the entire application.

The phased implementation approach allows for incremental progress with continuous validation, while the property-based testing strategy ensures that design system rules are enforced automatically. The result is a polished, professional UI that matches contemporary SaaS applications and inspires confidence in users.
