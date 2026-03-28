import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';

interface StickyFooterProps {
  onSubmit: () => void;
  isPending: boolean;
  disabled: boolean;
}

/**
 * StickyFooter - Fixed footer with submit button
 * 
 * Features:
 * - Sticky positioning (bottom: 0, z-index: 50)
 * - Full-width submit button on mobile
 * - Auto-width on desktop
 * - Loading state
 * - Disabled state
 */
export function StickyFooter({
  onSubmit,
  isPending,
  disabled,
}: StickyFooterProps) {
  return (
    <div className="sticky bottom-0 z-50 bg-white border-t-2 border-slate-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 py-3">
        <Button
          type="submit"
          onClick={onSubmit}
          disabled={isPending || disabled}
          size="lg"
          className="w-full md:w-auto md:min-w-[200px] h-12 text-base font-semibold"
          style={{ background: '#2D6A4F' }}
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Genererar text...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generera mäklartext
            </>
          )}
        </Button>
        
        {/* Keyboard shortcut hint */}
        <p className="text-xs text-muted-foreground mt-2 text-center md:text-left">
          Tryck <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Cmd</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Enter</kbd> för att generera
        </p>
      </div>
    </div>
  );
}
