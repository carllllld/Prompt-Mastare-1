import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOneClickFix } from './use-one-click-fix';

describe('useOneClickFix', () => {
  const mockFeedback = {
    id: 'test-1',
    issue: 'Test issue',
    location: 'Test location',
    textSpan: { start: 0, end: 5, field: 'improvedPrompt' },
    suggestion: 'Test suggestion',
    category: 'grammar' as const,
    severity: 'important' as const,
    expert: 'broker' as const,
    actionable: true,
    autoFix: 'Fixed'
  };

  it('should apply fix successfully', () => {
    const onFixApplied = vi.fn();
    const { result } = renderHook(() => useOneClickFix({ onFixApplied }));

    const currentText = 'Hello world';
    const fixResult = result.current.applyFix(currentText, mockFeedback, 'improvedPrompt');

    expect(fixResult.success).toBe(true);
    expect(fixResult.newText).toBe('Fixed world');
    expect(onFixApplied).toHaveBeenCalledWith('test-1', 'Fixed world');
  });

  it('should fail if feedback is not actionable', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useOneClickFix({ onError }));

    const nonActionableFeedback = { ...mockFeedback, actionable: false };
    const fixResult = result.current.applyFix('Hello world', nonActionableFeedback, 'improvedPrompt');

    expect(fixResult.success).toBe(false);
    expect(fixResult.error).toBeDefined();
  });

  it('should support undo', () => {
    const { result } = renderHook(() => useOneClickFix());

    const currentText = 'Hello world';
    act(() => {
      result.current.applyFix(currentText, mockFeedback, 'improvedPrompt');
    });

    expect(result.current.canUndo).toBe(true);

    const undoResult = result.current.undo();
    expect(undoResult.success).toBe(true);
    expect(undoResult.text).toBe('Hello world');
  });

  it('should track applied fixes', () => {
    const { result } = renderHook(() => useOneClickFix());

    expect(result.current.isFixApplied('test-1')).toBe(false);

    act(() => {
      result.current.applyFix('Hello world', mockFeedback, 'improvedPrompt');
    });

    expect(result.current.isFixApplied('test-1')).toBe(true);
  });

  it('should fail if text span is out of bounds', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useOneClickFix({ onError }));

    const invalidFeedback = {
      ...mockFeedback,
      textSpan: { start: 0, end: 100, field: 'improvedPrompt' }
    };

    const fixResult = result.current.applyFix('Hello', invalidFeedback, 'improvedPrompt');

    expect(fixResult.success).toBe(false);
    expect(fixResult.error).toContain('ändrats');
  });

  it('should fail if field does not match', () => {
    const { result } = renderHook(() => useOneClickFix());

    const fixResult = result.current.applyFix('Hello world', mockFeedback, 'headline');

    expect(fixResult.success).toBe(false);
    expect(fixResult.error).toContain('annat textfält');
  });
});
