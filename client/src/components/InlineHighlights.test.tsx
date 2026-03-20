import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineHighlights } from './InlineHighlights';

// Mock feedback item
const createFeedbackItem = (overrides = {}) => ({
  id: 'test-id-1',
  issue: 'Test issue',
  location: 'Test location',
  textSpan: { start: 0, end: 10, field: 'improvedPrompt' },
  suggestion: 'Test suggestion',
  category: 'grammar' as const,
  severity: 'critical' as const,
  expert: 'broker' as const,
  actionable: true,
  autoFix: 'Fixed text',
  ...overrides,
});

describe('InlineHighlights', () => {
  it('renders plain text when no feedback is provided', () => {
    const text = 'This is a test text';
    const { container } = render(
      <InlineHighlights text={text} feedback={[]} />
    );
    
    expect(container.textContent).toBe(text);
  });

  it('renders highlights for feedback items with text spans', () => {
    const text = 'This is a test text';
    const feedback = [
      createFeedbackItem({
        textSpan: { start: 0, end: 4, field: 'improvedPrompt' },
      }),
    ];

    const { container } = render(
      <InlineHighlights text={text} feedback={feedback} field="improvedPrompt" />
    );

    // Check that highlighted span exists
    const highlightedSpan = container.querySelector('span[style*="background"]');
    expect(highlightedSpan).toBeTruthy();
    expect(highlightedSpan?.textContent).toBe('This');
  });

  it('applies correct color coding based on severity', () => {
    const text = 'Critical Important Suggestion';
    const feedback = [
      createFeedbackItem({
        id: 'critical-1',
        severity: 'critical',
        textSpan: { start: 0, end: 8, field: 'improvedPrompt' },
      }),
      createFeedbackItem({
        id: 'important-1',
        severity: 'important',
        textSpan: { start: 9, end: 18, field: 'improvedPrompt' },
      }),
      createFeedbackItem({
        id: 'suggestion-1',
        severity: 'suggestion',
        textSpan: { start: 19, end: 29, field: 'improvedPrompt' },
      }),
    ];

    const { container } = render(
      <InlineHighlights text={text} feedback={feedback} field="improvedPrompt" />
    );

    const highlightedSpans = container.querySelectorAll('span[style*="background"]');
    expect(highlightedSpans.length).toBe(3);

    // Critical should have red background
    expect(highlightedSpans[0].getAttribute('style')).toContain('#FEE2E2');
    
    // Important should have yellow background
    expect(highlightedSpans[1].getAttribute('style')).toContain('#FEF3C7');
    
    // Suggestion should have blue background
    expect(highlightedSpans[2].getAttribute('style')).toContain('#DBEAFE');
  });

  it('shows tooltip on hover with feedback details', () => {
    const text = 'Test text';
    const feedback = [
      createFeedbackItem({
        issue: 'Grammar error',
        suggestion: 'Fix the grammar',
        textSpan: { start: 0, end: 4, field: 'improvedPrompt' },
      }),
    ];

    const { container } = render(
      <InlineHighlights text={text} feedback={feedback} field="improvedPrompt" />
    );

    const highlightedSpan = container.querySelector('span[style*="background"]');
    expect(highlightedSpan).toBeTruthy();

    // Hover over the span
    fireEvent.mouseEnter(highlightedSpan!);

    // Check tooltip appears with feedback details
    expect(screen.getByText('Grammar error')).toBeInTheDocument();
    expect(screen.getByText('Fix the grammar')).toBeInTheDocument();
  });

  it('shows Fix button for actionable feedback', () => {
    const text = 'Test text';
    const onFixClick = vi.fn();
    const feedback = [
      createFeedbackItem({
        actionable: true,
        autoFix: 'Fixed version',
        textSpan: { start: 0, end: 4, field: 'improvedPrompt' },
      }),
    ];

    const { container } = render(
      <InlineHighlights 
        text={text} 
        feedback={feedback} 
        field="improvedPrompt"
        onFixClick={onFixClick}
      />
    );

    const highlightedSpan = container.querySelector('span[style*="background"]');
    fireEvent.mouseEnter(highlightedSpan!);

    // Check Fix button appears
    const fixButton = screen.getByText('Fixa automatiskt');
    expect(fixButton).toBeInTheDocument();

    // Click the button
    fireEvent.click(fixButton);
    expect(onFixClick).toHaveBeenCalledWith('test-id-1');
  });

  it('supports multiple overlapping highlights', () => {
    const text = 'Test text';
    const feedback = [
      createFeedbackItem({
        id: 'feedback-1',
        textSpan: { start: 0, end: 4, field: 'improvedPrompt' },
      }),
      createFeedbackItem({
        id: 'feedback-2',
        textSpan: { start: 0, end: 4, field: 'improvedPrompt' },
      }),
    ];

    const { container } = render(
      <InlineHighlights text={text} feedback={feedback} field="improvedPrompt" />
    );

    // Should show indicator for multiple feedback items
    const indicator = container.querySelector('span[style*="verticalAlign"]');
    expect(indicator).toBeTruthy();
    expect(indicator?.textContent).toBe('2');
  });

  it('filters feedback by field', () => {
    const text = 'Test text';
    const feedback = [
      createFeedbackItem({
        textSpan: { start: 0, end: 4, field: 'improvedPrompt' },
      }),
      createFeedbackItem({
        id: 'headline-feedback',
        textSpan: { start: 0, end: 4, field: 'headline' },
      }),
    ];

    const { container } = render(
      <InlineHighlights text={text} feedback={feedback} field="improvedPrompt" />
    );

    // Should only show one highlight (for improvedPrompt field)
    const highlightedSpans = container.querySelectorAll('span[style*="background"]');
    expect(highlightedSpans.length).toBe(1);
  });

  it('handles text without feedback spans gracefully', () => {
    const text = 'Test text';
    const feedback = [
      createFeedbackItem({
        textSpan: undefined, // No text span
      }),
    ];

    const { container } = render(
      <InlineHighlights text={text} feedback={feedback} field="improvedPrompt" />
    );

    // Should render as plain text
    expect(container.textContent).toBe(text);
    const highlightedSpans = container.querySelectorAll('span[style*="background"]');
    expect(highlightedSpans.length).toBe(0);
  });
});
