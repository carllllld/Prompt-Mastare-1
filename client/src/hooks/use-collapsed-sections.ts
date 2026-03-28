import { useState, useCallback, useEffect } from 'react';
import { safeLocalStorageGet, safeLocalStorageSet } from './use-debounced-storage';

const STORAGE_KEY = 'optiprompt-collapsed-sections';

/**
 * Hook for managing collapsed/expanded state of form sections
 * 
 * Features:
 * - Persists state to localStorage
 * - Provides toggle, expandAll, collapseAll functions
 * - Handles localStorage errors gracefully
 * 
 * @param defaultCollapsed - Set of section IDs that should be collapsed by default
 * @returns state and control functions
 */
export function useCollapsedSections(defaultCollapsed: Set<string> = new Set()) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    // Load from localStorage on mount
    const saved = safeLocalStorageGet<string[]>(STORAGE_KEY, []);
    return saved.length > 0 ? new Set(saved) : defaultCollapsed;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    const array = Array.from(collapsedSections);
    safeLocalStorageSet(STORAGE_KEY, array);
  }, [collapsedSections]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedSections(new Set());
  }, []);

  const collapseAll = useCallback((optionalSectionIds: string[]) => {
    // Only collapse optional sections
    setCollapsedSections(new Set(optionalSectionIds));
  }, []);

  const isCollapsed = useCallback((sectionId: string) => {
    return collapsedSections.has(sectionId);
  }, [collapsedSections]);

  return {
    collapsedSections,
    toggleSection,
    expandAll,
    collapseAll,
    isCollapsed,
  };
}
