import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from './button';

describe('Button Component', () => {
  describe('Variants', () => {
    it('renders default variant correctly', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button).toBeTruthy();
      expect(button?.className).toContain('bg-primary');
      expect(button?.className).toContain('text-primary-foreground');
    });

    it('renders secondary variant correctly', () => {
      const { container } = render(<Button variant="secondary">Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-secondary');
      expect(button?.className).toContain('text-secondary-foreground');
    });

    it('renders outline variant correctly', () => {
      const { container } = render(<Button variant="outline">Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('border-input');
      expect(button?.className).toContain('bg-background');
    });

    it('renders ghost variant correctly', () => {
      const { container } = render(<Button variant="ghost">Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('hover:bg-accent');
    });

    it('renders destructive variant correctly', () => {
      const { container } = render(<Button variant="destructive">Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-destructive');
      expect(button?.className).toContain('text-destructive-foreground');
    });
  });

  describe('Sizes', () => {
    it('renders sm size correctly', () => {
      const { container } = render(<Button size="sm">Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('h-8');
      expect(button?.className).toContain('px-3');
      expect(button?.className).toContain('text-xs');
    });

    it('renders default size correctly', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('h-10');
      expect(button?.className).toContain('px-4');
    });

    it('renders lg size correctly', () => {
      const { container } = render(<Button size="lg">Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('h-12');
      expect(button?.className).toContain('px-6');
      expect(button?.className).toContain('text-base');
    });

    it('renders icon size correctly', () => {
      const { container } = render(<Button size="icon">X</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('h-10');
      expect(button?.className).toContain('w-10');
    });
  });

  describe('Interactive States', () => {
    it('has hover state classes', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('hover:');
    });

    it('has active state classes', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('active:');
    });

    it('has focus state classes', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('focus-visible:ring-2');
      expect(button?.className).toContain('focus-visible:ring-ring');
    });

    it('has disabled state classes', () => {
      const { container } = render(<Button disabled>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('disabled:opacity-50');
      expect(button?.className).toContain('disabled:pointer-events-none');
      expect(button?.className).toContain('disabled:cursor-not-allowed');
    });

    it('has cursor-pointer for interactive buttons', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('cursor-pointer');
    });
  });

  describe('Design System Compliance', () => {
    it('uses design token classes for colors', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      const className = button?.className || '';
      
      // Should not contain hex colors
      expect(className).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    });

    it('uses standard Tailwind spacing', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('gap-2');
    });

    it('uses transition for smooth state changes', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('transition');
    });

    it('has proper shadow elevation', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('shadow-sm');
      expect(button?.className).toContain('hover:shadow-md');
    });
  });

  describe('Accessibility', () => {
    it('renders as a button element by default', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.tagName).toBe('BUTTON');
    });

    it('passes through aria attributes', () => {
      const { container } = render(<Button aria-label="Close">X</Button>);
      const button = container.querySelector('button');
      expect(button?.getAttribute('aria-label')).toBe('Close');
    });

    it('handles disabled state correctly', () => {
      const { container } = render(<Button disabled>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.disabled).toBe(true);
    });
  });

  describe('No Inline Styles', () => {
    it('does not use inline style attributes', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      expect(button?.getAttribute('style')).toBeNull();
    });

    it('does not use arbitrary values in className', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');
      const className = button?.className || '';
      
      // Should not contain arbitrary values like [color:...]
      expect(className).not.toMatch(/\[(?:color|background|border-color):[^\]]+\]/);
    });
  });
});
