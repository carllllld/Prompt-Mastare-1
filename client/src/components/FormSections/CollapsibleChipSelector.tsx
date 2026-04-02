import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChipGroup {
  label: string;
  chips: string[];
  description?: string;
}

interface CollapsibleChipSelectorProps {
  chips?: string[];
  groups?: ChipGroup[];
  selected: string[];
  onToggle: (chip: string) => void;
  tooltips?: Record<string, string>;
  id?: string;
  maxInitialChips?: number;
}

export function CollapsibleChipSelector({
  chips,
  groups,
  selected,
  onToggle,
  tooltips,
  id,
  maxInitialChips = 4,
}: CollapsibleChipSelectorProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // If groups are provided, use grouped rendering
  if (groups && groups.length > 0) {
    const selectedCount = selected.length;
    
    const toggleGroup = (groupLabel: string) => {
      const newExpanded = new Set(expandedGroups);
      if (newExpanded.has(groupLabel)) {
        newExpanded.delete(groupLabel);
      } else {
        newExpanded.add(groupLabel);
      }
      setExpandedGroups(newExpanded);
    };

    const renderChip = (chip: string) => {
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
    };

    return (
      <div className="space-y-3">
        {groups.map((group, idx) => {
          const isFirstGroup = idx === 0;
          const isExpanded = expandedGroups.has(group.label);
          const groupSelectedCount = group.chips.filter(c => selected.includes(c)).length;

          return (
            <div key={group.label} className={`${!isFirstGroup ? 'pt-3 border-t border-gray-200' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      {group.label}
                    </span>
                    {groupSelectedCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        {groupSelectedCount} vald{groupSelectedCount !== 1 ? 'a' : ''}
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
                  )}
                </div>
                {!isFirstGroup && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="text-xs font-medium flex items-center gap-1 transition-colors ml-2"
                    style={{ color: "#2D6A4F" }}
                  >
                    {isExpanded ? '− Dölj' : '+ Visa'}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
              
              {(isFirstGroup || isExpanded) && (
                <div className="flex flex-wrap gap-2">
                  {group.chips.map(renderChip)}
                </div>
              )}
            </div>
          );
        })}

        {/* Selected count indicator */}
        {selectedCount > 0 && (
          <div className="text-xs pt-2 border-t border-gray-200" style={{ color: "#6B7280" }}>
            Totalt {selectedCount} vald{selectedCount !== 1 ? 'a' : ''}
          </div>
        )}
      </div>
    );
  }

  // Original flat rendering (backward compatible)
  const allChips = chips || [];
  const visibleChips = showAll ? allChips : allChips.slice(0, maxInitialChips);
  const hiddenCount = allChips.length - maxInitialChips;
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
