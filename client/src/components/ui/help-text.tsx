import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface HelpTextProps {
  children: React.ReactNode;
  className?: string;
}

export function HelpText({ children, className = "" }: HelpTextProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors ${className}`}
          >
            <Info className="w-3 h-3 text-gray-600" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-xs">{children}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface InlineHelpProps {
  title: string;
  children: React.ReactNode;
  variant?: 'info' | 'tip' | 'warning';
}

export function InlineHelp({ title, children, variant = 'info' }: InlineHelpProps) {
  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    tip: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
  };

  const icons = {
    info: '💡',
    tip: '✨',
    warning: '⚠️',
  };

  return (
    <div className={`border rounded-lg p-3 ${colors[variant]}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm flex-shrink-0">{icons[variant]}</span>
        <div className="flex-1">
          <p className="text-xs font-semibold mb-1">{title}</p>
          <div className="text-xs opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}
