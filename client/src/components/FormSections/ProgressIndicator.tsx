import React from "react";

interface ProgressItem {
  label: string;
  completed: boolean;
  priority: "critical" | "important" | "optional";
}

interface ProgressIndicatorProps {
  items: ProgressItem[];
  onItemClick?: (index: number) => void;
}

/**
 * ProgressIndicator - Mäklaraktig design
 * Light gray background for incomplete, dark green for completed
 * NO colored badges, simple text display
 */
export function ProgressIndicator({ items, onItemClick }: ProgressIndicatorProps) {
  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const percentage = Math.round((completed / total) * 100);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-normal text-gray-600">
          {completed} av {total} fält ifyllda
        </span>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300 bg-primary"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 w-10 text-right">{percentage}%</span>
        </div>
      </div>
    </div>
  );
}
