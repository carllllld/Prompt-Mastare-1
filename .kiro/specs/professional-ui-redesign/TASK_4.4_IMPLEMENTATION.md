# Task 4.4 Implementation: Redesign Pricing Cards

## Summary

Successfully redesigned the pricing cards section in `client/src/pages/Landing.tsx` to use design tokens exclusively, removing all inline styles and implementing the professional UI design system.

## Changes Made

### Pricing Section Header
- **Before**: Used inline styles for colors (`style={{ color: "#1D2939" }}`, `style={{ color: "#6B7280" }}`)
- **After**: Uses design token classes (`text-foreground`, `text-muted-foreground`)

### Pricing Cards Container
- **Before**: Cards had conditional inline border colors (`style={{ borderColor: plan.highlight ? plan.color : "#E8E5DE" }}`)
- **After**: Uses design token classes with conditional logic:
  - Highlighted plan: `border-2 border-primary`
  - Regular plans: `border border-card-border`
- Added `shadow-md` elevation to all cards
- Added `transition-shadow hover:shadow-lg` for interactive feedback

### Card Badge (Populärast)
- **Before**: Inline background color (`style={{ background: plan.color }}`)
- **After**: Uses design tokens (`bg-primary text-primary-foreground`)

### Plan Name
- **Before**: Inline color from plan object (`style={{ color: plan.color }}`)
- **After**: Uses design token (`text-primary`)

### Price Typography
- **Before**: `text-3xl` for price, inline colors
- **After**: `text-4xl font-bold text-foreground` (as specified in requirements)
- Month label: `text-sm text-muted-foreground`

### Plan Description
- **Before**: Inline color (`style={{ color: "#6B7280" }}`)
- **After**: Design token (`text-muted-foreground`)

### Feature List
- **Before**: Inline colors for text and checkmark icons
- **After**: 
  - Text: `text-foreground`
  - Checkmark icons: `text-primary`

### CTA Buttons
- **Before**: Conditional inline styles for highlighted plan (`style={plan.highlight ? { background: plan.color, color: "#fff" } : {}}`)
- **After**: Uses Button component variants (`variant={plan.highlight ? "default" : "outline"}`)
  - Default variant automatically applies primary colors
  - Outline variant uses design system border and hover states

### Footer Text
- **Before**: Inline color (`style={{ color: "#9CA3AF" }}`)
- **After**: Design token (`text-muted-foreground`)

## Design System Compliance

✅ **No inline styles** - All `style={{ ... }}` declarations removed from pricing section
✅ **shadow-md elevation** - Applied to all pricing cards
✅ **border-2 border-primary** - Applied to highlighted plan (Pro)
✅ **text-4xl font-bold** - Applied to price typography
✅ **Design token colors** - All colors use Tailwind classes referencing design tokens
✅ **Button variants** - CTA buttons use proper component variants

## Requirements Validated

- **Requirement 3.8**: Landing page pricing cards use consistent styling ✅
- **Requirement 14.1**: Remove inline styles from Landing.tsx ✅ (pricing section)

## Visual Improvements

1. **Better elevation**: Cards now have consistent `shadow-md` with hover effect
2. **Clearer hierarchy**: Highlighted plan stands out with `border-2 border-primary`
3. **Improved typography**: Price is now `text-4xl` (36px) instead of `text-3xl` (30px)
4. **Consistent colors**: All colors reference design tokens for maintainability
5. **Interactive feedback**: Hover state adds `shadow-lg` for better UX

## Testing Notes

The pricing cards section now:
- Uses only Tailwind utility classes
- References design tokens from `client/src/index.css`
- Maintains visual consistency with the rest of the design system
- Provides clear visual hierarchy between plans
- Has proper interactive states

## Files Modified

- `client/src/pages/Landing.tsx` - Pricing section (lines ~395-460)

## Next Steps

The `color` property in the PLANS array is no longer used in the pricing section and could be removed in a future cleanup task. However, it may still be referenced elsewhere in the file, so it's left intact for now.
