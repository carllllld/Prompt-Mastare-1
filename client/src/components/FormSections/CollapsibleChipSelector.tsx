import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CollapsibleChipSelectorProps {
  chips: string[];
  selected: string[];
  onToggle: (chip: string) => void;
  tooltips?: Record<string, string>;
  id?: string;
  maxInitialChips?: number;
}

export function CollapsibleChipSelector({
  chips,
  selected,
  onToggle,
  tooltips,
  id,
  maxInitialChips = 4,
}: CollapsibleChipSelectorProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleChips = showAll ? chips : chips.slice(0, maxInitialChips);
  const hiddenCount = chips.length - maxInitialChips;
  const selectedCount = selected.length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visibleChips.map((chip) => {
          const isSelected = selected.includes(chip);
          const tooltip = tooltips?.[chip];

          const chipButton = (
            <button
              key={chip}
              type="button"
              onClick={() => onToggle(chip)}
              className={`px-3 py-2 text-xs rounded-lg border transition-all font-medium ${
                isSelected
                  ? "border-transparent text-white"
                  : "bg-white border-input hover:border-primary hover:bg-accent"
              }`}
              style={isSelected ? { background: "#2D6A4F" } : {}}
            >
              {isSelected && "✓ "}
              {chip}
            </button>
          );

          if (tooltip) {
            return (
              <Tooltip key={chip}>
                <TooltipTrigger asChild>{chipButton}</TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
              </Tooltip>
            );
          }

          return chipButton;
        })}
      </div>

      {/* Show more button */}
      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs font-medium flex items-center gap-1 mt-2 transition-colors"
          style={{ color: "#2D6A4F" }}
        >
          + Visa {hiddenCount} fler
          <ChevronDown className="w-3 h-3" />
        </button>
      )}

      {/* Show less button */}
      {showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-xs font-medium flex items-center gap-1 mt-2 transition-colors"
          style={{ color: "#2D6A4F" }}
        >
          − Visa färre
          <ChevronDown className="w-3 h-3 rotate-180" />
        </button>
      )}

      {/* Selected count indicator */}
      {selectedCount > 0 && (
        <div className="text-xs mt-2" style={{ color: "#6B7280" }}>
          {selectedCount} vald{selectedCount !== 1 ? "a" : ""}
        </div>
      )}
    </div>
  );
}
