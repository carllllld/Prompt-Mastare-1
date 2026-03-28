import { useRef, useEffect } from 'react';

/**
 * Hook for debounced localStorage writes
 * Batches rapid state changes to minimize localStorage operations
 * 
 * @param key - localStorage key
 * @param value - value to store
 * @param delay - debounce delay in milliseconds (default: 500ms)
 */
export function useDebouncedLocalStorage<T>(
  key: string,
  value: T,
  delay: number = 500
): void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(`Failed to save ${key} to localStorage:`, error);
        // Graceful degradation: state persists only for current session
      }
    }, delay);
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, delay]);
}

/**
 * Safe localStorage getter with error handling
 * 
 * @param key - localStorage key
 * @param defaultValue - fallback value if read fails
 * @returns parsed value or default
 */
export function safeLocalStorageGet<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const parsed = JSON.parse(item);
    return parsed as T;
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Safe localStorage setter with error handling
 * 
 * @param key - localStorage key
 * @param value - value to store
 * @returns true if successful, false otherwise
 */
export function safeLocalStorageSet<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
    return false;
  }
}
