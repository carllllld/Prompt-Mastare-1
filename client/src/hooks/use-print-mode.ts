import { useEffect } from 'react';

/**
 * Hook for handling print mode
 * 
 * Features:
 * - Expands all sections before print
 * - Restores previous state after print
 * - Handles print cancellation
 * 
 * @param collapsedSections - current collapsed sections state
 * @param setCollapsedSections - function to update collapsed sections
 */
export function usePrintMode(
  collapsedSections: Set<string>,
  setCollapsedSections: (sections: Set<string>) => void
): void {
  useEffect(() => {
    let savedState: Set<string> | null = null;
    
    const handleBeforePrint = () => {
      // Save current state
      savedState = new Set(collapsedSections);
      
      // Expand all sections for print
      setCollapsedSections(new Set());
    };
    
    const handleAfterPrint = () => {
      // Restore previous state
      if (savedState) {
        setCollapsedSections(savedState);
        savedState = null;
      }
    };
    
    // Listen to print events
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    
    // Also listen to media query changes (for browsers that support it)
    const printMediaQuery = window.matchMedia('print');
    const handlePrintMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        handleBeforePrint();
      } else {
        handleAfterPrint();
      }
    };
    
    if (printMediaQuery.addEventListener) {
      printMediaQuery.addEventListener('change', handlePrintMediaChange);
    }
    
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      
      if (printMediaQuery.removeEventListener) {
        printMediaQuery.removeEventListener('change', handlePrintMediaChange);
      }
    };
  }, [collapsedSections, setCollapsedSections]);
}
