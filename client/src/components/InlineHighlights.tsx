import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AlertCircle, AlertTriangle, Lightbulb, Scale, FileText, User, Briefcase, Wand2 } from "lucide-react";

// FeedbackItem interface matching backend
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

interface InlineHighlightsProps {
  text: string;
  feedback: FeedbackItem[];
  field?: string; // Which field this text represents (e.g., 'improvedPrompt', 'headline')
  onFixClick?: (feedbackId: string) => void;
  onTextChange?: (newText: string) => void;
  highlightedFeedbackId?: string | null; // Feedback to highlight and scroll to
}

// Severity color mapping
const SEVERITY_COLORS = {
  critical: {
    bg: '#FEE2E2',
    border: '#FCA5A5',
    text: '#991B1B',
    icon: '#DC2626',
  },
  important: {
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#92400E',
    icon: '#F59E0B',
  },
  suggestion: {
    bg: '#DBEAFE',
    border: '#93C5FD',
    text: '#1E40AF',
    icon: '#3B82F6',
  },
};

// Category icon mapping
const CATEGORY_ICONS = {
  grammar: FileText,
  style: Briefcase,
  legal: Scale,
  broker_realism: User,
  clarity: Lightbulb,
};

// Category labels
const CATEGORY_LABELS = {
  grammar: 'Grammatik',
  style: 'Stil',
  legal: 'Juridik',
  broker_realism: 'Mäklarrealism',
  clarity: 'Tydlighet',
};

interface TextSegment {
  text: string;
  feedback: FeedbackItem[];
  start: number;
  end: number;
}

export function InlineHighlights({ text, feedback, field = 'improvedPrompt', onFixClick, onTextChange, highlightedFeedbackId }: InlineHighlightsProps) {
  const [hoveredFeedbackId, setHoveredFeedbackId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const highlightedSpanRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debug logging
  useEffect(() => {
    console.log('[InlineHighlights] text length:', text.length);
    console.log('[InlineHighlights] feedback count:', feedback.length);
    console.log('[InlineHighlights] field:', field);
    console.log('[InlineHighlights] feedback:', feedback);
  }, [text, feedback, field]);

  // Scroll to highlighted feedback when it changes
  useEffect(() => {
    if (highlightedFeedbackId && highlightedSpanRef.current) {
      // Smooth scroll to the highlighted span
      highlightedSpanRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      // Flash animation
      highlightedSpanRef.current.style.animation = 'pulse 0.5s ease-in-out 2';
    }
  }, [highlightedFeedbackId]);

  // Filter feedback for this specific field
  const relevantFeedback = useMemo(() => {
    return feedback.filter(f => f.textSpan && f.textSpan.field === field);
  }, [feedback, field]);

  // Parse text into segments with feedback annotations
  const segments = useMemo((): TextSegment[] => {
    if (relevantFeedback.length === 0) {
      return [{ text, feedback: [], start: 0, end: text.length }];
    }

    // Sort feedback by start position
    const sortedFeedback = [...relevantFeedback].sort((a, b) => {
      const aStart = a.textSpan?.start ?? 0;
      const bStart = b.textSpan?.start ?? 0;
      return aStart - bStart;
    });

    const result: TextSegment[] = [];
    let currentPos = 0;

    sortedFeedback.forEach(fb => {
      if (!fb.textSpan) return;

      const { start, end } = fb.textSpan;

      // Add text before this feedback span
      if (currentPos < start) {
        result.push({
          text: text.slice(currentPos, start),
          feedback: [],
          start: currentPos,
          end: start,
        });
      }

      // Check if this span overlaps with existing segments
      const existingSegmentIndex = result.findIndex(
        seg => seg.start === start && seg.end === end
      );

      if (existingSegmentIndex >= 0) {
        // Add feedback to existing segment (overlapping highlights)
        result[existingSegmentIndex].feedback.push(fb);
      } else {
        // Create new segment with feedback
        result.push({
          text: text.slice(start, end),
          feedback: [fb],
          start,
          end,
        });
      }

      currentPos = Math.max(currentPos, end);
    });

    // Add remaining text
    if (currentPos < text.length) {
      result.push({
        text: text.slice(currentPos),
        feedback: [],
        start: currentPos,
        end: text.length,
      });
    }

    return result;
  }, [text, relevantFeedback]);

  // Get the most severe feedback for a segment (for color coding)
  const getMostSevereFeedback = useCallback((feedbackList: FeedbackItem[]): FeedbackItem | null => {
    if (feedbackList.length === 0) return null;
    
    const severityOrder = { critical: 0, important: 1, suggestion: 2 };
    return feedbackList.reduce((most, current) => {
      return severityOrder[current.severity] < severityOrder[most.severity] ? current : most;
    });
  }, []);

  // Handle mouse enter on highlighted span
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLSpanElement>, feedbackList: FeedbackItem[]) => {
    if (feedbackList.length === 0) return;

    const mostSevere = getMostSevereFeedback(feedbackList);
    if (!mostSevere) return;

    setHoveredFeedbackId(mostSevere.id);

    // Position tooltip
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  }, [getMostSevereFeedback]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoveredFeedbackId(null);
    setTooltipPosition(null);
  }, []);

  // Get hovered feedback details
  const hoveredFeedback = useMemo(() => {
    if (!hoveredFeedbackId) return null;
    return relevantFeedback.find(f => f.id === hoveredFeedbackId);
  }, [hoveredFeedbackId, relevantFeedback]);

  // Handle fix button click
  const handleFixClick = useCallback((e: React.MouseEvent, feedbackId: string) => {
    e.stopPropagation();
    if (onFixClick) {
      onFixClick(feedbackId);
    }
  }, [onFixClick]);

  // Split text into paragraphs (separated by \n\n)
  const paragraphs = text.split('\n\n').filter(p => p.trim());

  // If no feedback, render plain text with paragraph breaks
  if (relevantFeedback.length === 0) {
    return (
      <div className="space-y-4">
        {paragraphs.map((para, idx) => (
          <p key={idx} className="leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    );
  }

  // Helper to render a segment with proper paragraph handling
  const renderSegmentText = (segmentText: string) => {
    // Check if segment contains paragraph breaks
    if (segmentText.includes('\n\n')) {
      const parts = segmentText.split('\n\n');
      return parts.map((part, idx) => (
        <span key={idx}>
          {part}
          {idx < parts.length - 1 && <><br /><br /></>}
        </span>
      ));
    }
    return segmentText;
  };

  return (
    <div className="relative" ref={containerRef}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      {/* Render text segments with highlights */}
      {segments.map((segment, index) => {
        if (segment.feedback.length === 0) {
          return (
            <span key={index} className="whitespace-pre-wrap">
              {renderSegmentText(segment.text)}
            </span>
          );
        }

        const mostSevere = getMostSevereFeedback(segment.feedback);
        if (!mostSevere) {
          return (
            <span key={index} className="whitespace-pre-wrap">
              {renderSegmentText(segment.text)}
            </span>
          );
        }

        const colors = SEVERITY_COLORS[mostSevere.severity];
        const isHighlighted = segment.feedback.some(f => f.id === highlightedFeedbackId);

        return (
          <span
            key={index}
            ref={isHighlighted ? highlightedSpanRef : undefined}
            className="relative cursor-help transition-all duration-150 whitespace-pre-wrap"
            style={{
              backgroundColor: isHighlighted ? '#FEF08A' : colors.bg,
              borderBottom: `2px solid ${isHighlighted ? '#EAB308' : colors.border}`,
              borderRadius: '2px',
              padding: '1px 2px',
              boxShadow: isHighlighted ? '0 0 0 3px rgba(234, 179, 8, 0.2)' : 'none',
            }}
            onMouseEnter={(e) => handleMouseEnter(e, segment.feedback)}
            onMouseLeave={handleMouseLeave}
          >
            {renderSegmentText(segment.text)}
            {/* Multiple feedback indicator */}
            {segment.feedback.length > 1 && (
              <span
                className="inline-flex items-center justify-center ml-0.5 text-[9px] font-bold rounded-full"
                style={{
                  backgroundColor: colors.icon,
                  color: '#FFFFFF',
                  width: '14px',
                  height: '14px',
                  verticalAlign: 'super',
                  fontSize: '8px',
                }}
              >
                {segment.feedback.length}
              </span>
            )}
          </span>
        );
      })}

      {/* Tooltip */}
      {hoveredFeedback && tooltipPosition && (
        <div
          className="fixed z-[100] animate-in fade-in slide-in-from-bottom-1 duration-150"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translateX(-50%)',
            maxWidth: '400px',
            minWidth: '300px',
          }}
        >
          <div
            className="rounded-xl shadow-2xl border overflow-hidden"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: SEVERITY_COLORS[hoveredFeedback.severity].border,
              boxShadow: '0 20px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b flex items-center gap-2"
              style={{
                backgroundColor: SEVERITY_COLORS[hoveredFeedback.severity].bg,
                borderColor: SEVERITY_COLORS[hoveredFeedback.severity].border,
              }}
            >
              {hoveredFeedback.severity === 'critical' && (
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: SEVERITY_COLORS.critical.icon }} />
              )}
              {hoveredFeedback.severity === 'important' && (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: SEVERITY_COLORS.important.icon }} />
              )}
              {hoveredFeedback.severity === 'suggestion' && (
                <Lightbulb className="w-4 h-4 flex-shrink-0" style={{ color: SEVERITY_COLORS.suggestion.icon }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: SEVERITY_COLORS[hoveredFeedback.severity].text }}
                  >
                    {CATEGORY_LABELS[hoveredFeedback.category]}
                  </span>
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: SEVERITY_COLORS[hoveredFeedback.severity].text,
                    }}
                  >
                    {hoveredFeedback.expert === 'broker' ? 'Mäklare' : 'Jurist'}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Issue */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
                  Problem
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>
                  {hoveredFeedback.issue}
                </p>
              </div>

              {/* Suggestion */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
                  Förslag
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>
                  {hoveredFeedback.suggestion}
                </p>
              </div>

              {/* Auto-fix preview */}
              {hoveredFeedback.autoFix && (
                <div
                  className="rounded-lg px-3 py-2 border"
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderColor: '#E5E7EB',
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
                    Automatisk fix
                  </p>
                  <p className="text-xs font-mono leading-relaxed" style={{ color: '#1F2937' }}>
                    "{hoveredFeedback.autoFix}"
                  </p>
                </div>
              )}

              {/* Action button */}
              {hoveredFeedback.actionable && onFixClick && (
                <button
                  onClick={(e) => handleFixClick(e, hoveredFeedback.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #2D6A4F, #40916C)',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 6px rgba(45, 106, 79, 0.3)',
                  }}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Fixa automatiskt
                </button>
              )}
            </div>
          </div>

          {/* Arrow pointer */}
          <div
            className="w-3 h-3 rotate-45 absolute -top-1.5 left-1/2 -translate-x-1/2 border-t border-l"
            style={{
              backgroundColor: SEVERITY_COLORS[hoveredFeedback.severity].bg,
              borderColor: SEVERITY_COLORS[hoveredFeedback.severity].border,
            }}
          />
        </div>
      )}
    </div>
  );
}
