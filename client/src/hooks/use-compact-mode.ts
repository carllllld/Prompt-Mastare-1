import { useState, useCallback, useEffect } from 'react';
import { safeLocalStorageGet, safeLocalStorageSet } from './use-debounced-storage';

const STORAGE_KEY = 'optiprompt-compact-mode';

/**
 * Hook for managing compact mode state
 * 
 * Compact mode reduces:
 * - Spacing by 25%
 * - Font sizes by 1px (minimum 12px)
 * - Input heights by 4px (minimum 32px)
 * 
 * @returns compact mode state and toggle function
 */
export function useCompactMode() {
  const [compactMode, setCompactMode] = useState<boolean>(() => {
    // Load from localStorage on mount
    return safeLocalStorageGet<boolean>(STORAGE_KEY, false);
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY, compactMode);
  }, [compactMode]);

  const toggleCompactMode = useCallback(() => {
    setCompactMode(prev => !prev);
  }, []);

  return {
    compactMode,
    toggleCompactMode,
    setCompactMode,
  };
}
