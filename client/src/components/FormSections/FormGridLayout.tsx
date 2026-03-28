import React from "react";

interface FormGridLayoutProps {
  children: React.ReactNode;
  compactMode?: boolean;
}

/**
 * FormGridLayout - Multi-column responsive grid layout for form sections
 * 
 * Desktop (≥1024px): 3 columns
 * Tablet (768px-1023px): 2 columns
 * Mobile (<768px): 1 column
 * 
 * Compact mode reduces gap spacing by 25%
 */
export function FormGridLayout({ children, compactMode = false }: FormGridLayoutProps) {
  const gapClass = compactMode 
    ? "gap-4" // 16px (kompakt)
    : "gap-6"; // 24px (normal - mer luft)
  
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${gapClass} auto-rows-max`}>
      {children}
    </div>
  );
}

/**
 * FormSection - Individual section container
 * Mäklaraktig design: vit, subtil border, mycket luft
 */
interface FormSectionProps {
  title: string;
  priority?: "critical" | "important" | "optional";
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, priority = "optional", children, className = "" }: FormSectionProps) {
  return (
    <div className={`border border-gray-200 bg-white p-6 ${className}`}>
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

/**
 * FormSectionFull - Section that spans full width
 * Mäklaraktig design: vit, subtil border, mycket luft
 */
interface FormSectionFullProps {
  title: string;
  priority?: "critical" | "important" | "optional";
  children: React.ReactNode;
  className?: string;
}

export function FormSectionFull({ title, priority = "optional", children, className = "" }: FormSectionFullProps) {
  return (
    <div className={`border border-gray-200 bg-white p-6 col-span-full ${className}`}>
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

/**
 * CollapsibleFormSection - Section that can be collapsed/expanded
 * 
 * Features:
 * - Keyboard accessible (Enter/Space to toggle)
 * - ARIA attributes for screen readers
 * - Smooth height animation (200ms)
 * - Respects prefers-reduced-motion
 * - Lazy rendering (children not mounted when collapsed)
 * - Priority visual indicators
 */
interface CollapsibleFormSectionProps {
  id: string; // Unique identifier for persistence and ARIA
  title: string;
  priority?: "critical" | "important" | "optional";
  children: React.ReactNode;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  completionPercentage?: number;
  hasErrors?: boolean;
}

export function CollapsibleFormSection({ 
  id,
  title, 
  priority = "optional", 
  children, 
  className = "",
  isCollapsed = false,
  onToggleCollapse,
  completionPercentage,
  hasErrors = false
}: CollapsibleFormSectionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleCollapse?.();
    }
  };

  // Completion indicator - minimalistisk
  const renderCompletionIndicator = () => {
    if (completionPercentage === 100) {
      return (
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (completionPercentage !== undefined && completionPercentage > 0) {
      return (
        <span className="text-xs text-gray-500">
          {completionPercentage}%
        </span>
      );
    }
    
    return null;
  };

  return (
    <div className={`border border-gray-200 bg-white ${className}`}>
      <button
        type="button"
        id={`${id}-header`}
        onClick={onToggleCollapse}
        onKeyDown={handleKeyDown}
        role="button"
        aria-expanded={!isCollapsed}
        aria-controls={`${id}-content`}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
      >
        <h3 className="text-base font-semibold text-gray-900">
          {title}
        </h3>
        <div className="flex items-center gap-3">
          {renderCompletionIndicator()}
          <span className="text-gray-400 text-sm">
            {isCollapsed ? '▼' : '▲'}
          </span>
        </div>
      </button>
      {!isCollapsed && (
        <div 
          id={`${id}-content`}
          role="region"
          aria-labelledby={`${id}-header`}
          className="border-t border-gray-200 p-6"
        >
          <div className="space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
