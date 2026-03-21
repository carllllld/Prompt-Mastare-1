import { Button } from "@/components/ui/button";
import { Check, Copy, FileText, Share2, RefreshCw, AlertTriangle, AlertCircle, Lightbulb, ShieldCheck, ShieldAlert, Star, BarChart3, Type, Instagram, Mail, Megaphone, Loader2, Sparkles, Edit3, Info } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { type OptimizeResponse } from "@shared/schema";
import { TextEditor } from "./TextEditor";
import { PdfExport } from "./PdfExport";
import { InlineHighlights } from "./InlineHighlights";
import { ExpertFeedbackPanel } from "./ExpertFeedbackPanel";
import { useOneClickFix } from "@/hooks/use-one-click-fix";
import { useToast } from "@/hooks/use-toast";

interface ResultSectionProps {
  result: OptimizeResponse;
  onNewPrompt: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

function CopyCard({ title, icon: Icon, text, iconColor, delay }: {
  title: string;
  icon: any;
  text: string;
  iconColor: string;
  delay: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="pro-card pro-card-premium rounded-xl border overflow-hidden animate-slide-up" style={{ borderColor: "#E8E5DE", animationDelay: delay }}>
      <div className="px-5 py-3 border-b flex justify-between items-center" style={{ borderColor: "#E8E5DE" }}>
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>{title}</span>
        </div>
        <button
          onClick={copy}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Kopiera text"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" style={{ color: "#2D6A4F" }} />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
          )}
        </button>
      </div>
      <div className="p-5 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#4B5563" }}>
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
      className="w-full h-10 text-sm font-medium transition-all animate-slide-up"
      style={{
        borderColor: copied ? "#2D6A4F" : "#E8E5DE",
        background: copied ? "#ECFDF5" : "#FAFAF7",
        color: copied ? "#2D6A4F" : "#374151",
      }}
    >
      {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
      {copied ? "Alla texter kopierade!" : "Kopiera alla texter"}
    </Button>
  );
}

export function ResultSection({ result, onNewPrompt, onRegenerate, isRegenerating }: ResultSectionProps) {
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
          <div className="w-2 h-2 rounded-full" style={{ background: "#2D6A4F" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#2D6A4F" }}>
            Komplett textpaket — alla format genererade
          </span>
        </div>
      )}

      {/* ── STATUS BAR ── */}
      <div className="pro-muted-panel px-3 py-3 animate-slide-up">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Snabbstatus</p>
        <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "#F0EDE6", color: "#4B5563" }}>
          <BarChart3 className="w-3 h-3" />
          {wordCount} ord
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "#E8F5E9", color: "#2D6A4F" }}>
          <Sparkles className="w-3 h-3" />
          GPT-5.2
        </div>
        {qualityScore != null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: qualityScore >= 0.8 ? "#ECFDF5" : qualityScore >= 0.6 ? "#FFFBEB" : "#FEF2F2",
              color: qualityScore >= 0.8 ? "#065F46" : qualityScore >= 0.6 ? "#92400E" : "#991B1B",
            }}>
            <Star className="w-3 h-3" />
            Kvalitet: {Math.round(qualityScore * 100)}%
          </div>
        )}
        {factPassed != null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: factPassed ? "#ECFDF5" : "#FEF2F2", color: factPassed ? "#065F46" : "#991B1B" }}>
            {factPassed ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            {factPassed ? "Faktagranskad" : "Fakta-problem"}
          </div>
        )}
        {factPassed == null && localTextClear != null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: localTextClear ? "#F3F4F6" : "#FEF2F2", color: localTextClear ? "#4B5563" : "#991B1B" }}>
            {localTextClear ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            {localTextClear ? "Lokalt kvalitetskontrollerad" : "Kvarvarande textproblem"}
          </div>
        )}
        {isFailSafeDelivery && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "#FFF7ED", color: "#9A3412" }}>
            <AlertCircle className="w-3 h-3" />
            Fail-safe leverans
          </div>
        )}
        </div>
      </div>

      {isFailSafeDelivery && (
        <div className="rounded-xl border p-5 animate-slide-up" style={{ background: "#FFF7ED", borderColor: "#FED7AA" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-3.5 h-3.5" style={{ color: "#C2410C" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9A3412" }}>
              Levererad via säker fallback
            </span>
          </div>
          <p className="text-xs" style={{ color: "#7C2D12" }}>
            Du fick bästa tillgängliga objektbeskrivning även om ett sent kvalitetssteg underkände körningen.
            {result.fail_safe_stage ? ` Källa: ${result.fail_safe_stage}.` : ""}
          </p>
        </div>
      )}

      {realismScorecard && (
        <div className="rounded-xl border p-5 animate-slide-up" style={{ background: "#F0F9FF", borderColor: "#BAE6FD" }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5" style={{ color: "#0369A1" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#0C4A6E" }}>
                Mäklar-realism scorecard
              </span>
            </div>
            <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={{ background: "#E0F2FE", color: "#075985" }}>
              {realismScorecard.overall}/100 · {realismScorecard.grade}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            {[
              ["Evidens", realismScorecard.dimensions.evidens],
              ["Struktur", realismScorecard.dimensions.struktur],
              ["Språk", realismScorecard.dimensions.sprakNaturlighet],
              ["Målgrupp", realismScorecard.dimensions.malgruppstraff],
              ["Redo", realismScorecard.dimensions.marknadsredo],
            ].map(([label, score]) => (
              <div key={String(label)} className="rounded-lg px-2.5 py-2 border" style={{ background: "#FFFFFF", borderColor: "#E0F2FE" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>{label}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: "#0C4A6E" }}>{Number(score)}/100</p>
              </div>
            ))}
          </div>
          {realismScorecard.improvements.length > 0 && (
            <ul className="space-y-1.5">
              {realismScorecard.improvements.map((item, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: "#0C4A6E" }}>
                  <span style={{ color: "#0284C7" }}>•</span> {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {blueprintCoverage && blueprintCoverage.required > 0 && (
        <div className="rounded-xl border p-5 animate-slide-up" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5" style={{ color: "#B45309" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#92400E" }}>
                Faktatäckning mot skrivplan
              </span>
            </div>
            <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={{ background: "#FEF3C7", color: "#92400E" }}>
              {blueprintCoverage.matched}/{blueprintCoverage.required}
            </span>
          </div>
          <p className="text-xs" style={{ color: "#78350F" }}>
            {Math.round((blueprintCoverage.ratio || 0) * 100)}% av prioriterade fakta hittades tydligt i sluttexten.
          </p>
        </div>
      )}

      {inputSignalCoverage && inputSignalCoverage.totalSignals > 0 && (
        <div className="rounded-xl border p-5 animate-slide-up" style={{ background: "#F8FAFC", borderColor: "#CBD5E1" }}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5" style={{ color: "#334155" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#334155" }}>
                Input-signaltäckning
              </span>
            </div>
            <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={{ background: "#E2E8F0", color: "#334155" }}>
              {inputSignalCoverage.usedSignals}/{inputSignalCoverage.totalSignals}
            </span>
          </div>
          <p className="text-xs mb-2" style={{ color: "#475569" }}>
            {Math.round((inputSignalCoverage.ratio || 0) * 100)}% av identifierade informationssignaler från underlaget återfinns i sluttexten.
          </p>
          <div className="flex flex-wrap gap-2">
            {inputSignalCoverage.critical.slice(0, 6).map((signal, index) => (
              <span
                key={`${signal.path}-${index}`}
                className="px-2 py-1 rounded-full text-[10px] font-semibold"
                style={{
                  background: signal.used ? "#DCFCE7" : "#FEE2E2",
                  color: signal.used ? "#166534" : "#991B1B",
                }}
              >
                {signal.used ? "✓" : "!"} {signal.path}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── KOPIERA ALLT ── */}
      {hasExtraTexts && (
        <CopyAllButton result={liveResult} />
      )}

      <div
        className="rounded-xl border p-4 sm:p-5 animate-slide-up"
        style={{ background: "#F8F6F1", borderColor: "#D6D3D1", animationDelay: "0.04s" }}
      >

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#E8F5E9", color: "#2D6A4F" }}>
            <Edit3 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: "#1D2939" }}>AI-redigera texten efteråt</span>
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: "#ECFDF5", color: "#2D6A4F" }}>
                Markera text i beskrivningen
              </span>
            </div>
            <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>
              Du kan markera valfri mening eller stycke i objektbeskrivningen och låta AI:n skriva om just den delen.
            </p>
          </div>
        </div>
      </div>

      {/* ── HIGHLIGHTS ── */}
      {result.highlights && result.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          {result.highlights.map((h, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium border" style={{ background: "#F0FDF4", borderColor: "#BBF7D0", color: "#166534" }}>
              {h}
            </span>
          ))}
        </div>
      )}

      {/* ── 1. RUBRIK ── */}
      {result.headline && (
        <CopyCard title="Rubrik" icon={Type} text={result.headline} iconColor="#D4AF37" delay="0.03s" />
      )}

      {/* ── 2. OBJEKTBESKRIVNING (editable with inline highlights) ── */}
      <div className="pro-card pro-card-premium rounded-xl border overflow-hidden animate-slide-up" style={{ borderColor: "#E8E5DE", animationDelay: "0.06s" }}>
        <div className="px-6 py-4 border-b flex justify-between items-center flex-wrap gap-2" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: "#2D6A4F" }} />

            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>
              Objektbeskrivning
            </span>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium" style={{ background: "#E8F5E9", color: "#2D6A4F" }}>
              <Edit3 className="w-3 h-3" />
            </div>
            {expertAnalysis && expertAnalysis.improvements && expertAnalysis.improvements.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium" style={{ background: "#FEF3C7", color: "#92400E" }}>
                <Lightbulb className="w-3 h-3" />
                {expertAnalysis.improvements.length} förbättringar
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PdfExport result={liveResult} />
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(editedText)}
              className="h-8 text-xs font-medium transition-shadow"
              style={{ borderColor: "#D1D5DB", color: copiedMain ? "#2D6A4F" : "#374151" }}>
              {copiedMain ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copiedMain ? "Kopierad!" : "Kopiera text"}
            </Button>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="mb-4 rounded-lg border px-3.5 py-3 flex items-start gap-2.5 text-xs" style={{ background: "#FAFAF7", borderColor: "#E8E5DE", color: "#6B7280" }}>
            <Info className="w-3 h-3" />
            <div>
              <p className="font-medium" style={{ color: "#374151" }}>Direktredigering + AI-redigering + Expertfeedback</p>
              <p className="mt-1">Skriv direkt i texten, markera för AI-hjälp, eller klicka på färgade markeringar för expertförslag. Alla ändringar följer med i kopiering och PDF-export.</p>
            </div>
          </div>

          {/* Show InlineHighlights if expertAnalysis is available */}
          {expertAnalysis && expertAnalysis.improvements && expertAnalysis.improvements.length > 0 ? (
            <div className="mb-4 rounded-lg border p-4" style={{ background: "#FFFFFF", borderColor: "#E8E5DE" }}>
              <div className="text-base leading-relaxed font-serif" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939", lineHeight: "1.6" }}>
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
          )}
        </div>
      </div>

      {/* ── EXPERT FEEDBACK PANEL ── */}
      {expertAnalysis && expertAnalysis.improvements && expertAnalysis.improvements.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: "0.09s" }}>
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
        <CopyCard title="Socialt inlägg" icon={Instagram} text={result.instagramCaption} iconColor="#E1306C" delay="0.12s" />
      )}

      {/* ── 4. VISNINGSINBJUDAN ── */}
      {result.showingInvitation && (
        <CopyCard title="Visningsinbjudan" icon={Mail} text={result.showingInvitation} iconColor="#2563EB" delay="0.15s" />
      )}

      {/* ── 5. KORTANNONS ── */}
      {result.shortAd && (
        <CopyCard title="Kortannons" icon={Megaphone} text={result.shortAd} iconColor="#7C3AED" delay="0.18s" />
      )}

      {/* ── SOCIAL MEDIA (legacy / extra) ── */}
      {result.socialCopy && !result.instagramCaption && (
        <CopyCard title="Social text" icon={Share2} text={result.socialCopy} iconColor="#9CA3AF" delay="0.2s" />
      )}

      {/* ── FACT CHECK ISSUES ── */}
      {result.factCheck?.issues && result.factCheck.issues.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#991B1B" }}>
              {factCheckExecuted && factCheckMatchesFinalText ? "Faktagranskning — problem hittade" : "Kvalitetskontroll — problem hittade"}
            </span>
          </div>

          <ul className="space-y-2">
            {result.factCheck.issues.map((issue, i) => (
              <li key={i} className="text-xs" style={{ color: "#7F1D1D" }}>
                <span className="font-medium">{issue.quote}</span>
                {issue.reason && <span className="ml-1">— {issue.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pipelineWarnings.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "#FFF7ED", borderColor: "#FED7AA" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#C2410C" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9A3412" }}>
              Pipeline-varningar
            </span>
          </div>
          <ul className="space-y-1.5">
            {pipelineWarnings.map((warning, i) => (
              <li key={i} className="text-xs flex gap-2" style={{ color: "#7C2D12" }}>
                <span style={{ color: "#EA580C" }}>!</span> {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── INFO CARDS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.25s" }}>
        {result.improvements && result.improvements.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#D97706" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#92400E" }}>Saknad information</span>
            </div>
            <p className="text-[10px] mb-2" style={{ color: "#B45309" }}>Lägg till dessa uppgifter för en bättre text:</p>
            <ul className="space-y-1.5">
              {result.improvements.map((s, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: "#78350F" }}>
                  <span style={{ color: "#F59E0B" }}>•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.suggestions && result.suggestions.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#1E40AF" }}>Tips från AI:n</span>
            </div>
            <ul className="space-y-1.5">
              {result.suggestions.map((s, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: "#1E3A5F" }}>
                  <span style={{ color: "#3B82F6" }}>→</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.factCheck?.broker_tips && result.factCheck.broker_tips.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "#ECFDF5", borderColor: "#A7F3D0" }}>
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-3.5 h-3.5" style={{ color: "#059669" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#065F46" }}>Texttips</span>
            </div>
            <ul className="space-y-1.5">
              {result.factCheck.broker_tips.map((tip, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: "#064E3B" }}>
                  <span style={{ color: "#10B981" }}>✓</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {brokerImprovementSuggestions.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "#F0F9FF", borderColor: "#BAE6FD" }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-3.5 h-3.5" style={{ color: "#0284C7" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#0C4A6E" }}>Mäklarens förbättringsfokus</span>
            </div>
            <ul className="space-y-1.5">
              {brokerImprovementSuggestions.map((tip, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: "#0C4A6E" }}>
                  <span style={{ color: "#0EA5E9" }}>→</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.improvement_suggestions?.strengths && result.improvement_suggestions.strengths.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "#F5F3FF", borderColor: "#DDD6FE" }}>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-3.5 h-3.5" style={{ color: "#7C3AED" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#5B21B6" }}>Styrkor i texten</span>
            </div>
            <ul className="space-y-1.5">
              {result.improvement_suggestions.strengths.map((s, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: "#4C1D95" }}>
                  <span style={{ color: "#8B5CF6" }}>★</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.improvement_suggestions?.text_improvements && result.improvement_suggestions.text_improvements.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "#FFF7ED", borderColor: "#FED7AA" }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-3.5 h-3.5" style={{ color: "#EA580C" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9A3412" }}>Textförbättringar</span>
            </div>
            <ul className="space-y-1.5">
              {result.improvement_suggestions.text_improvements.map((s, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: "#7C2D12" }}>
                  <span style={{ color: "#F97316" }}>→</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── DISCLAIMER ── */}
      <p className="text-[10px] text-center" style={{ color: "#9CA3AF" }}>
        AI-analyser avser textkvalitet. Kontrollera alltid fakta före publicering.
      </p>

      {/* ── ACTION BUTTONS ── */}
      <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "#F0EDE6" }}>
        {onRegenerate && (
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex-1 text-sm font-medium transition-colors"
            style={{ borderColor: "#2D6A4F", color: isRegenerating ? "#9CA3AF" : "#2D6A4F" }}
          >
            {isRegenerating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
            {isRegenerating ? "Genererar..." : "Generera igen"}
          </Button>
        )}
        <Button
          onClick={onNewPrompt}
          variant="outline"
          className="flex-1 text-sm font-medium transition-colors"
          style={{ borderColor: "#E8E5DE", color: "#6B7280" }}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Ny beskrivning
        </Button>
      </div>
    </div>
  );
}
