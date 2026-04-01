import { useState, useMemo, useEffect } from "react";
import { AlertCircle, AlertTriangle, Lightbulb, Scale, FileText, User, Briefcase, Wand2, Sparkles, X } from "lucide-react";
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

// Severity variant mapping to design tokens
const SEVERITY_VARIANTS = {
  critical: {
    container: 'bg-error-bg border-error',
    text: 'text-error',
    icon: 'text-error',
    badge: 'bg-error text-error-foreground',
  },
  important: {
    container: 'bg-warning-bg border-warning',
    text: 'text-warning',
    icon: 'text-warning',
    badge: 'bg-warning text-warning-foreground',
  },
  suggestion: {
    container: 'bg-info-bg border-info',
    text: 'text-info',
    icon: 'text-info',
    badge: 'bg-info text-info-foreground',
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

  // Debug logging
  useEffect(() => {
    console.log('[ExpertFeedbackPanel] analysis:', analysis);
    console.log('[ExpertFeedbackPanel] improvements count:', analysis.improvements.length);
  }, [analysis]);

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
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lightbulb className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          Analysen returnerade inga förslag
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Det finns alltid utrymme att förbättra en text. Prova att regenerera med mer specifik information i formuläret.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border border-warning rounded-xl shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-warning bg-warning-bg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Expertfeedback
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalCount} {totalCount === 1 ? 'förbättring' : 'förbättringar'} hittade
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Kvalitet: {analysis.overallQuality}/10
          </Badge>
        </div>
      </div>

      {/* Feedback list */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
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
              <AccordionItem key={category} value={category} className="border-b border-border">
                <AccordionTrigger className="px-4 py-3 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-foreground">
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
                      const variants = SEVERITY_VARIANTS[item.severity];

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "rounded-lg border transition-all hover:shadow-md cursor-pointer",
                            variants.container
                          )}
                          onClick={() => handleFeedbackClick(item.id)}
                        >
                          {/* Feedback header */}
                          <div className={cn("px-3 py-2 border-b", variants.container)}>
                            <div className="flex items-start gap-2">
                              <SeverityIcon
                                className={cn("w-4 h-4 flex-shrink-0 mt-0.5", variants.icon)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span
                                    className={cn(
                                      "text-xs font-bold uppercase tracking-wider",
                                      variants.text
                                    )}
                                  >
                                    {SEVERITY_LABELS[item.severity]}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                                      variants.badge
                                    )}
                                  >
                                    {item.expert === 'broker' ? 'Mäklare' : 'Jurist'}
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-foreground leading-snug">
                                  {item.issue}
                                </p>
                                {item.location && (
                                  <p className="text-xs text-muted-foreground mt-1">
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
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Förslag
                              </p>
                              <p className="text-xs text-foreground leading-relaxed">
                                {item.suggestion}
                              </p>
                            </div>

                            {/* Auto-fix preview */}
                            {item.autoFix && (
                              <div className="rounded-md px-2 py-1.5 bg-card border border-border">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                  Automatisk fix
                                </p>
                                <p className="text-xs font-mono text-foreground leading-relaxed">
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
                                  className="flex-1 text-xs h-7 bg-primary text-primary-foreground hover:bg-primary-hover"
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
    </div>

      {/* Footer with legal check */}
      {analysis.legalCheck && (
        <div className="px-4 py-3 border-t border-warning bg-warning-bg">
          <div className="flex items-start gap-2">
            <Scale className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                Juridisk kontroll: {analysis.legalCheck.compliant ? '✓ Godkänd' : '⚠ Granskning krävs'}
              </p>
              {analysis.legalCheck.notes && (
                <p className="text-xs text-muted-foreground mt-1">
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
