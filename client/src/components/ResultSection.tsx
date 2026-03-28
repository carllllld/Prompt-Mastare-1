import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, FileText, Share2, RefreshCw, AlertTriangle, AlertCircle, Lightbulb, ShieldCheck, ShieldAlert, Star, BarChart3, Type, Instagram, Mail, Megaphone, Loader2, Sparkles, Edit3, Info } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { type OptimizeResponse } from "@shared/schema";
import { TextEditor } from "./TextEditor";
import { PdfExport } from "./PdfExport";
import { InlineHighlights } from "./InlineHighlights";
import { ExpertFeedbackPanel } from "./ExpertFeedbackPanel";
import { VitecExportButton } from "./VitecExportButton";
import { LockedFeature } from "./LockedFeature";
import { useOneClickFix } from "@/hooks/use-one-click-fix";
import { useToast } from "@/hooks/use-toast";

interface ResultSectionProps {
  result: OptimizeResponse;
  onNewPrompt: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  propertyData?: Record<string, any>;
  vitecObjectId?: string;
  isPro?: boolean;
}

function CopyCard({ title, icon: Icon, text, iconColor, delayClass }: {
  title: string;
  icon: any;
  text: string;
  iconColor: string;
  delayClass?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Map icon colors to Tailwind classes
  const iconColorClass = {
    "#D4AF37": "text-yellow-600",
    "#E1306C": "text-pink-600",
    "#2563EB": "text-blue-600",
    "#7C3AED": "text-purple-600",
    "#9CA3AF": "text-gray-400",
  }[iconColor] || "text-gray-600";
  
  return (
    <div className={`rounded-xl border border-card-border shadow-md overflow-hidden animate-slide-up ${delayClass || ''}`}>
      <div className="px-5 py-3 bg-muted border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${iconColorClass}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={copy}
          className="h-7 px-2"
          title="Kopiera text"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
      <div className="p-6 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
        {text}
      </div>
    </div>
  );
}

function CopyAllButton({ result }: { result: OptimizeResponse }) {
  const [copied, setCopied] = useState(false);
  const copyAll = () => {
    const parts: string[] = [];
    if (result.headline) parts.push(`RUBRIK:\n${result.headline}`);
    parts.push(`OBJEKTBESKRIVNING:\n${result.improvedPrompt}`);
    if (result.instagramCaption) parts.push(`SOCIALT INLÄGG:\n${result.instagramCaption}`);
    if (result.showingInvitation) parts.push(`VISNINGSINBJUDAN:\n${result.showingInvitation}`);
    if (result.shortAd) parts.push(`KORTANNONS:\n${result.shortAd}`);
    if (result.socialCopy) parts.push(`SOCIAL MEDIA:\n${result.socialCopy}`);
    navigator.clipboard.writeText(parts.join("\n\n─────────────────────\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <Button
      variant="outline"
      onClick={copyAll}
      className={`w-full h-10 text-sm font-medium transition-all animate-slide-up ${
        copied ? "border-success bg-success-bg text-success" : ""
      }`}
    >
      {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
      {copied ? "Alla texter kopierade!" : "Kopiera alla texter"}
    </Button>
  );
}

export function ResultSection({ result, onNewPrompt, onRegenerate, isRegenerating, propertyData, vitecObjectId, isPro = false }: ResultSectionProps) {
  const [copiedMain, setCopiedMain] = useState(false);
  const [editedText, setEditedText] = useState(result.improvedPrompt);
  const [activeFeedback, setActiveFeedback] = useState<string[]>([]);
  const { toast } = useToast();

  // OneClickFix hook for applying automatic fixes
  const { applyFix, undo, canUndo } = useOneClickFix({
    onFixApplied: (feedbackId, newText) => {
      setEditedText(newText);
      setActiveFeedback(prev => prev.filter(id => id !== feedbackId));
      toast({
        title: "Fix applicerad",
        description: "Texten har uppdaterats automatiskt",
      });
    },
    onError: (error) => {
      toast({
        title: "Kunde inte applicera fix",
        description: error,
        variant: "destructive",
      });
    }
  });

  // Extract expertAnalysis from result (properly typed in schema)
  const expertAnalysis = result.expertAnalysis || null;
  
  // Debug logging
  useEffect(() => {
    console.log('[ResultSection] expertAnalysis:', expertAnalysis);
    console.log('[ResultSection] improvements count:', expertAnalysis?.improvements?.length || 0);
  }, [expertAnalysis]);

  // Sync editedText when result changes (e.g. regenerate)
  useEffect(() => {
    setEditedText(result.improvedPrompt);
    setActiveFeedback([]);
  }, [result.improvedPrompt]);

  // Handle feedback item click (scroll to text span)
  const handleFeedbackClick = useCallback((feedbackId: string) => {
    // Find the feedback item
    const feedback = expertAnalysis?.improvements?.find((f: any) => f.id === feedbackId);
    if (!feedback?.textSpan) return;

    // Scroll to the text span (simplified - in production would need more sophisticated scrolling)
    console.log('[ResultSection] Feedback clicked:', feedbackId, feedback);
    
    // Highlight the feedback temporarily
    setActiveFeedback(prev => [...prev, feedbackId]);
    setTimeout(() => {
      setActiveFeedback(prev => prev.filter(id => id !== feedbackId));
    }, 3000);
  }, [expertAnalysis]);

  // Handle fix button click
  const handleFixClick = useCallback((feedbackId: string) => {
    const feedback = expertAnalysis?.improvements?.find((f: any) => f.id === feedbackId);
    if (!feedback) return;

    const result = applyFix(editedText, feedback, 'improvedPrompt');
    if (result.success && result.newText) {
      setEditedText(result.newText);
    }
  }, [expertAnalysis, editedText, applyFix]);

  // Handle AI suggest button click
  const handleAISuggestClick = useCallback(async (feedbackId: string) => {
    const feedback = expertAnalysis?.improvements?.find((f: any) => f.id === feedbackId);
    if (!feedback?.textSpan) return;

    const { start, end } = feedback.textSpan;
    const selectedText = editedText.slice(start, end);

    try {
      const response = await fetch("/api/selection-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          selectedText,
          fullContext: editedText,
          field: 'improvedPrompt',
          style: 'balanced',
          platform: 'hemnet'
        }),
      });

      if (!response.ok) throw new Error("AI-förbättring misslyckades");
      const data = await response.json();

      if (data.suggestions && data.suggestions.length > 0) {
        toast({
          title: "AI-förslag",
          description: `${data.suggestions.length} alternativ genererade`,
        });
        // In production, would show suggestions in a dialog
        console.log('[ResultSection] AI suggestions:', data.suggestions);
      }
    } catch (err) {
      console.error("AI suggest error:", err);
      toast({
        title: "Fel",
        description: "Kunde inte generera AI-förslag",
        variant: "destructive",
      });
    }
  }, [expertAnalysis, editedText, toast]);

  // Handle dismiss button click
  const handleDismissClick = useCallback((feedbackId: string) => {
    setActiveFeedback(prev => prev.filter(id => id !== feedbackId));
    toast({
      title: "Feedback avvisad",
      description: "Feedbacken har tagits bort",
    });
  }, [toast]);

  // Handle undo keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        const result = undo();
        if (result.success && result.text) {
          setEditedText(result.text);
          toast({
            title: "Ångrad",
            description: "Senaste ändringen har ångrats",
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, undo, toast]);

  // Build a live result object that reflects edits for PDF export
  const liveResult = { ...result, improvedPrompt: editedText };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMain(true);
    setTimeout(() => setCopiedMain(false), 2000);
  };

  const wordCount = result.wordCount || result.improvedPrompt.split(/\s+/).filter(Boolean).length;
  const qualityScore = result.factCheck?.quality_score;
  const factPassed = result.factCheck?.fact_check_passed;
  const localTextClear = result.factCheck?.local_text_clear;
  const factCheckExecuted = result.factCheck?.executed;
  const factCheckMatchesFinalText = result.factCheck?.metadata_matches_final_text;
  const pipelineWarnings = Array.isArray(result.pipelineWarnings) ? result.pipelineWarnings : [];
  const brokerImprovementSuggestions = Array.isArray(result.broker_improvement_suggestions)
    ? result.broker_improvement_suggestions
    : (Array.isArray(result.broker_audit?.issues) ? result.broker_audit.issues : []);
  const isFailSafeDelivery = result.fail_safe_delivery === true;
  const realismScorecard = result.broker_realism_scorecard;
  const blueprintCoverage = result.blueprint_coverage;
  const inputSignalCoverage = result.input_signal_coverage;

  const hasExtraTexts = result.headline || result.instagramCaption || result.showingInvitation || result.shortAd;

  return (
    <div className="space-y-4 pb-12">

      {/* ── TEXTKIT HEADER ── */}
      {hasExtraTexts && (
        <div className="flex items-center gap-2 animate-slide-up">
          <div className="w-2 h-2 rounded-full bg-success" />
          <Badge variant="success" size="sm" className="uppercase tracking-wider">
            Komplett textpaket — alla format genererade
          </Badge>
        </div>
      )}

      {/* ── STATUS BAR ── */}
      <div className="pro-muted-panel px-3 py-3 animate-slide-up">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Snabbstatus</p>
        <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" size="sm" className="gap-1.5">
          <BarChart3 className="w-3 h-3" />
          {wordCount} ord
        </Badge>
        <Badge variant="success" size="sm" className="gap-1.5">
          <Sparkles className="w-3 h-3" />
          GPT-5.2
        </Badge>
        {qualityScore != null && (
          <Badge 
            variant={qualityScore >= 0.8 ? "success" : qualityScore >= 0.6 ? "warning" : "error"}
            size="sm" 
            className="gap-1.5"
          >
            <Star className="w-3 h-3" />
            Kvalitet: {Math.round(qualityScore * 100)}%
          </Badge>
        )}
        {factPassed != null && (
          <Badge 
            variant={factPassed ? "success" : "error"}
            size="sm" 
            className="gap-1.5"
          >
            {factPassed ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            {factPassed ? "Faktagranskad" : "Fakta-problem"}
          </Badge>
        )}
        {factPassed == null && localTextClear != null && (
          <Badge 
            variant={localTextClear ? "outline" : "error"}
            size="sm" 
            className="gap-1.5"
          >
            {localTextClear ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            {localTextClear ? "Lokalt kvalitetskontrollerad" : "Kvarvarande textproblem"}
          </Badge>
        )}
        {isFailSafeDelivery && (
          <Badge variant="warning" size="sm" className="gap-1.5">
            <AlertCircle className="w-3 h-3" />
            Fail-safe leverans
          </Badge>
        )}
        </div>
      </div>

      {isFailSafeDelivery && (
        <div className="rounded-xl border border-warning bg-warning-bg p-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs font-semibold uppercase tracking-wider text-warning">
              Levererad via säker fallback
            </span>
          </div>
          <p className="text-xs text-warning-foreground">
            Du fick bästa tillgängliga objektbeskrivning även om ett sent kvalitetssteg underkände körningen.
            {result.fail_safe_stage ? ` Källa: ${result.fail_safe_stage}.` : ""}
          </p>
        </div>
      )}

      {realismScorecard && (
        <div className="rounded-xl border border-info bg-info-bg p-5 animate-slide-up">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-info" />
              <span className="text-xs font-semibold uppercase tracking-wider text-info">
                Mäklar-realism scorecard
              </span>
            </div>
            <Badge variant="outline" size="sm" className="bg-info/10 text-info border-info/20">
              {realismScorecard.overall}/100 · {realismScorecard.grade}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            {[
              ["Evidens", realismScorecard.dimensions.evidens],
              ["Struktur", realismScorecard.dimensions.struktur],
              ["Språk", realismScorecard.dimensions.sprakNaturlighet],
              ["Målgrupp", realismScorecard.dimensions.malgruppstraff],
              ["Redo", realismScorecard.dimensions.marknadsredo],
            ].map(([label, score]) => (
              <div key={String(label)} className="rounded-lg px-2.5 py-2 border border-info/20 bg-background">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-xs font-semibold mt-0.5 text-info">{Number(score)}/100</p>
              </div>
            ))}
          </div>
          {realismScorecard.improvements.length > 0 && (
            <ul className="space-y-1.5">
              {realismScorecard.improvements.map((item, i) => (
                <li key={i} className="text-xs flex gap-2 text-info">
                  <span className="text-info/70">•</span> {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {blueprintCoverage && blueprintCoverage.required > 0 && (
        <div className="rounded-xl border border-warning bg-warning-bg p-5 animate-slide-up">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs font-semibold uppercase tracking-wider text-warning">
                Faktatäckning mot skrivplan
              </span>
            </div>
            <Badge variant="warning" size="sm">
              {blueprintCoverage.matched}/{blueprintCoverage.required}
            </Badge>
          </div>
          <p className="text-xs text-warning-foreground">
            {Math.round((blueprintCoverage.ratio || 0) * 100)}% av prioriterade fakta hittades tydligt i sluttexten.
          </p>
        </div>
      )}

      {inputSignalCoverage && inputSignalCoverage.totalSignals > 0 && (
        <div className="rounded-xl border border-border bg-muted p-5 animate-slide-up">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Input-signaltäckning
              </span>
            </div>
            <Badge variant="outline" size="sm">
              {inputSignalCoverage.usedSignals}/{inputSignalCoverage.totalSignals}
            </Badge>
          </div>
          <p className="text-xs mb-2 text-muted-foreground">
            {Math.round((inputSignalCoverage.ratio || 0) * 100)}% av identifierade informationssignaler från underlaget återfinns i sluttexten.
          </p>
          <div className="flex flex-wrap gap-2">
            {inputSignalCoverage.critical.slice(0, 6).map((signal, index) => (
              <Badge
                key={`${signal.path}-${index}`}
                variant={signal.used ? "success" : "error"}
                size="sm"
              >
                {signal.used ? "✓" : "!"} {signal.path}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* ── KOPIERA ALLT ── */}
      {hasExtraTexts && (
        <CopyAllButton result={liveResult} />
      )}

      <div className="rounded-xl border border-muted bg-muted/50 p-4 sm:p-5 animate-slide-up animate-delay-40">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-success-bg text-success">
            <Edit3 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">AI-redigera texten efteråt</span>
              <Badge variant="success" size="sm">
                Markera text i beskrivningen
              </Badge>
            </div>
            <p className="text-xs mt-1.5 text-muted-foreground">
              Du kan markera valfri mening eller stycke i objektbeskrivningen och låta AI:n skriva om just den delen.
            </p>
          </div>
        </div>
      </div>

      {/* ── HIGHLIGHTS ── */}
      {result.highlights && result.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-slide-up animate-delay-100">
          {result.highlights.map((h, i) => (
            <Badge key={i} variant="success" size="sm">
              {h}
            </Badge>
          ))}
        </div>
      )}

      {/* ── 1. RUBRIK ── */}
      {result.headline && (
        <CopyCard title="Rubrik" icon={Type} text={result.headline} iconColor="#D4AF37" delayClass="animate-delay-30" />
      )}

      {/* ── 2. OBJEKTBESKRIVNING (editable with inline highlights) ── */}
      <div className="rounded-xl border border-card-border shadow-md overflow-hidden animate-slide-up animate-delay-60">
        <div className="px-6 py-4 bg-muted border-b border-border flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-success" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Objektbeskrivning
            </span>
            <Badge variant="success" size="sm" className="gap-1">
              <Edit3 className="w-3 h-3" />
            </Badge>
            {expertAnalysis && expertAnalysis.improvements && expertAnalysis.improvements.length > 0 && (
              <Badge variant="warning" size="sm" className="gap-1">
                <Lightbulb className="w-3 h-3" />
                {expertAnalysis.improvements.length} förbättringar
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PdfExport result={liveResult} />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => copyToClipboard(editedText)}
              className={`h-8 text-xs font-medium transition-shadow ${
                copiedMain ? "text-success" : ""
              }`}
            >
              {copiedMain ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copiedMain ? "Kopierad!" : "Kopiera text"}
            </Button>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="mb-4 rounded-lg border border-border bg-muted/50 px-3.5 py-3 flex items-start gap-2.5 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            <div>
              <p className="font-medium text-foreground">Direktredigering + AI-redigering + Expertfeedback</p>
              <p className="mt-1">Skriv direkt i texten, markera för AI-hjälp, eller klicka på färgade markeringar för expertförslag. Alla ändringar följer med i kopiering och PDF-export.</p>
            </div>
          </div>

          {/* Show InlineHighlights if expertAnalysis is available */}
          {isPro ? (
            expertAnalysis && expertAnalysis.improvements && expertAnalysis.improvements.length > 0 ? (
              <div className="mb-4 rounded-lg border border-border bg-background p-4 space-y-4">
                <div className="text-base leading-relaxed text-foreground font-serif">
                  <InlineHighlights
                    text={editedText}
                    feedback={expertAnalysis.improvements}
                    field="improvedPrompt"
                    onFixClick={handleFixClick}
                    onTextChange={setEditedText}
                  />
                </div>
              </div>
            ) : (
              <TextEditor text={editedText} onTextChange={setEditedText} />
            )
          ) : (
            <LockedFeature requiredPlan="pro" featureName="Textredigering" currentPlan="free">
              <TextEditor text={editedText} onTextChange={() => {}} />
            </LockedFeature>
          )}
        </div>
      </div>

      {/* ── EXPERT FEEDBACK PANEL ── */}
      {expertAnalysis && (
        <div className="animate-slide-up animate-delay-90">
          <ExpertFeedbackPanel
            analysis={expertAnalysis}
            onFeedbackClick={handleFeedbackClick}
            onFixClick={handleFixClick}
            onAISuggestClick={handleAISuggestClick}
            onDismissClick={handleDismissClick}
          />
        </div>
      )}

      {/* ── 3. SOCIALT INLÄGG ── */}
      {result.instagramCaption && (
        <CopyCard title="Socialt inlägg" icon={Instagram} text={result.instagramCaption} iconColor="#E1306C" delayClass="animate-delay-120" />
      )}

      {/* ── 4. VISNINGSINBJUDAN ── */}
      {result.showingInvitation && (
        <CopyCard title="Visningsinbjudan" icon={Mail} text={result.showingInvitation} iconColor="#2563EB" delayClass="animate-delay-150" />
      )}

      {/* ── 5. KORTANNONS ── */}
      {result.shortAd && (
        <CopyCard title="Kortannons" icon={Megaphone} text={result.shortAd} iconColor="#7C3AED" delayClass="animate-delay-180" />
      )}

      {/* ── SOCIAL MEDIA (legacy / extra) ── */}
      {result.socialCopy && !result.instagramCaption && (
        <CopyCard title="Social text" icon={Share2} text={result.socialCopy} iconColor="#9CA3AF" delayClass="animate-delay-200" />
      )}

      {/* ── FACT CHECK ISSUES ── */}
      {result.factCheck?.issues && result.factCheck.issues.length > 0 && (
        <div className="rounded-xl border border-error bg-error-bg p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-error" />
            <span className="text-xs font-semibold uppercase tracking-wider text-error">
              {factCheckExecuted && factCheckMatchesFinalText ? "Faktagranskning — problem hittade" : "Kvalitetskontroll — problem hittade"}
            </span>
          </div>
          <ul className="space-y-2">
            {result.factCheck.issues.map((issue, i) => (
              <li key={i} className="text-xs text-error-foreground">
                <span className="font-medium">{issue.quote}</span>
                {issue.reason && <span className="ml-1">— {issue.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pipelineWarnings.length > 0 && (
        <div className="rounded-xl border border-warning bg-warning-bg p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs font-semibold uppercase tracking-wider text-warning">
              Pipeline-varningar
            </span>
          </div>
          <ul className="space-y-1.5">
            {pipelineWarnings.map((warning, i) => (
              <li key={i} className="text-xs flex gap-2 text-warning-foreground">
                <span className="text-warning">!</span> {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── INFO CARDS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up animate-delay-250">
        {result.improvements && result.improvements.length > 0 && (
          <div className="rounded-xl border border-warning bg-warning-bg p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs font-semibold uppercase tracking-wider text-warning">Saknad information</span>
            </div>
            <p className="text-xs mb-2 text-warning-foreground">Lägg till dessa uppgifter för en bättre text:</p>
            <ul className="space-y-1.5">
              {result.improvements.map((s, i) => (
                <li key={i} className="text-xs flex gap-2 text-warning-foreground">
                  <span className="text-warning">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.suggestions && result.suggestions.length > 0 && (
          <div className="rounded-xl border border-info bg-info-bg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-3.5 h-3.5 text-info" />
              <span className="text-xs font-semibold uppercase tracking-wider text-info">Tips från AI:n</span>
            </div>
            <ul className="space-y-1.5">
              {result.suggestions.map((s, i) => (
                <li key={i} className="text-xs flex gap-2 text-info">
                  <span className="text-info/70">→</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.factCheck?.broker_tips && result.factCheck.broker_tips.length > 0 && (
          <div className="rounded-xl border border-success bg-success-bg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-3.5 h-3.5 text-success" />
              <span className="text-xs font-semibold uppercase tracking-wider text-success">Texttips</span>
            </div>
            <ul className="space-y-1.5">
              {result.factCheck.broker_tips.map((tip, i) => (
                <li key={i} className="text-xs flex gap-2 text-success">
                  <span className="text-success/70">✓</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {brokerImprovementSuggestions.length > 0 && (
          <div className="rounded-xl border border-info bg-info-bg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-3.5 h-3.5 text-info" />
              <span className="text-xs font-semibold uppercase tracking-wider text-info">Mäklarens förbättringsfokus</span>
            </div>
            <ul className="space-y-1.5">
              {brokerImprovementSuggestions.map((tip, i) => (
                <li key={i} className="text-xs flex gap-2 text-info">
                  <span className="text-info/70">→</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.improvement_suggestions?.strengths && result.improvement_suggestions.strengths.length > 0 && (
          <div className="border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">Styrkor i texten</span>
            </div>
            <ul className="space-y-1.5">
              {result.improvement_suggestions.strengths.map((s, i) => (
                <li key={i} className="text-xs flex gap-2 text-purple-800">
                  <span className="text-purple-500">★</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.improvement_suggestions?.text_improvements && result.improvement_suggestions.text_improvements.length > 0 && (
          <div className="rounded-xl border border-warning bg-warning-bg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs font-semibold uppercase tracking-wider text-warning">Textförbättringar</span>
            </div>
            <ul className="space-y-1.5">
              {result.improvement_suggestions.text_improvements.map((s, i) => (
                <li key={i} className="text-xs flex gap-2 text-warning-foreground">
                  <span className="text-warning">→</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── DISCLAIMER ── */}
      <p className="text-xs text-center text-muted-foreground">
        AI-analyser avser textkvalitet. Kontrollera alltid fakta före publicering.
      </p>

      {/* ── ACTION BUTTONS ── */}
      <div className="flex gap-3 pt-2 border-t border-border flex-wrap">
        {vitecObjectId && propertyData && (
          <VitecExportButton
            propertyData={propertyData}
            generatedText={editedText}
            vitecObjectId={vitecObjectId}
          />
        )}
        {onRegenerate && (
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className={`flex-1 text-sm font-medium transition-colors ${
              isRegenerating ? "text-muted-foreground" : "border-success text-success hover:bg-success-bg"
            }`}
          >
            {isRegenerating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
            {isRegenerating ? "Genererar..." : "Generera igen"}
          </Button>
        )}
        <Button
          onClick={onNewPrompt}
          variant="outline"
          className="flex-1 text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Ny beskrivning
        </Button>
      </div>
    </div>
  );
}
