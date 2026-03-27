import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

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

  return (
    <div className="pro-section-card mb-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Framsteg
          </span>
          <span className="text-xs font-bold text-primary">{percentage}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onItemClick?.(idx)}
            className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
              item.completed
                ? "bg-green-50 text-green-700 hover:bg-green-100"
                : item.priority === "critical"
                  ? "bg-red-50 text-red-700 hover:bg-red-100"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {item.completed ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="font-medium truncate">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{completed}/{total}</span> fält ifyllda
        {criticalItems.length > 0 && (
          <>
            {" "}
            • <span className="font-semibold text-red-600">{criticalCompleted}/{criticalItems.length}</span> kritiska
          </>
        )}
      </div>
    </div>
  );
}
