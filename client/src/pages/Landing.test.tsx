import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import Landing from './Landing';

describe('Landing Page - DemoTabs Component', () => {
  it('renders demo tabs without inline styles', () => {
    const { container } = render(<Landing />);
    
    // Check that the demo section exists
    const demoSection = container.querySelector('.bg-card.rounded-xl.border.border-card-border');
    expect(demoSection).toBeTruthy();
    
    // Verify no inline style attributes with hard-coded colors
    const elementsWithInlineStyles = container.querySelectorAll('[style*="background"]');
    const hardCodedStyles = Array.from(elementsWithInlineStyles).filter(el => {
      const style = el.getAttribute('style') || '';
      return style.includes('#') || style.includes('rgb');
    });
    
    expect(hardCodedStyles.length).toBe(0);
  });

  it('renders tab buttons with design token classes', () => {
    const { container } = render(<Landing />);
    
    // Check for pill-shaped tab buttons
    const tabButtons = container.querySelectorAll('button.rounded-full');
    expect(tabButtons.length).toBeGreaterThan(0);
    
    // Verify buttons use design token classes
    const firstButton = tabButtons[0];
    const classes = firstButton.className;
    expect(classes).toMatch(/text-xs/);
    expect(classes).toMatch(/rounded-full/);
    expect(classes).toMatch(/border/);
  });

  it('renders before/after sections with semantic colors', () => {
    const { container } = render(<Landing />);
    
    // Check for error variant (before - bad AI)
    const errorBadge = container.querySelector('.bg-error-bg.text-error');
    expect(errorBadge).toBeTruthy();
    expect(errorBadge?.textContent).toContain('Typisk chatt-AI');
    
    // Check for success variant (after - Mäklartexter)
    const successBadge = container.querySelector('.bg-success-bg.text-success');
    expect(successBadge).toBeTruthy();
    expect(successBadge?.textContent).toContain('Mäklartexter');
  });

  it('uses minimum font size of text-xs', () => {
    const { container } = render(<Landing />);
    
    // Check that no text-[10px] or text-[11px] classes exist in demo section
    const demoSection = container.querySelector('.bg-card.rounded-xl');
    const html = demoSection?.innerHTML || '';
    
    expect(html).not.toMatch(/text-\[10px\]/);
    expect(html).not.toMatch(/text-\[11px\]/);
  });

  it('applies visual contrast with background colors', () => {
    const { container } = render(<Landing />);
    
    // Check for contrasting backgrounds
    const errorSection = container.querySelector('.bg-error-bg\\/30');
    expect(errorSection).toBeTruthy();
    
    const successSection = container.querySelector('.bg-success-bg\\/30');
    expect(successSection).toBeTruthy();
  });
});
