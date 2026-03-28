import React from 'react';
import { ProgressIndicator } from './ProgressIndicator';

interface PriorityItem {
  label: string;
  completed: boolean;
  fieldName: string;
  priority: 'critical' | 'important' | 'optional';
}

interface StickyHeaderProps {
  priorityItems: PriorityItem[];
  compactMode: boolean;
  onCompactModeToggle: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onItemClick: (fieldName: string) => void;
}

/**
 * StickyHeader - Mäklaraktig design
 * Clean, vit, subtila knappar, ingen färg
 */
export function StickyHeader({
  priorityItems,
  compactMode,
  onCompactModeToggle,
  onExpandAll,
  onCollapseAll,
  onItemClick,
}: StickyHeaderProps) {
  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Progress Indicator */}
        <div className="mb-3">
          <ProgressIndicator 
            items={priorityItems} 
            onItemClick={onItemClick}
          />
        </div>
        
        {/* Control Buttons - minimalistiska */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExpandAll}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Expandera alla
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Minimera
            </button>
          </div>
          
          {/* Completion Status - subtil */}
          <div className="text-sm text-gray-500">
            {priorityItems.filter(item => item.completed).length} / {priorityItems.length} fält
          </div>
        </div>
      </div>
    </div>
  );
}
