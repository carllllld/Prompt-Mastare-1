/**
 * Scroll to a specific section with smooth animation
 * 
 * Features:
 * - Accounts for sticky header height
 * - Smooth scroll behavior
 * - Highlight animation
 * - Expands section if collapsed
 * 
 * @param sectionId - ID of the section to scroll to
 * @param options - scroll options
 */
export function scrollToSection(
  sectionId: string,
  options: {
    behavior?: ScrollBehavior;
    headerOffset?: number;
    additionalOffset?: number;
    onExpand?: () => void;
  } = {}
): boolean {
  const {
    behavior = 'smooth',
    headerOffset = 64, // Default sticky header height
    additionalOffset = 16, // Additional padding
    onExpand,
  } = options;
  
  // Find the element
  const element = document.getElementById(sectionId);
  if (!element) {
    console.warn(`Section not found: ${sectionId}`);
    return false;
  }
  
  // Expand section if it's collapsed
  if (onExpand) {
    onExpand();
  }
  
  try {
    // Calculate target position
    const elementRect = element.getBoundingClientRect();
    const absoluteTop = elementRect.top + window.scrollY;
    const targetPosition = absoluteTop - headerOffset - additionalOffset;
    
    // Scroll to position
    window.scrollTo({
      top: Math.max(0, targetPosition),
      behavior,
    });
    
    // Apply highlight animation
    element.classList.add('section-highlight');
    setTimeout(() => {
      element.classList.remove('section-highlight');
    }, 2000);
    
    return true;
  } catch (error) {
    console.error('Scroll failed:', error);
    // Fallback: instant scroll
    element.scrollIntoView({ block: 'center' });
    return false;
  }
}

/**
 * Scroll to a field within a section
 * 
 * @param fieldName - name attribute of the field
 * @param options - scroll options
 */
export function scrollToField(
  fieldName: string,
  options: {
    behavior?: ScrollBehavior;
    headerOffset?: number;
  } = {}
): boolean {
  const element = document.querySelector(`[name="${fieldName}"]`) as HTMLElement;
  if (!element) {
    console.warn(`Field not found: ${fieldName}`);
    return false;
  }
  
  const { behavior = 'smooth', headerOffset = 64 } = options;
  
  try {
    const elementRect = element.getBoundingClientRect();
    const absoluteTop = elementRect.top + window.scrollY;
    const targetPosition = absoluteTop - headerOffset - 16;
    
    window.scrollTo({
      top: Math.max(0, targetPosition),
      behavior,
    });
    
    // Apply focus ring animation
    element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
    setTimeout(() => {
      element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
    }, 2000);
    
    // Focus the element for keyboard users
    if (element.focus) {
      element.focus();
    }
    
    return true;
  } catch (error) {
    console.error('Scroll to field failed:', error);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
}
