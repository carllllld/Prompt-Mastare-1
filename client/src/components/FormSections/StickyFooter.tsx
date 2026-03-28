import React from 'react';

interface StickyFooterProps {
  onSubmit: () => void;
  isPending: boolean;
  disabled?: boolean;
}

/**
 * StickyFooter - Mäklaraktig design
 * Clean, white background, dark green primary button
 */
export function StickyFooter({
  onSubmit,
  isPending,
  disabled,
}: StickyFooterProps) {
  return (
    <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <button
          type="submit"
          onClick={onSubmit}
          disabled={isPending || disabled}
          className="w-full md:w-auto md:min-w-[240px] px-6 py-3 text-base font-normal text-white bg-primary hover:bg-primary-hover disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-lg"
        >
          {isPending ? 'Genererar text...' : 'Generera mäklartext'}
        </button>
      </div>
    </div>
  );
}
