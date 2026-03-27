import React from "react";

interface FormGridLayoutProps {
  children: React.ReactNode;
}

/**
 * FormGridLayout - Multi-column responsive grid layout for form sections
 * 
 * Desktop (1400px+): 2-3 columns
 * Tablet (768px-1399px): 2 columns
 * Mobile (<768px): 1 column
 */
export function FormGridLayout({ children }: FormGridLayoutProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max">
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
 */
interface CollapsibleFormSectionProps {
  title: string;
  priority?: "critical" | "important" | "optional";
  children: React.ReactNode;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function CollapsibleFormSection({ 
  title, 
  priority = "optional", 
  children, 
  className = "",
  isCollapsed = false,
  onToggleCollapse
}: CollapsibleFormSectionProps) {
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
    <div className={`border-2 ${borderColor[priority]} ${bgColor[priority]} ${className}`}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between p-3 hover:bg-black/5 transition-colors"
      >
        <h3 className={`text-xs font-bold uppercase tracking-wider ${titleColor[priority]}`}>
          {title}
        </h3>
        <div className="text-slate-600 text-xs font-bold">
          {isCollapsed ? '▼' : '▲'}
        </div>
      </button>
      {!isCollapsed && (
        <div className="border-t-2 border-inherit p-3">
          <div className="space-y-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
