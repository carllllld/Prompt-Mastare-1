import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook for responsive breakpoint detection
 * 
 * Breakpoints:
 * - mobile: < 768px
 * - tablet: 768px - 1023px
 * - desktop: >= 1024px
 * 
 * @returns current breakpoint
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      const width = window.innerWidth;
      const newBreakpoint: Breakpoint = 
        width < 768 ? 'mobile' : 
        width < 1024 ? 'tablet' : 
        'desktop';
      
      if (newBreakpoint !== breakpoint) {
        setBreakpoint(newBreakpoint);
      }
    };
    
    // Debounce resize events to prevent excessive re-renders
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };
    
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [breakpoint]);
  
  return breakpoint;
}

/**
 * Hook to check if viewport matches a specific breakpoint
 * 
 * @param target - target breakpoint to check
 * @returns true if current breakpoint matches target
 */
export function useBreakpointMatch(target: Breakpoint): boolean {
  const current = useBreakpoint();
  return current === target;
}

/**
 * Hook to check if viewport is at least a certain breakpoint
 * 
 * @param minimum - minimum breakpoint
 * @returns true if current breakpoint is >= minimum
 */
export function useBreakpointMin(minimum: Breakpoint): boolean {
  const current = useBreakpoint();
  
  const order: Record<Breakpoint, number> = {
    mobile: 0,
    tablet: 1,
    desktop: 2,
  };
  
  return order[current] >= order[minimum];
}
