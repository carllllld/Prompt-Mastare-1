import { useState, useMemo } from "react";
import { AlertCircle, AlertTriangle, Lightbulb, Scale, FileText, User, Briefcase, Wand2, Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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

interface ExpertAnalysis {
  overallQuality: number;
  strengths: string[];
  improvements: FeedbackItem[];
  legalCheck: {
    compliant: boolean;
    notes: string;
    issues: string[];
  };
  duration: number;
}

interface ExpertFeedbackPanelProps {
  analysis: ExpertAnalysis;
  onFeedbackClick?: (feedbackId: string) => void;
  onFixClick?: (feedbackId: string) => void;
  onAISuggestClick?: (feedbackId: string) => void;
  onDismissClick?: (feedbackId: string) => void;
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

// Severity labels
const SEVERITY_LABELS = {
  critical: 'Kritisk',
  important: 'Viktig',
  suggestion: 'Förslag',
};

export function ExpertFeedbackPanel({
  analysis,
  onFeedbackClick,
  onFixClick,
  onAISuggestClick,
  onDismissClick,
}: ExpertFeedbackPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Group feedback by category
  const groupedFeedback = useMemo(() => {
    const groups: Record<string, FeedbackItem[]> = {
      grammar: [],
      style: [],
      legal: [],
      broker_realism: [],
      clarity: [],
    };

    analysis.improvements.forEach(item => {
      if (groups[item.category]) {
        groups[item.category].push(item);
      }
    });

    // Sort each group by severity (critical > important > suggestion)
    const severityOrder = { critical: 0, important: 1, suggestion: 2 };
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    });

    return groups;
  }, [analysis.improvements]);

  // Calculate counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(groupedFeedback).forEach(category => {
      counts[category] = groupedFeedback[category].length;
    });
    return counts;
  }, [groupedFeedback]);

  // Total feedback count
  const totalCount = useMemo(() => {
    return analysis.improvements.length;
  }, [analysis.improvements]);

  // Handle feedback item click
  const handleFeedbackClick = (feedbackId: string) => {
    if (onFeedbackClick) {
      onFeedbackClick(feedbackId);
    }
  };

  // Handle fix button click
  const handleFixClick = (e: React.MouseEvent, feedbackId: string) => {
    e.stopPropagation();
    if (onFixClick) {
      onFixClick(feedbackId);
    }
  };

  // Handle AI suggest button click
  const handleAISuggestClick = (e: React.MouseEvent, feedbackId: string) => {
    e.stopPropagation();
    if (onAISuggestClick) {
      onAISuggestClick(feedbackId);
    }
  };

  // Handle dismiss button click
  const handleDismissClick = (e: React.MouseEvent, feedbackId: string) => {
    e.stopPropagation();
    if (onDismissClick) {
      onDismissClick(feedbackId);
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: FeedbackItem['severity']) => {
    switch (severity) {
      case 'critical':
        return AlertCircle;
      case 'important':
        return AlertTriangle;
      case 'suggestion':
        return Lightbulb;
    }
  };

  // If no feedback, show empty state
  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Lightbulb className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Inga förbättringsförslag
        </h3>
        <p className="text-sm text-gray-600 max-w-sm">
          Texten ser bra ut! Våra AI-experter hittade inga problem som behöver åtgärdas.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Expertfeedback
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {totalCount} {totalCount === 1 ? 'förbättring' : 'förbättringar'} hittade
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Kvalitet: {analysis.overallQuality}/10
          </Badge>
        </div>
      </div>

      {/* Feedback list */}
      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          value={expandedCategories}
          onValueChange={setExpandedCategories}
          className="w-full"
        >
          {Object.entries(groupedFeedback).map(([category, items]) => {
            if (items.length === 0) return null;

            const CategoryIcon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
            const count = categoryCounts[category];

            return (
              <AccordionItem key={category} value={category} className="border-b border-gray-200">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <CategoryIcon className="w-4 h-4 text-gray-700" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-2">
                  <div className="space-y-2">
                    {items.map((item) => {
                      const SeverityIcon = getSeverityIcon(item.severity);
                      const colors = SEVERITY_COLORS[item.severity];

                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border transition-all hover:shadow-md cursor-pointer"
                          style={{
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                          }}
                          onClick={() => handleFeedbackClick(item.id)}
                        >
                          {/* Feedback header */}
                          <div className="px-3 py-2 border-b" style={{ borderColor: colors.border }}>
                            <div className="flex items-start gap-2">
                              <SeverityIcon
                                className="w-4 h-4 flex-shrink-0 mt-0.5"
                                style={{ color: colors.icon }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span
                                    className="text-[10px] font-bold uppercase tracking-wider"
                                    style={{ color: colors.text }}
                                  >
                                    {SEVERITY_LABELS[item.severity]}
                                  </span>
                                  <span
                                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white"
                                    style={{ color: colors.text }}
                                  >
                                    {item.expert === 'broker' ? 'Mäklare' : 'Jurist'}
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-gray-900 leading-snug">
                                  {item.issue}
                                </p>
                                {item.location && (
                                  <p className="text-[10px] text-gray-600 mt-1">
                                    📍 {item.location}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Feedback content */}
                          <div className="px-3 py-2 space-y-2">
                            {/* Suggestion */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                                Förslag
                              </p>
                              <p className="text-xs text-gray-800 leading-relaxed">
                                {item.suggestion}
                              </p>
                            </div>

                            {/* Auto-fix preview */}
                            {item.autoFix && (
                              <div className="rounded-md px-2 py-1.5 bg-white border border-gray-200">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                                  Automatisk fix
                                </p>
                                <p className="text-xs font-mono text-gray-900 leading-relaxed">
                                  "{item.autoFix}"
                                </p>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 pt-1">
                              {item.actionable && onFixClick && (
                                <Button
                                  size="sm"
                                  onClick={(e) => handleFixClick(e, item.id)}
                                  className="flex-1 text-xs h-7"
                                  style={{
                                    background: 'linear-gradient(135deg, #2D6A4F, #40916C)',
                                    color: '#FFFFFF',
                                  }}
                                >
                                  <Wand2 className="w-3 h-3" />
                                  Fixa
                                </Button>
                              )}
                              {onAISuggestClick && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleAISuggestClick(e, item.id)}
                                  className="flex-1 text-xs h-7"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  AI-förslag
                                </Button>
                              )}
                              {onDismissClick && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => handleDismissClick(e, item.id)}
                                  className="text-xs h-7 px-2"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>

      {/* Footer with legal check */}
      {analysis.legalCheck && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-start gap-2">
            <Scale className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900">
                Juridisk kontroll: {analysis.legalCheck.compliant ? '✓ Godkänd' : '⚠ Granskning krävs'}
              </p>
              {analysis.legalCheck.notes && (
                <p className="text-[10px] text-gray-600 mt-1">
                  {analysis.legalCheck.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
