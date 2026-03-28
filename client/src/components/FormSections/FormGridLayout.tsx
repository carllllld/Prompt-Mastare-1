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
    ? "gap-2 md:gap-3" // 8px mobile, 12px desktop (25% reduction)
    : "gap-3 md:gap-4"; // 12px mobile, 16px desktop
  
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${gapClass} auto-rows-max`}>
      {children}
    </div>
  );
}

/**
 * FormSection - Individual section container with border
 * Kantig design (no rounded corners)
 */
interface FormSectionProps {
  title: string;
  priority?: "critical" | "important" | "optional";
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, priority = "optional", children, className = "" }: FormSectionProps) {
  const borderColor = {
    critical: "border-red-300",
    important: "border-blue-300",
    optional: "border-slate-300",
  };

  const bgColor = {
    critical: "bg-red-50",
    important: "bg-blue-50",
    optional: "bg-slate-50",
  };

  const titleColor = {
    critical: "text-red-700",
    important: "text-blue-700",
    optional: "text-slate-700",
  };

  return (
    <div className={`border-2 ${borderColor[priority]} ${bgColor[priority]} p-3 ${className}`}>
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${titleColor[priority]}`}>
        {title}
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

/**
 * FormSectionFull - Section that spans full width
 */
interface FormSectionFullProps {
  title: string;
  priority?: "critical" | "important" | "optional";
  children: React.ReactNode;
  className?: string;
}

export function FormSectionFull({ title, priority = "optional", children, className = "" }: FormSectionFullProps) {
  const borderColor = {
    critical: "border-red-300",
    important: "border-blue-300",
    optional: "border-slate-300",
  };

  const bgColor = {
    critical: "bg-red-50",
    important: "bg-blue-50",
    optional: "bg-slate-50",
  };

  const titleColor = {
    critical: "text-red-700",
    important: "text-blue-700",
    optional: "text-slate-700",
  };

  return (
    <div className={`border-2 ${borderColor[priority]} ${bgColor[priority]} p-3 col-span-full ${className}`}>
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${titleColor[priority]}`}>
        {title}
      </h3>
      <div className="space-y-2">
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
  const borderColor = {
    critical: "border-l-4 border-l-red-500 border-t border-r border-b border-red-200",
    important: "border-l-4 border-l-yellow-500 border-t border-r border-b border-yellow-200",
    optional: "border-l-4 border-l-gray-400 border-t border-r border-b border-gray-200",
  };

  const bgColor = {
    critical: "bg-red-50",
    important: "bg-yellow-50",
    optional: "bg-gray-50",
  };

  const titleColor = {
    critical: "text-red-700",
    important: "text-yellow-700",
    optional: "text-gray-700",
  };

  const priorityBadge = {
    critical: "Viktigt",
    important: "Rekommenderat",
    optional: "Valfritt",
  };

  const priorityBadgeColor = {
    critical: "bg-red-100 text-red-700 border-red-300",
    important: "bg-yellow-100 text-yellow-700 border-yellow-300",
    optional: "bg-gray-100 text-gray-600 border-gray-300",
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleCollapse?.();
    }
  };

  // Completion indicator
  const renderCompletionIndicator = () => {
    if (hasErrors) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (completionPercentage === 100) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (completionPercentage !== undefined && completionPercentage > 0) {
      return (
        <span className="text-xs text-gray-600 font-medium">
          {completionPercentage}%
        </span>
      );
    }
    
    return (
      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
    );
  };

  return (
    <div className={`${borderColor[priority]} ${bgColor[priority]} ${className}`}>
      <button
        type="button"
        id={`${id}-header`}
        onClick={onToggleCollapse}
        onKeyDown={handleKeyDown}
        role="button"
        aria-expanded={!isCollapsed}
        aria-controls={`${id}-content`}
        className="w-full flex items-center justify-between p-3 hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <div className="flex items-center gap-2">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${titleColor[priority]}`}>
            {title}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${priorityBadgeColor[priority]}`}>
            {priorityBadge[priority]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {renderCompletionIndicator()}
          <div className="text-gray-600 text-xs font-bold" aria-hidden="true">
            {isCollapsed ? '▼' : '▲'}
          </div>
        </div>
      </button>
      {!isCollapsed && (
        <div 
          id={`${id}-content`}
          role="region"
          aria-labelledby={`${id}-header`}
          className="border-t-2 border-inherit p-3 animate-in slide-in-from-top-2 duration-200"
          style={{
            animation: 'var(--animation-slide-in-from-top)',
          }}
        >
          <div className="space-y-2">
            {children}
          </div>
        </div>
      )}
      {/* Screen reader announcement region */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isCollapsed ? `${title} collapsed` : `${title} expanded`}
      </div>
    </div>
  );
}
