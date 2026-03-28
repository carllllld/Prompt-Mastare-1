import React from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Compress } from 'lucide-react';
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
 * StickyHeader - Fixed header with progress indicator and controls
 * 
 * Features:
 * - Sticky positioning (top: 0, z-index: 50)
 * - Progress indicator with priority items
 * - Compact mode toggle
 * - Expand/collapse all buttons
 * - Responsive layout
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
    <div className="sticky top-0 z-50 bg-white border-b-2 border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 py-2">
        {/* Progress Indicator */}
        <div className="mb-2">
          <ProgressIndicator 
            items={priorityItems} 
            onItemClick={onItemClick}
          />
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Compact Mode Toggle */}
          <Button
            type="button"
            variant={compactMode ? "default" : "outline"}
            size="sm"
            onClick={onCompactModeToggle}
            className="h-8 text-xs"
            title="Kompakt vy - minskar avstånd och textstorlekar"
          >
            <Compress className="w-3.5 h-3.5 mr-1.5" />
            Kompakt vy
          </Button>
          
          {/* Expand All */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExpandAll}
            className="h-8 text-xs"
            title="Expandera alla sektioner"
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
            Expandera alla
          </Button>
          
          {/* Collapse All */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCollapseAll}
            className="h-8 text-xs"
            title="Minimera valfria sektioner"
          >
            <Minimize2 className="w-3.5 h-3.5 mr-1.5" />
            Minimera alla
          </Button>
          
          {/* Completion Status */}
          <div className="ml-auto text-xs text-muted-foreground">
            {priorityItems.filter(item => item.completed).length} / {priorityItems.length} fält kompletta
          </div>
        </div>
      </div>
    </div>
  );
}
