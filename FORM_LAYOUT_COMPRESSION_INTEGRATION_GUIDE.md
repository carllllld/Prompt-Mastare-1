# Form Layout Compression - Integration Guide

## Quick Start

This guide shows you how to integrate the form layout compression feature into PromptFormProfessionalV2.tsx.

## Step 1: Import Required Dependencies

Add these imports to the top of `PromptFormProfessionalV2.tsx`:

```typescript
// Layout compression hooks
import { useCollapsedSections } from '@/hooks/use-collapsed-sections';
import { useCompactMode } from '@/hooks/use-compact-mode';
import { usePrintMode } from '@/hooks/use-print-mode';

// Layout compression components
import { StickyHeader } from '@/components/FormSections/StickyHeader';
import { StickyFooter } from '@/components/FormSections/StickyFooter';
import { CompactWidgetsPanel } from '@/components/CompactWidgets';

// Utilities
import { scrollToField } from '@/lib/scroll-to-section';
import { 
  calculateSectionCompletion, 
  type SectionConfig 
} from '@/lib/section-completion';
```

## Step 2: Define Section Configurations

Add this constant near the top of the component (after interfaces):

```typescript
const SECTION_CONFIGS: SectionConfig[] = [
  {
    id: 'essential-fields',
    title: 'Grundläggande uppgifter',
    priority: 'critical',
    defaultCollapsed: false,
    fields: ['address', 'area', 'livingArea', 'totalRooms', 'bedrooms', 'bathrooms'],
    order: 1,
    mobileOrder: 1,
  },
  {
    id: 'images',
    title: 'Objektbilder',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['uploadedImages'],
    order: 2,
    mobileOrder: 3,
  },
  {
    id: 'selling-points',
    title: 'Försäljningsargument',
    priority: 'critical',
    defaultCollapsed: false,
    fields: ['uniqueSellingPoints', 'uspChips'],
    order: 3,
    mobileOrder: 2,
  },
  {
    id: 'kitchen-bathroom',
    title: 'Kök & Badrum',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['kitchenDescription', 'bathroomDescription', 'kitchenChips', 'bathroomChips'],
    order: 4,
    mobileOrder: 4,
  },
  {
    id: 'location-transport',
    title: 'Läge & Transport',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['neighborhood', 'transport', 'view'],
    order: 5,
    mobileOrder: 5,
  },
  {
    id: 'material-tech',
    title: 'Material & Teknik',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['flooring', 'heating', 'konstruktionMaterial', 'taktyp'],
    order: 6,
    mobileOrder: 7,
  },
  {
    id: 'layout-details',
    title: 'Planlösning & Detaljer',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['layoutDescription', 'gardenDescription'],
    order: 7,
    mobileOrder: 8,
  },
  {
    id: 'special-features',
    title: 'Specialfunktioner',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['specialFeatures', 'specialChips'],
    order: 8,
    mobileOrder: 9,
  },
];
```

## Step 3: Initialize Hooks

Add these hooks inside the component (after existing useState declarations):

```typescript
// Layout compression state
const defaultCollapsed = new Set(
  SECTION_CONFIGS.filter(s => s.defaultCollapsed).map(s => s.id)
);

const {
  collapsedSections,
  toggleSection,
  expandAll,
  collapseAll,
  isCollapsed,
} = useCollapsedSections(defaultCollapsed);

const { compactMode, toggleCompactMode } = useCompactMode();

// Print mode hook
usePrintMode(collapsedSections, (sections) => {
  // Update collapsed sections state for print
  // This is handled automatically by the hook
});
```

## Step 4: Calculate Priority Items

Replace or enhance the existing `priorityItems` calculation:

```typescript
const priorityItems = SECTION_CONFIGS.map(config => {
  const completion = calculateSectionCompletion(
    config,
    form.getValues(),
    form.formState.errors
  );
  
  return {
    label: config.title,
    completed: completion.percentage === 100 && !completion.hasErrors,
    fieldName: config.fields[0], // First field for scroll-to
    priority: config.priority,
  };
});
```

## Step 5: Add Handler Functions

Add these handler functions:

```typescript
const handleExpandAll = useCallback(() => {
  expandAll();
}, [expandAll]);

const handleCollapseAll = useCallback(() => {
  const optionalIds = SECTION_CONFIGS
    .filter(s => s.priority === 'optional')
    .map(s => s.id);
  collapseAll(optionalIds);
}, [collapseAll]);

const handleScrollToField = useCallback((fieldName: string) => {
  scrollToField(fieldName);
}, []);
```

## Step 6: Update JSX Structure

Replace the existing form structure with this:

```typescript
return (
  <TooltipProvider>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onLocalSubmit)} className="min-h-screen flex flex-col bg-slate-50">
        
        {/* STICKY HEADER */}
        <StickyHeader
          priorityItems={priorityItems}
          compactMode={compactMode}
          onCompactModeToggle={toggleCompactMode}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onItemClick={handleScrollToField}
        />

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-3">
            
            {/* WIDGETS PANEL */}
            <CompactWidgetsPanel>
              <CompactUsageWidget
                remaining={remaining}
                limit={limit}
                used={used}
                plan={plan}
                resetTime={resetTime}
              />
              <CompactHistoryWidget historyCount={historyCount} />
              <CompactUpgradeWidget
                plan={plan}
                onUpgrade={handleUpgrade}
                isLoading={upgradeLoading}
              />
            </CompactWidgetsPanel>

            {/* FORM GRID */}
            <div className="mt-4">
              <FormGridLayout compactMode={compactMode}>
                
                {/* Essential Fields - Always visible */}
                <FormSection title="Grundläggande uppgifter" priority="critical">
                  <EssentialFieldsSection
                    form={form}
                    isApartmentType={isApartmentType}
                    isHouseOrTownhouseType={isHouseOrTownhouseType}
                    rooms={rooms}
                    bedrooms={bedrooms}
                    bathrooms={bathrooms}
                    setRooms={setRooms}
                    setBedrooms={setBedrooms}
                    setBathrooms={setBathrooms}
                    addressLookupLoading={addressLookupLoading}
                    addressLookupResult={addressLookupResult}
                    onAddressLookup={handleAddressLookup}
                    importButtons={
                      <>
                        <HemnetImportButton onImport={handleExternalImport} />
                        <VitecImportPicker onImport={handleExternalImport} />
                      </>
                    }
                  />
                </FormSection>

                {/* Images - Always visible */}
                <FormSection title="Objektbilder" priority="important">
                  <ImageSection
                    uploadedImages={uploadedImages}
                    onImagesAdded={processImageFiles}
                    onImageRemoved={(idx) => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                    imageUploadProgress={imageUploadProgress}
                  />
                </FormSection>

                {/* Selling Points - Always visible */}
                <FormSection title="Försäljningsargument" priority="critical">
                  {/* Your existing selling points content */}
                </FormSection>

                {/* Kitchen & Bathroom - Always visible */}
                <FormSection title="Kök & Badrum" priority="important">
                  {/* Your existing kitchen/bathroom content */}
                </FormSection>

                {/* Location & Transport - Always visible */}
                <FormSection title="Läge & Transport" priority="important">
                  {/* Your existing location content */}
                </FormSection>

                {/* Material & Tech - COLLAPSIBLE */}
                <CollapsibleFormSection
                  id="material-tech"
                  title="Material & Teknik"
                  priority="optional"
                  isCollapsed={isCollapsed('material-tech')}
                  onToggleCollapse={() => toggleSection('material-tech')}
                  completionPercentage={
                    calculateSectionCompletion(
                      SECTION_CONFIGS.find(s => s.id === 'material-tech')!,
                      form.getValues(),
                      form.formState.errors
                    ).percentage
                  }
                >
                  {/* Your existing material/tech content */}
                </CollapsibleFormSection>

                {/* Layout & Details - COLLAPSIBLE */}
                <CollapsibleFormSection
                  id="layout-details"
                  title="Planlösning & Detaljer"
                  priority="optional"
                  isCollapsed={isCollapsed('layout-details')}
                  onToggleCollapse={() => toggleSection('layout-details')}
                  completionPercentage={
                    calculateSectionCompletion(
                      SECTION_CONFIGS.find(s => s.id === 'layout-details')!,
                      form.getValues(),
                      form.formState.errors
                    ).percentage
                  }
                >
                  {/* Your existing layout content */}
                </CollapsibleFormSection>

                {/* Special Features - COLLAPSIBLE */}
                <CollapsibleFormSection
                  id="special-features"
                  title="Specialfunktioner"
                  priority="optional"
                  isCollapsed={isCollapsed('special-features')}
                  onToggleCollapse={() => toggleSection('special-features')}
                  completionPercentage={
                    calculateSectionCompletion(
                      SECTION_CONFIGS.find(s => s.id === 'special-features')!,
                      form.getValues(),
                      form.formState.errors
                    ).percentage
                  }
                >
                  {/* Your existing special features content */}
                </CollapsibleFormSection>

              </FormGridLayout>
            </div>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <StickyFooter
          onSubmit={form.handleSubmit(onLocalSubmit)}
          isPending={isPending}
          disabled={disabled}
        />

        {/* DIALOGS (keep existing) */}
        <AlertDialog open={showIncompleteDialog} onOpenChange={setShowIncompleteDialog}>
          {/* Your existing dialog content */}
        </AlertDialog>

      </form>
    </Form>
  </TooltipProvider>
);
```

## Step 7: Remove Old Sticky Header

Remove the old sticky header code that looks like this:

```typescript
// OLD - REMOVE THIS
<div className="sticky top-0 z-50 bg-white border-b-2 border-slate-200 p-3 shadow-sm">
  <div className="max-w-7xl mx-auto">
    <ProgressIndicator items={priorityItems} onItemClick={(idx) => handleScrollToField(priorityItems[idx].fieldName)} />
  </div>
</div>
```

## Step 8: Test the Integration

1. **Check responsive behavior:**
   - Desktop: Should show 3 columns
   - Tablet: Should show 2 columns
   - Mobile: Should show 1 column

2. **Test collapsible sections:**
   - Click section headers to collapse/expand
   - Check that state persists on page reload
   - Verify keyboard navigation (Enter/Space)

3. **Test compact mode:**
   - Toggle compact mode button
   - Verify spacing reduces by 25%
   - Check that preference persists

4. **Test print mode:**
   - Press Ctrl+P (Cmd+P on Mac)
   - Verify all sections expand
   - Cancel print and verify sections restore

5. **Test accessibility:**
   - Navigate with Tab key
   - Use screen reader
   - Check focus indicators

## Common Issues & Solutions

### Issue: Sections not collapsing
**Solution:** Make sure you're passing the correct `isCollapsed` and `onToggleCollapse` props.

### Issue: State not persisting
**Solution:** Check browser console for localStorage errors. May be in private browsing mode.

### Issue: Layout not responsive
**Solution:** Verify Tailwind CSS classes are correct: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Issue: Sticky elements overlapping content
**Solution:** Add padding to main content area: `<div className="flex-1 overflow-auto">`

## Performance Tips

1. **Use React.memo for sections** to prevent unnecessary re-renders
2. **Lazy render collapsed sections** - children not mounted when collapsed
3. **Debounce localStorage writes** - already handled by hooks (500ms)
4. **Use CSS containment** - add `contain: layout style` to sections

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] ARIA attributes present on collapsible sections
- [ ] Screen reader announcements working
- [ ] Focus indicators visible
- [ ] Touch targets ≥44x44px (48x48px on mobile)
- [ ] Color contrast meets WCAG AA
- [ ] Respects prefers-reduced-motion

## Next Steps

After integration:

1. Run `npm run check` to verify TypeScript types
2. Test on multiple browsers (Chrome, Firefox, Safari, Edge)
3. Test on mobile devices
4. Run Lighthouse audit (target ≥90 performance score)
5. Conduct user acceptance testing

## Support

For issues or questions:
- Check `FORM_LAYOUT_COMPRESSION_IMPLEMENTATION_STATUS.md`
- Review `FormLayoutExample.tsx` for complete example
- See design doc: `.kiro/specs/form-layout-compression/design.md`
