# PromptForge Design Guidelines

## Design Approach
**Reference-Based**: Drawing from Linear (clean typography, minimal interface), Stripe (professional restraint), and Notion (content-focused layouts). This creates a modern SaaS aesthetic that balances sophistication with usability.

## Core Design Elements

### Typography
- **Primary Font**: Inter (via Google Fonts)
- **Mono Font**: JetBrains Mono (for prompt display)
- **Scale**: 
  - Headings: text-5xl/6xl (hero), text-3xl/4xl (section), text-2xl (cards)
  - Body: text-base/lg (primary), text-sm (secondary)
  - Mono: text-sm/base (prompts, code)
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold for emphasis)

### Layout System
**Spacing Primitives**: Tailwind units 2, 4, 6, 8, 12, 16, 20, 24
- Component gaps: gap-4 to gap-6
- Section padding: py-16 to py-24 (desktop), py-12 to py-16 (mobile)
- Container: max-w-7xl for wide sections, max-w-4xl for content-focused areas
- Card padding: p-6 to p-8

### Component Library

**Navigation**
- Sticky header with logo left, navigation center, "Login" + "Start Free" CTA right
- Mobile: Hamburger menu expanding to full-screen overlay
- Signed-in state: Replace CTAs with user avatar/menu dropdown

**Hero Section** (Landing Page)
- Full-width image background showing abstract AI/technology visualization (neural networks, flowing data patterns)
- Two-column layout overlay: Left 60% contains headline + subheadline + dual CTAs ("Try Free" primary, "View Pricing" secondary with blurred backdrop)
- Right 40%: Floating card showing "before/after" prompt optimization preview
- Height: min-h-[600px] to min-h-[700px]

**Authentication Pages**
- Centered card (max-w-md) with generous padding (p-8 to p-12)
- Logo above, headline, form fields with floating labels
- Social login options (Google, GitHub) above divider
- Toggle between Login/Signup, "Forgot Password" link
- Minimal background with subtle gradient overlay

**Main Editor/Dashboard**
- Two-panel layout: Left panel (40%) for input prompt, right panel (60%) for optimized output
- Sticky toolbar above panels: "Optimize" button, token counter, clear/copy actions
- Textarea styling: Monospace font, line numbers optional, syntax highlighting for XML tags
- Loading state: Skeleton placeholder with pulse animation in output panel

**Pricing Page**
- Three-tier cards in grid (grid-cols-1 md:grid-cols-3)
- Free tier leftmost, Pro tier center (elevated/highlighted with border accent), Enterprise right
- Each card: Plan name, price (large text-4xl), feature list with checkmarks, CTA button
- Comparison table below cards showing detailed feature matrix
- FAQ accordion section at bottom

**History/Library** (Pro Users)
- Sidebar navigation left (w-64) with search, filters, folders
- Main content area: Card grid of saved prompts (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Each card: Prompt snippet preview, optimization type badge, timestamp, actions menu
- Empty state: Illustration + "Start optimizing prompts" CTA

**Footer**
- Four-column grid: Product links, Resources, Company, Legal
- Newsletter signup form (email + submit) in separate row above
- Social icons, copyright text at bottom

### Form Elements
- Input fields: Consistent height (h-12), rounded corners (rounded-lg), focus ring accent
- Buttons: Primary (solid), Secondary (outlined), Ghost (text-only)
- Button sizes: h-10 (small), h-12 (default), h-14 (large/CTA)
- Checkbox/radio: Custom styled with accent color
- Select dropdowns: Chevron icon, matching input styling

### Cards & Containers
- Base card: Rounded (rounded-xl), border (border), padding (p-6)
- Hover state: Subtle lift (shadow-md → shadow-lg transition)
- Nested cards: Slightly smaller border radius (rounded-lg)

### Feedback Elements
- Toast notifications: Fixed bottom-right, slide-in animation, auto-dismiss
- Loading spinners: Centered in containers, size-6 for small, size-8 for large
- Empty states: Centered icon + heading + description + CTA
- Error states: Inline validation below inputs, error icon + message

### Icons
**Library**: Heroicons (via CDN)
- Navigation: outline style, size-6
- Buttons: size-5 inline with text
- Feature highlights: size-8 to size-12
- Empty states: size-16 to size-20

## Images

**Hero Image**: Abstract technology/AI visualization - flowing neural network patterns, glowing nodes, data streams. Should convey intelligence and optimization. Overlay with gradient (dark to transparent) for text legibility. Place as full-width background with `object-cover` positioning.

**Dashboard Accent**: Optional decorative graphics in empty states - minimalist illustrations of prompt transformation (arrow from messy to organized text representation).

## Page-Specific Layouts

**Landing Page Flow**:
1. Hero with image background (as described above)
2. Features section: Four-column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4) with icon + title + description cards
3. Live demo section: Interactive prompt optimizer preview (two-panel as in main app)
4. Pricing teaser: Simplified two-column comparison (Free vs Pro)
5. Social proof: Three-column testimonials with user avatar + quote + attribution
6. Final CTA: Centered with bold headline + dual buttons

**App Dashboard**: Full-height layout (min-h-screen) with sticky header, main editor panels (described above), sidebar toggle for history access

**Pricing Page**: Hero headline section → Pricing cards → Detailed comparison table → FAQ accordion → CTA section

This creates a cohesive, professional SaaS experience optimized for conversion and usability.