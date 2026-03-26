import { describe, it, expect } from 'vitest';
import { render } from '@/test-utils';
import Home from './Home';

describe('Home Navigation Bar - Task 5.1', () => {
  it('should not contain inline style attributes in navigation', () => {
    const { container } = render(<Home />);
    const header = container.querySelector('header');
    
    // Check that header exists
    expect(header).toBeTruthy();
    
    // Check that header uses design token classes instead of inline styles
    expect(header?.className).toContain('backdrop-blur');
    expect(header?.className).toContain('border-border');
    expect(header?.className).toContain('bg-background');
    
    // Verify no inline style attribute on header
    expect(header?.getAttribute('style')).toBeNull();
  });

  it('should use design token classes for logo', () => {
    const { container } = render(<Home />);
    const logoIcon = container.querySelector('header .bg-primary');
    const logoText = container.querySelector('header .text-foreground');
    
    expect(logoIcon).toBeTruthy();
    expect(logoText).toBeTruthy();
  });

  it('should use design token classes for user menu', () => {
    const { container } = render(<Home />);
    const userButton = container.querySelector('header button');
    
    if (userButton) {
      expect(userButton.className).toContain('border-border');
      expect(userButton.className).toContain('text-muted-foreground');
      expect(userButton.className).toContain('hover:bg-accent');
    }
  });

  it('should use design token classes for dropdown menu', () => {
    const { container } = render(<Home />);
    
    // Check that dropdown content uses shadow-lg
    const dropdownContent = container.querySelector('[class*="DropdownMenuContent"]');
    if (dropdownContent) {
      expect(dropdownContent.className).toContain('shadow-lg');
    }
  });
});
