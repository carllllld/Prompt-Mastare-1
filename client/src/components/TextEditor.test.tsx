import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { TextEditor } from './TextEditor';
import '@testing-library/jest-dom';

/**
 * Bug Condition Exploration Test for Bug 1: Paragraph Breaks Missing
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * Goal: Surface counterexamples that demonstrate paragraph breaks are being stripped
 * Expected Outcome: Test FAILS (this is correct - it proves the bug exists)
 */

describe('TextEditor - Bug 1: Paragraph Breaks Preservation', () => {
  const mockOnTextChange = vi.fn();

  beforeEach(() => {
    mockOnTextChange.mockClear();
  });

  it('should preserve \\n\\n paragraph breaks when syncing text prop', () => {
    const textWithBreaks = 'Köket renoverades 2020.\n\nVardagsrummet har parkettgolv.';
    
    const { rerender } = render(
      <TextEditor text={textWithBreaks} onTextChange={mockOnTextChange} />
    );

    // Get the contentEditable div
    const editor = document.querySelector('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // CRITICAL CHECK: textContent should preserve \n\n breaks
    expect(editor?.textContent).toBe(textWithBreaks);
    expect(editor?.textContent).toContain('\n\n');

    // Update prop with new text containing paragraph breaks
    const newTextWithBreaks = 'Första stycket.\n\nAndra stycket.\n\nTredje stycket.';
    rerender(<TextEditor text={newTextWithBreaks} onTextChange={mockOnTextChange} />);

    // Verify paragraph breaks are still preserved after sync
    expect(editor?.textContent).toBe(newTextWithBreaks);
    expect(editor?.textContent).toContain('\n\n');
    
    // Count paragraph breaks
    const breakCount = (editor?.textContent?.match(/\n\n/g) || []).length;
    expect(breakCount).toBe(2); // Should have 2 paragraph breaks
  });

  it('should preserve \\n\\n paragraph breaks during user input/editing', async () => {
    const initialText = 'Initial text.\n\nSecond paragraph.';
    
    render(<TextEditor text={initialText} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Initial text/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Simulate user typing (this triggers handleInput which uses textContent)
    if (editor) {
      // Add text to the end
      editor.textContent = initialText + '\n\nThird paragraph.';
      fireEvent.input(editor);
    }

    await waitFor(() => {
      expect(mockOnTextChange).toHaveBeenCalled();
    });

    // Verify the callback received text with paragraph breaks preserved
    const lastCall = mockOnTextChange.mock.calls[mockOnTextChange.mock.calls.length - 1];
    expect(lastCall[0]).toContain('\n\n');
    
    // Should have 2 paragraph breaks now
    const breakCount = (lastCall[0].match(/\n\n/g) || []).length;
    expect(breakCount).toBe(2);
  });

  it('should preserve \\n\\n paragraph breaks during undo operation', () => {
    const textWithBreaks = 'Original.\n\nWith breaks.';
    
    render(<TextEditor text={textWithBreaks} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Original/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Make an edit to create history
    if (editor) {
      editor.textContent = 'Modified text.';
      fireEvent.input(editor);
    }

    // Trigger undo with Cmd+Z
    fireEvent.keyDown(document, { key: 'z', metaKey: true });

    // After undo, editor should have original text with paragraph breaks
    expect(editor?.textContent).toBe(textWithBreaks);
    expect(editor?.textContent).toContain('\n\n');
  });

  it('should preserve \\n\\n paragraph breaks during redo operation', () => {
    const textWithBreaks = 'Original.\n\nWith breaks.';
    const modifiedText = 'Modified.\n\nAlso with breaks.';
    
    render(<TextEditor text={textWithBreaks} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Original/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Make an edit
    if (editor) {
      editor.textContent = modifiedText;
      fireEvent.input(editor);
    }

    // Undo
    fireEvent.keyDown(document, { key: 'z', metaKey: true });

    // Redo with Cmd+Shift+Z
    fireEvent.keyDown(document, { key: 'z', metaKey: true, shiftKey: true });

    // After redo, should have modified text with paragraph breaks
    expect(editor?.textContent).toBe(modifiedText);
    expect(editor?.textContent).toContain('\n\n');
  });

  it('should display paragraph breaks as visual spacing', () => {
    const textWithBreaks = 'Para 1.\n\nPara 2.\n\nPara 3.';
    
    render(<TextEditor text={textWithBreaks} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Para 1/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Verify whitespace-pre-wrap CSS is applied (preserves \n\n as visual breaks)
    expect(editor).toHaveClass('whitespace-pre-wrap');

    // Verify textContent contains the breaks
    expect(editor?.textContent).toContain('\n\n');
    
    // Count breaks
    const breakCount = (editor?.textContent?.match(/\n\n/g) || []).length;
    expect(breakCount).toBe(2);
  });

  it('should handle edge case: multiple consecutive paragraph breaks', () => {
    const textWithMultipleBreaks = 'Text 1.\n\n\n\nText 2.';
    
    render(<TextEditor text={textWithMultipleBreaks} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Text 1/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Should preserve all breaks (even \n\n\n\n)
    expect(editor?.textContent).toBe(textWithMultipleBreaks);
    expect(editor?.textContent).toContain('\n\n\n\n');
  });

  it('should handle edge case: single line break (not paragraph break)', () => {
    const textWithSingleBreak = 'Line 1.\nLine 2.';
    
    render(<TextEditor text={textWithSingleBreak} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Line 1/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Should preserve single \n (not just \n\n)
    expect(editor?.textContent).toBe(textWithSingleBreak);
    expect(editor?.textContent).toContain('\n');
    expect(editor?.textContent).not.toContain('\n\n');
  });

  it('should handle edge case: empty text', () => {
    const emptyText = '';
    
    render(<TextEditor text={emptyText} onTextChange={mockOnTextChange} />);

    const editor = document.querySelector('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Should handle empty text gracefully
    expect(editor?.textContent).toBe('');
  });
});

/**
 * Preservation Property Tests for Bug 1: Text Editing Features
 * 
 * CRITICAL: These tests MUST PASS on unfixed code - they test non-buggy inputs
 * These tests verify that text WITHOUT \n\n paragraph breaks continues to work correctly
 * 
 * Goal: Capture baseline behavior that must be preserved after the fix
 * Expected Outcome: Tests PASS (confirms existing functionality works)
 */

describe('TextEditor - Preservation: Text Editing Features (Non-buggy inputs)', () => {
  const mockOnTextChange = vi.fn();

  beforeEach(() => {
    mockOnTextChange.mockClear();
  });

  it('PRESERVATION: should handle text without any line breaks', () => {
    const textWithoutBreaks = 'Köket renoverades 2020 med nya vitvaror och kakel.';
    
    render(<TextEditor text={textWithoutBreaks} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Köket renoverades 2020/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Text without breaks should work perfectly on unfixed code
    expect(editor?.textContent).toBe(textWithoutBreaks);
    expect(editor?.textContent).not.toContain('\n');
  });

  it('PRESERVATION: should handle text with single line breaks (not paragraph breaks)', () => {
    const textWithSingleBreaks = 'Köket renoverades 2020.\nVardagsrummet har parkettgolv.\nSovrummet vetter mot gården.';
    
    render(<TextEditor text={textWithSingleBreaks} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Köket renoverades 2020/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Single line breaks should be preserved (not affected by the bug)
    expect(editor?.textContent).toBe(textWithSingleBreaks);
    expect(editor?.textContent).toContain('\n');
    expect(editor?.textContent).not.toContain('\n\n');
    
    // Count single line breaks
    const singleBreakCount = (editor?.textContent?.match(/\n/g) || []).length;
    expect(singleBreakCount).toBe(2);
  });

  it('PRESERVATION: should allow direct editing of text without line breaks', async () => {
    const initialText = 'Initial text without breaks';
    
    render(<TextEditor text={initialText} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Initial text/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Simulate user editing
    if (editor) {
      editor.textContent = 'Edited text without breaks';
      fireEvent.input(editor);
    }

    await waitFor(() => {
      expect(mockOnTextChange).toHaveBeenCalled();
    });

    // Verify callback received the edited text
    const lastCall = mockOnTextChange.mock.calls[mockOnTextChange.mock.calls.length - 1];
    expect(lastCall[0]).toBe('Edited text without breaks');
    expect(lastCall[0]).not.toContain('\n');
  });

  it('PRESERVATION: should support undo/redo for text without paragraph breaks', () => {
    const originalText = 'Original text';
    
    render(<TextEditor text={originalText} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Original text/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Make an edit
    if (editor) {
      editor.textContent = 'Modified text';
      fireEvent.input(editor);
    }

    // Undo
    fireEvent.keyDown(document, { key: 'z', metaKey: true });

    // Should restore original text
    expect(editor?.textContent).toBe(originalText);

    // Redo
    fireEvent.keyDown(document, { key: 'z', metaKey: true, shiftKey: true });

    // Should restore modified text
    expect(editor?.textContent).toBe('Modified text');
  });

  it('PRESERVATION: should handle empty text gracefully', () => {
    const emptyText = '';
    
    render(<TextEditor text={emptyText} onTextChange={mockOnTextChange} />);

    const editor = document.querySelector('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Empty text should work without issues
    expect(editor?.textContent).toBe('');
  });

  it('PRESERVATION: should handle text with special characters', () => {
    const textWithSpecialChars = 'Pris: 4 500 000 kr. Avgift: 3 200 kr/mån. Storlek: 85 m².';
    
    render(<TextEditor text={textWithSpecialChars} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Pris: 4 500 000 kr/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Special characters should be preserved
    expect(editor?.textContent).toBe(textWithSpecialChars);
    expect(editor?.textContent).toContain('å');
    expect(editor?.textContent).toContain('²');
  });

  it('PRESERVATION: should handle very long text without breaks', () => {
    const longText = 'Detta är en mycket lång text som beskriver en fastighet i detalj med många ord och meningar som flyter ihop utan några styckeindelningar vilket är helt okej för vissa typer av texter även om det inte är optimalt för läsbarhet.';
    
    render(<TextEditor text={longText} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Detta är en mycket lång text/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Long text without breaks should work fine
    expect(editor?.textContent).toBe(longText);
    expect(editor?.textContent).not.toContain('\n');
  });

  it('PRESERVATION: should preserve whitespace-pre-wrap CSS class', () => {
    const simpleText = 'Simple text';
    
    render(<TextEditor text={simpleText} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Simple text/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // CSS class should be present (needed for proper whitespace rendering)
    expect(editor).toHaveClass('whitespace-pre-wrap');
  });

  it('PRESERVATION: should handle text updates via prop changes', () => {
    const initialText = 'Initial text';
    const updatedText = 'Updated text';
    
    const { rerender } = render(
      <TextEditor text={initialText} onTextChange={mockOnTextChange} />
    );

    const editor = screen.getByText(/Initial text/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();
    expect(editor?.textContent).toBe(initialText);

    // Update prop
    rerender(<TextEditor text={updatedText} onTextChange={mockOnTextChange} />);

    // Editor should sync to new text
    expect(editor?.textContent).toBe(updatedText);
  });

  it('PRESERVATION: should handle Swedish characters correctly', () => {
    const swedishText = 'Köket är renoverat. Vardagsrummet är ljust och rymligt. Sovrummet är mysigt.';
    
    render(<TextEditor text={swedishText} onTextChange={mockOnTextChange} />);

    const editor = screen.getByText(/Köket är renoverat/i).closest('[contenteditable="true"]');
    expect(editor).toBeInTheDocument();

    // Swedish characters should be preserved
    expect(editor?.textContent).toBe(swedishText);
    expect(editor?.textContent).toContain('ö');
    expect(editor?.textContent).toContain('ä');
    expect(editor?.textContent).toContain('å');
  });
});
