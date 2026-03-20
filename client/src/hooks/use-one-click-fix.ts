import { useState, useCallback, useRef } from "react";

interface FeedbackItem {
  id: string;
  issue: string;
  location: string;
  textSpan?: { start: number; end: number; field: string };
  suggestion: string;
  category: 'grammar' | 'style' | 'legal' | 'broker_realism' | 'clarity';
  severity: 'critical' | 'important' | 'suggestion';
  expert: 'broker' | 'lawyer';
  actionable: boolean;
  autoFix?: string;
}

interface HistoryEntry {
  text: string;
  feedbackId: string;
  timestamp: number;
}

interface UseOneClickFixOptions {
  onFixApplied?: (feedbackId: string, newText: string) => void;
  onError?: (error: string) => void;
}

export function useOneClickFix(options: UseOneClickFixOptions = {}) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const appliedFixes = useRef<Set<string>>(new Set());

  // Apply a fix to text
  const applyFix = useCallback((
    currentText: string,
    feedback: FeedbackItem,
    field: string = 'improvedPrompt'
  ): { success: boolean; newText?: string; error?: string } => {
    try {
      // Validate feedback has required data
      if (!feedback.actionable || !feedback.autoFix || !feedback.textSpan) {
        return {
          success: false,
          error: 'Denna fix kan inte appliceras automatiskt'
        };
      }

      // Check if feedback is for the correct field
      if (feedback.textSpan.field !== field) {
        return {
          success: false,
          error: 'Denna fix gäller ett annat textfält'
        };
      }

      const { start, end } = feedback.textSpan;
      const { autoFix } = feedback;

      // Validate text span is within bounds
      if (start < 0 || end > currentText.length || start >= end) {
        return {
          success: false,
          error: 'Texten har ändrats sedan feedbacken genererades'
        };
      }

      // Extract the text that should be replaced
      const originalSpan = currentText.slice(start, end);

      // Apply the fix
      const newText = currentText.slice(0, start) + autoFix + currentText.slice(end);

      // Save to history
      setHistory(prev => [...prev, {
        text: currentText,
        feedbackId: feedback.id,
        timestamp: Date.now()
      }]);
      setHistoryIndex(prev => prev + 1);

      // Mark as applied
      appliedFixes.current.add(feedback.id);

      // Log for analytics
      console.log('[OneClickFix] Applied fix:', {
        feedbackId: feedback.id,
        category: feedback.category,
        severity: feedback.severity,
        originalLength: originalSpan.length,
        newLength: autoFix.length
      });

      // Callback
      if (options.onFixApplied) {
        options.onFixApplied(feedback.id, newText);
      }

      return { success: true, newText };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ett oväntat fel uppstod';
      console.error('[OneClickFix] Error applying fix:', error);
      
      if (options.onError) {
        options.onError(errorMessage);
      }

      return { success: false, error: errorMessage };
    }
  }, [options]);

  // Undo last fix
  const undo = useCallback((): { success: boolean; text?: string } => {
    if (historyIndex < 0 || history.length === 0) {
      return { success: false };
    }

    const entry = history[historyIndex];
    setHistoryIndex(prev => prev - 1);

    // Remove from applied fixes
    appliedFixes.current.delete(entry.feedbackId);

    console.log('[OneClickFix] Undo fix:', {
      feedbackId: entry.feedbackId,
      historyIndex
    });

    return { success: true, text: entry.text };
  }, [history, historyIndex]);

  // Redo last undone fix
  const redo = useCallback((): { success: boolean; text?: string } => {
    if (historyIndex >= history.length - 1) {
      return { success: false };
    }

    const nextIndex = historyIndex + 1;
    const entry = history[nextIndex];
    setHistoryIndex(nextIndex);

    // Re-add to applied fixes
    appliedFixes.current.add(entry.feedbackId);

    console.log('[OneClickFix] Redo fix:', {
      feedbackId: entry.feedbackId,
      historyIndex: nextIndex
    });

    return { success: true };
  }, [history, historyIndex]);

  // Check if a fix has been applied
  const isFixApplied = useCallback((feedbackId: string): boolean => {
    return appliedFixes.current.has(feedbackId);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
    appliedFixes.current.clear();
  }, []);

  return {
    applyFix,
    undo,
    redo,
    isFixApplied,
    clearHistory,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    historyLength: history.length
  };
}
