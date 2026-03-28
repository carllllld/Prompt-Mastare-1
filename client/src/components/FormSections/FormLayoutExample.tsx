/**
 * FormLayoutExample - Complete example of form layout compression integration
 * 
 * This file demonstrates how to integrate all the layout compression components
 * into an existing form. Use this as a reference for integrating into
 * PromptFormProfessionalV2.tsx
 */

import React, { useState, useCallback } from 'react';
import { FormGridLayout, FormSection, CollapsibleFormSection } from './FormGridLayout';
import { StickyHeader } from './StickyHeader';
import { StickyFooter } from './StickyFooter';
import { CompactWidgetsPanel, CompactUsageWidget, CompactHistoryWidget, CompactUpgradeWidget } from '../CompactWidgets';
import { useCollapsedSections } from '@/hooks/use-collapsed-sections';
import { useCompactMode } from '@/hooks/use-compact-mode';
import { usePrintMode } from '@/hooks/use-print-mode';
import { scrollToField } from '@/lib/scroll-to-section';

// Section configuration
interface SectionConfig {
  id: string;
  title: string;
  priority: 'critical' | 'important' | 'optional';
  defaultCollapsed: boolean;
  fields: string[]; // Field names for completion tracking
}

const SECTION_CONFIGS: SectionConfig[] = [
  {
    id: 'essential-fields',
    title: 'Grundläggande uppgifter',
    priority: 'critical',
    defaultCollapsed: false,
    fields: ['address', 'area', 'livingArea', 'totalRooms', 'bedrooms', 'bathrooms'],
  },
  {
    id: 'images',
    title: 'Objektbilder',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['uploadedImages'],
  },
  {
    id: 'selling-points',
    title: 'Försäljningsargument',
    priority: 'critical',
    defaultCollapsed: false,
    fields: ['uniqueSellingPoints', 'uspChips'],
  },
  {
    id: 'kitchen-bathroom',
    title: 'Kök & Badrum',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['kitchenDescription', 'bathroomDescription', 'kitchenChips', 'bathroomChips'],
  },
  {
    id: 'location-transport',
    title: 'Läge & Transport',
    priority: 'important',
    defaultCollapsed: false,
    fields: ['neighborhood', 'transport', 'view'],
  },
  {
    id: 'material-tech',
    title: 'Material & Teknik',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['flooring', 'heating', 'konstruktionMaterial', 'taktyp'],
  },
  {
    id: 'layout-details',
    title: 'Planlösning & Detaljer',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['layoutDescription', 'gardenDescription'],
  },
  {
    id: 'special-features',
    title: 'Specialfunktioner',
    priority: 'optional',
    defaultCollapsed: true,
    fields: ['specialFeatures', 'specialChips'],
  },
];

export function FormLayoutExample() {
  // State management hooks
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
    // This would update the collapsed sections state
    // In actual implementation, wire this to your state setter
  });
  
  // Form state (example)
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isPending, setIsPending] = useState(false);
  
  // Calculate completion for priority items
  const priorityItems = SECTION_CONFIGS.map(config => {
    const filledFields = config.fields.filter(field => {
      const value = formValues[field];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== undefined && value !== null;
    });
    
    return {
      label: config.title,
      completed: filledFields.length === config.fields.length,
      fieldName: config.fields[0], // First field for scroll-to
      priority: config.priority,
    };
  });
  
  // Calculate section completion percentage
  const getSectionCompletion = (config: SectionConfig) => {
    const filledFields = config.fields.filter(field => {
      const value = formValues[field];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== undefined && value !== null;
    });
    
    return Math.round((filledFields.length / config.fields.length) * 100);
  };
  
  // Handlers
  const handleExpandAll = useCallback(() => {
    expandAll();
  }, [expandAll]);
  
  const handleCollapseAll = useCallback(() => {
    const optionalIds = SECTION_CONFIGS
      .filter(s => s.priority === 'optional')
      .map(s => s.id);
    collapseAll(optionalIds);
  }, [collapseAll]);
  
  const handleItemClick = useCallback((fieldName: string) => {
    scrollToField(fieldName);
  }, []);
  
  const handleSubmit = useCallback(() => {
    setIsPending(true);
    // Submit logic here
    setTimeout(() => setIsPending(false), 2000);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Sticky Header */}
      <StickyHeader
        priorityItems={priorityItems}
        compactMode={compactMode}
        onCompactModeToggle={toggleCompactMode}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onItemClick={handleItemClick}
      />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-3">
          {/* Widgets Panel */}
          <CompactWidgetsPanel>
            <CompactUsageWidget
              remaining={5}
              limit={10}
              used={5}
              plan="pro"
              resetTime={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}
            />
            <CompactHistoryWidget historyCount={12} />
            <CompactUpgradeWidget
              plan="pro"
              onUpgrade={() => console.log('Upgrade clicked')}
              isLoading={false}
            />
          </CompactWidgetsPanel>
          
          {/* Form Grid */}
          <div className="mt-4">
            <FormGridLayout compactMode={compactMode}>
              {SECTION_CONFIGS.map((config) => {
                const completion = getSectionCompletion(config);
                
                if (config.priority === 'optional') {
                  return (
                    <CollapsibleFormSection
                      key={config.id}
                      id={config.id}
                      title={config.title}
                      priority={config.priority}
                      isCollapsed={isCollapsed(config.id)}
                      onToggleCollapse={() => toggleSection(config.id)}
                      completionPercentage={completion}
                      hasErrors={false}
                    >
                      {/* Section content goes here */}
                      <div className="p-4 text-sm text-gray-600">
                        {config.title} content
                      </div>
                    </CollapsibleFormSection>
                  );
                }
                
                return (
                  <FormSection
                    key={config.id}
                    title={config.title}
                    priority={config.priority}
                  >
                    {/* Section content goes here */}
                    <div className="p-4 text-sm text-gray-600">
                      {config.title} content
                    </div>
                  </FormSection>
                );
              })}
            </FormGridLayout>
          </div>
        </div>
      </div>
      
      {/* Sticky Footer */}
      <StickyFooter
        onSubmit={handleSubmit}
        isPending={isPending}
        disabled={false}
      />
    </div>
  );
}

/**
 * Integration Steps for PromptFormProfessionalV2:
 * 
 * 1. Import hooks:
 *    import { useCollapsedSections } from '@/hooks/use-collapsed-sections';
 *    import { useCompactMode } from '@/hooks/use-compact-mode';
 *    import { usePrintMode } from '@/hooks/use-print-mode';
 * 
 * 2. Import components:
 *    import { StickyHeader } from '@/components/FormSections/StickyHeader';
 *    import { StickyFooter } from '@/components/FormSections/StickyFooter';
 *    import { CompactWidgetsPanel } from '@/components/CompactWidgets';
 * 
 * 3. Initialize hooks in component:
 *    const { collapsedSections, toggleSection, expandAll, collapseAll, isCollapsed } = 
 *      useCollapsedSections(defaultCollapsed);
 *    const { compactMode, toggleCompactMode } = useCompactMode();
 *    usePrintMode(collapsedSections, setCollapsedSections);
 * 
 * 4. Define SECTION_CONFIGS array with your sections
 * 
 * 5. Wrap form in structure:
 *    <div className="min-h-screen flex flex-col bg-slate-50">
 *      <StickyHeader ... />
 *      <div className="flex-1 overflow-auto">
 *        <div className="max-w-7xl mx-auto p-3">
 *          <CompactWidgetsPanel>...</CompactWidgetsPanel>
 *          <FormGridLayout compactMode={compactMode}>
 *            {sections}
 *          </FormGridLayout>
 *        </div>
 *      </div>
 *      <StickyFooter ... />
 *    </div>
 * 
 * 6. Convert optional sections to CollapsibleFormSection:
 *    <CollapsibleFormSection
 *      id="material-tech"
 *      title="Material & Teknik"
 *      priority="optional"
 *      isCollapsed={isCollapsed('material-tech')}
 *      onToggleCollapse={() => toggleSection('material-tech')}
 *      completionPercentage={calculateCompletion('material-tech')}
 *    >
 *      {content}
 *    </CollapsibleFormSection>
 */
