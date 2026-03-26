import { describe, it, expect } from 'vitest';
import { render } from '@/test-utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

describe('Card Component', () => {
  describe('Card variants', () => {
    it('renders default variant with shadow-sm', () => {
      const { container } = render(<Card>Default Card</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('shadow-sm');
      expect(card.className).toContain('rounded-xl');
      expect(card.className).toContain('border');
      expect(card.className).toContain('bg-card');
    });

    it('renders elevated variant with shadow-md and hover:shadow-lg', () => {
      const { container } = render(<Card variant="elevated">Elevated Card</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('shadow-md');
      expect(card.className).toContain('hover:shadow-lg');
      expect(card.className).toContain('transition-shadow');
    });

    it('renders flat variant with no shadow and border-2', () => {
      const { container } = render(<Card variant="flat">Flat Card</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('shadow-none');
      expect(card.className).toContain('border-2');
    });

    it('renders interactive variant with hover:shadow-md and cursor-pointer', () => {
      const { container } = render(<Card variant="interactive">Interactive Card</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('hover:shadow-md');
      expect(card.className).toContain('cursor-pointer');
      expect(card.className).toContain('transition-shadow');
    });
  });

  describe('CardHeader', () => {
    it('renders with border-b and proper spacing', () => {
      const { container } = render(<CardHeader>Header Content</CardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header.className).toContain('border-b');
      expect(header.className).toContain('border-border');
      expect(header.className).toContain('pb-4');
      expect(header.className).toContain('mb-4');
      expect(header.className).toContain('p-6');
    });
  });

  describe('CardTitle', () => {
    it('renders with proper typography classes', () => {
      const { container } = render(<CardTitle>Card Title</CardTitle>);
      const title = container.firstChild as HTMLElement;
      expect(title.className).toContain('text-2xl');
      expect(title.className).toContain('font-semibold');
      expect(title.className).toContain('leading-none');
      expect(title.className).toContain('tracking-tight');
    });
  });

  describe('CardDescription', () => {
    it('renders with muted foreground color', () => {
      const { container } = render(<CardDescription>Description text</CardDescription>);
      const description = container.firstChild as HTMLElement;
      expect(description.className).toContain('text-sm');
      expect(description.className).toContain('text-muted-foreground');
    });
  });

  describe('CardContent', () => {
    it('renders with proper padding', () => {
      const { container } = render(<CardContent>Content</CardContent>);
      const content = container.firstChild as HTMLElement;
      expect(content.className).toContain('p-6');
      expect(content.className).toContain('pt-0');
    });
  });

  describe('CardFooter', () => {
    it('renders with border-t and proper spacing', () => {
      const { container } = render(<CardFooter>Footer Content</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain('border-t');
      expect(footer.className).toContain('border-border');
      expect(footer.className).toContain('pt-4');
      expect(footer.className).toContain('mt-4');
      expect(footer.className).toContain('p-6');
      expect(footer.className).toContain('flex');
      expect(footer.className).toContain('items-center');
    });
  });

  describe('No inline styles', () => {
    it('Card component has no inline styles', () => {
      const { container } = render(<Card>Test</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.getAttribute('style')).toBeNull();
    });

    it('CardHeader has no inline styles', () => {
      const { container } = render(<CardHeader>Test</CardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header.getAttribute('style')).toBeNull();
    });

    it('CardFooter has no inline styles', () => {
      const { container } = render(<CardFooter>Test</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer.getAttribute('style')).toBeNull();
    });
  });

  describe('Custom className support', () => {
    it('allows custom className to be merged', () => {
      const { container } = render(<Card className="custom-class">Test</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
      expect(card.className).toContain('shadow-sm');
    });
  });

  describe('Complete card structure', () => {
    it('renders full card with all components', () => {
      const { getByText } = render(
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Test Content</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(getByText('Test Title')).toBeTruthy();
      expect(getByText('Test Description')).toBeTruthy();
      expect(getByText('Test Content')).toBeTruthy();
      expect(getByText('Action')).toBeTruthy();
    });
  });
});
