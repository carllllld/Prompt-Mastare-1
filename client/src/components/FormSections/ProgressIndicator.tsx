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

export function ProgressIndicator({ items, onItemClick }: ProgressIndicatorProps) {
  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const percentage = Math.round((completed / total) * 100);

  const criticalItems = items.filter((i) => i.priority === "critical");
  const criticalCompleted = criticalItems.filter((i) => i.completed).length;
  const criticalMissing = criticalItems.length - criticalCompleted;

  return (
    <div className="bg-white border-b px-4 py-3" style={{ borderColor: "#E8E5DE" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: "#4B5563" }}>
            {completed} av {total} fält ifyllda
          </span>
          {criticalMissing > 0 && (
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: "#FEF3C7", color: "#92400E" }}>
              {criticalMissing} viktiga fält kvar
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{ 
                width: `${percentage}%`,
                background: "#2D6A4F"
              }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 w-10 text-right">{percentage}%</span>
        </div>
      </div>
    </div>
  );
}
