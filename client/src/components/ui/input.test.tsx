import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { Input } from './input';

describe('Input Component', () => {
  it('renders with default styles', () => {
    render(<Input placeholder="Test input" />);
    const input = screen.getByPlaceholderText('Test input');
    
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('h-10', 'rounded-md', 'border', 'bg-background');
  });

  it('applies focus states with ring classes', () => {
    render(<Input placeholder="Focus test" />);
    const input = screen.getByPlaceholderText('Focus test');
    
    expect(input).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    );
  });

  it('applies error states when error prop is true', () => {
    render(<Input placeholder="Error test" error />);
    const input = screen.getByPlaceholderText('Error test');
    
    expect(input).toHaveClass('border-error', 'focus-visible:ring-error');
  });

  it('applies normal border when error prop is false', () => {
    render(<Input placeholder="Normal test" error={false} />);
    const input = screen.getByPlaceholderText('Normal test');
    
    expect(input).toHaveClass('border-input', 'focus-visible:border-primary');
  });

  it('applies disabled states', () => {
    render(<Input placeholder="Disabled test" disabled />);
    const input = screen.getByPlaceholderText('Disabled test');
    
    expect(input).toBeDisabled();
    expect(input).toHaveClass(
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
      'disabled:bg-muted'
    );
  });

  it('applies placeholder styling', () => {
    render(<Input placeholder="Placeholder test" />);
    const input = screen.getByPlaceholderText('Placeholder test');
    
    expect(input).toHaveClass('placeholder:text-muted-foreground', 'placeholder:italic');
  });

  it('uses text-sm font size (minimum 14px)', () => {
    render(<Input placeholder="Font size test" />);
    const input = screen.getByPlaceholderText('Font size test');
    
    expect(input).toHaveClass('text-sm');
    expect(input).not.toHaveClass('text-[10px]', 'text-[11px]');
  });

  it('has no inline styles', () => {
    const { container } = render(<Input placeholder="No inline styles" />);
    const input = container.querySelector('input');
    
    expect(input?.getAttribute('style')).toBeNull();
  });

  it('applies hover state for enabled inputs', () => {
    render(<Input placeholder="Hover test" />);
    const input = screen.getByPlaceholderText('Hover test');
    
    expect(input).toHaveClass('hover:enabled:border-primary/50');
  });

  it('applies transition for smooth state changes', () => {
    render(<Input placeholder="Transition test" />);
    const input = screen.getByPlaceholderText('Transition test');
    
    expect(input).toHaveClass('transition-colors', 'duration-200');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Input ref={ref} placeholder="Ref test" />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('accepts custom className', () => {
    render(<Input placeholder="Custom class" className="custom-class" />);
    const input = screen.getByPlaceholderText('Custom class');
    
    expect(input).toHaveClass('custom-class');
  });

  it('passes through native input props', () => {
    render(
      <Input
        placeholder="Native props"
        type="email"
        name="email"
        required
        maxLength={100}
      />
    );
    const input = screen.getByPlaceholderText('Native props');
    
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('maxLength', '100');
  });

  it('applies file input styles', () => {
    render(<Input type="file" />);
    const input = screen.getByRole('textbox', { hidden: true }) || document.querySelector('input[type="file"]');
    
    expect(input).toHaveClass(
      'file:border-0',
      'file:bg-transparent',
      'file:text-sm',
      'file:font-medium',
      'file:text-foreground'
    );
  });
});
