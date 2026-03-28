import React from 'react';

interface StickyFooterProps {
  onSubmit: () => void;
  isPending: boolean;
  disabled?: boolean;
}

/**
 * StickyFooter - Mäklaraktig design
 * Clean, stor knapp, mörk grön accent
 */
export function StickyFooter({
  onSubmit,
  isPending,
  disabled,
}: StickyFooterProps) {
  return (
    <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <button
          type="submit"
          onClick={onSubmit}
          disabled={isPending || disabled}
          className="w-full md:w-auto md:min-w-[240px] px-8 py-4 text-base font-semibold text-white bg-[#2D5016] hover:bg-[#234010] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Genererar text...' : 'Generera mäklartext'}
        </button>
      </div>
    </div>
  );
}
