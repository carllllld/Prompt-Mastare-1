import { useState, useMemo, useEffect } from "react";
import { AlertCircle, AlertTriangle, Lightbulb, Scale, FileText, User, Briefcase, Wand2, Sparkles, X, Check } from "lucide-react";
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
  onFixAllClick?: (feedbackIds: string[]) => void;
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

// Category labels with explanations
const CATEGORY_LABELS = {
  grammar: 'Grammatik',
  style: 'AI-klyschor',
  legal: 'Juridik',
  broker_realism: 'Konkrethet',
  clarity: 'Tydlighet',
};

const CATEGORY_EXPLANATIONS = {
  grammar: 'Stavfel, kommatecken, meningsbyggnad',
  style: 'Generiska fraser som gör texten oprofessionell',
  legal: 'Hemnet-regler, vilseledande påståenden',
  broker_realism: 'Vaga påståenden som behöver bevis',
  clarity: 'Svåra meningar, otydliga referenser',
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
  onFixAllClick,
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

  // Find similar issues (same issue text, different locations)
  const similarIssues = useMemo(() => {
    const issueMap = new Map<string, FeedbackItem[]>();
    
    analysis.improvements.forEach(item => {
      // Normalize issue text for comparison (remove quotes and extra spaces)
      const normalizedIssue = item.issue.toLowerCase().replace(/["']/g, '').trim();
      
      if (!issueMap.has(normalizedIssue)) {
        issueMap.set(normalizedIssue, []);
      }
      issueMap.get(normalizedIssue)!.push(item);
    });

    // Filter to only issues that appear multiple times
    const similar = new Map<string, FeedbackItem[]>();
    issueMap.forEach((items, issue) => {
      if (items.length > 1) {
        similar.set(issue, items);
      }
    });

    return similar;
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

  // Handle fix all button click
  const handleFixAllClick = (e: React.MouseEvent, feedbackIds: string[]) => {
    e.stopPropagation();
    if (onFixAllClick) {
      onFixAllClick(feedbackIds);
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

  // Show strengths section if available
  const hasStrengths = analysis.strengths && analysis.strengths.length > 0;

  // Extract Hemnet rule violations (critical legal issues)
  const hemnetViolations = useMemo(() => {
    return analysis.improvements.filter(item => 
      item.severity === 'critical' && 
      item.category === 'legal' &&
      (item.issue.toLowerCase().includes('hemnet') || 
       item.issue.toLowerCase().includes('pris i objekt') ||
       item.issue.toLowerCase().includes('avgift i objekt') ||
       item.issue.toLowerCase().includes('kontaktuppgifter'))
    );
  }, [analysis.improvements]);

  // Extract legal guidance (important legal warnings)
  const legalGuidance = useMemo(() => {
    return analysis.improvements.filter(item => 
      item.category === 'legal' &&
      (item.issue.toLowerCase().includes('juridisk risk') ||
       item.issue.toLowerCase().includes('overifierbar') ||
       item.issue.toLowerCase().includes('vilseledande'))
    );
  }, [analysis.improvements]);

  // Extract missing details (critical clarity issues)
  const missingDetails = useMemo(() => {
    return analysis.improvements.filter(item => 
      item.severity === 'critical' && 
      item.category === 'clarity' &&
      (item.issue.toLowerCase().includes('saknar kök') ||
       item.issue.toLowerCase().includes('saknar badrum') ||
       item.issue.toLowerCase().includes('saknar läge'))
    );
  }, [analysis.improvements]);

  // If no feedback, show empty state
  if (totalCount === 0 && !hasStrengths) {
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
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-xs">
              Kvalitet: {analysis.overallQuality}/10
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {analysis.overallQuality >= 9 ? 'Excellent' : 
               analysis.overallQuality >= 7 ? 'Bra' : 
               analysis.overallQuality >= 5 ? 'Okej' : 'Behöver förbättras'}
            </span>
          </div>
        </div>
      </div>

      {/* Hemnet rule violations - Critical section */}
      {hemnetViolations.length > 0 && (
        <div className="px-4 py-3 border-b border-error bg-error-bg">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-error mb-1">
                KRITISKT! Hemnet-regelbrott ({hemnetViolations.length})
              </h4>
              <p className="text-xs text-error mb-2">
                Hemnet kan ta bort din annons om dessa inte åtgärdas
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {hemnetViolations.map((violation, idx) => (
              <li key={idx} className="text-xs text-error-foreground bg-white rounded-md p-2 border border-error">
                <div className="font-medium mb-1">{violation.issue}</div>
                <div className="text-muted-foreground">{violation.suggestion}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legal guidance - Important section */}
      {legalGuidance.length > 0 && (
        <div className="px-4 py-3 border-b border-warning bg-amber-50">
          <div className="flex items-start gap-2 mb-2">
            <Scale className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">
                ⚖️ Juridisk vägledning ({legalGuidance.length})
              </h4>
              <p className="text-xs text-amber-800 mb-2">
                Dessa påståenden kan leda till reklamation eller anses vilseledande
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {legalGuidance.map((guidance, idx) => (
              <li key={idx} className="text-xs text-amber-900 bg-white rounded-md p-3 border border-amber-300">
                <div className="font-medium mb-1 flex items-start gap-2">
                  <span className="text-amber-600">⚠️</span>
                  <span>{guidance.issue}</span>
                </div>
                <div className="text-amber-700 ml-5 mt-1">
                  <span className="font-medium">Lösning:</span> {guidance.suggestion}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-amber-700 flex items-start gap-2">
            <Scale className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p>
              <span className="font-medium">Juridisk säkerhet:</span> Dessa rekommendationer hjälper dig undvika reklamationer och vilseledande marknadsföring enligt konsumentköplagen.
            </p>
          </div>
        </div>
      )}

      {/* Missing details - Critical section */}
      {missingDetails.length > 0 && (
        <div className="px-4 py-3 border-b border-warning bg-warning-bg">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-warning-foreground mb-1">
                Saknade kritiska detaljer ({missingDetails.length})
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Dessa detaljer är obligatoriska för en komplett annons
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {missingDetails.map((detail, idx) => (
              <li key={idx} className="text-xs text-foreground bg-white rounded-md p-2 border border-warning">
                <div className="font-medium mb-1">{detail.issue}</div>
                <div className="text-muted-foreground">{detail.suggestion}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strengths section */}
      {hasStrengths && (
        <div className="px-4 py-3 border-b border-border bg-green-50">
          <div className="flex items-start gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <h4 className="text-xs font-semibold text-green-900">
              Styrkor (behåll dessa!)
            </h4>
          </div>
          <ul className="space-y-1.5">
            {analysis.strengths.map((strength, idx) => (
              <li key={idx} className="text-xs text-green-800 flex items-start gap-2">
                <span className="text-green-600 flex-shrink-0">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {CATEGORY_EXPLANATIONS[category as keyof typeof CATEGORY_EXPLANATIONS]}
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
                      
                      // Check if this issue has similar occurrences
                      const normalizedIssue = item.issue.toLowerCase().replace(/["']/g, '').trim();
                      const similarItems = similarIssues.get(normalizedIssue) || [];
                      const hasSimilar = similarItems.length > 1;
                      const allActionable = hasSimilar && similarItems.every(i => i.actionable);

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
                              {hasSimilar && allActionable && onFixAllClick && (
                                <Button
                                  size="sm"
                                  onClick={(e) => handleFixAllClick(e, similarItems.map(i => i.id))}
                                  className="flex-1 text-xs h-7 bg-primary text-primary-foreground hover:bg-primary-hover"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  Fixa alla ({similarItems.length})
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

      {/* Footer with legal check and benchmark */}
      {analysis.legalCheck && (
        <div className="border-t border-warning">
          {/* Legal check */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
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

          {/* Benchmark comparison */}
          <div className="px-4 py-3 bg-blue-50">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-blue-900 mb-1">
                  📊 Jämförelse med toppannonser
                </h4>
              </div>
            </div>
            
            {/* Quality comparison */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-800">Din kvalitet:</span>
                <span className="font-semibold text-blue-900">{analysis.overallQuality}/10</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-700">Genomsnitt Hemnet:</span>
                <span className="text-blue-800">6/10</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-700">Toppannonser (top 10%):</span>
                <span className="text-blue-800">9-10/10</span>
              </div>
            </div>

            {/* Progress to top */}
            {analysis.overallQuality < 9 && (
              <div className="mt-3 p-2 bg-white rounded-md border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-2">
                  💡 För att nå toppnivå (9/10):
                </p>
                <ul className="space-y-1 text-xs text-blue-800">
                  {analysis.improvements.filter(i => i.severity === 'critical').length > 0 && (
                    <li>• Fixa {analysis.improvements.filter(i => i.severity === 'critical').length} kritiska problem</li>
                  )}
                  {analysis.improvements.filter(i => i.category === 'style').length > 0 && (
                    <li>• Ta bort {analysis.improvements.filter(i => i.category === 'style').length} AI-klyschor</li>
                  )}
                  {missingDetails.length > 0 && (
                    <li>• Lägg till {missingDetails.length} saknade detaljer</li>
                  )}
                  {analysis.strengths.length < 5 && (
                    <li>• Lägg till fler konkreta detaljer (renoveringsår, varumärken, mått)</li>
                  )}
                </ul>
              </div>
            )}

            {/* Top tier message */}
            {analysis.overallQuality >= 9 && (
              <div className="mt-3 p-2 bg-green-50 rounded-md border border-green-200">
                <p className="text-xs font-medium text-green-900 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Grattis! Din text är på toppnivå (top 10% på Hemnet)
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
