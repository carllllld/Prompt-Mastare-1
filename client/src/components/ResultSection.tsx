import { Button } from "@/components/ui/button";
import { Check, Copy, FileText, Share2, RefreshCw, AlertTriangle, AlertCircle, Lightbulb, ShieldCheck, ShieldAlert, Star, BarChart3, Type, Instagram, Mail, Megaphone, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { type OptimizeResponse } from "@shared/schema";
import { TextEditor } from "./TextEditor";
import { PdfExport } from "./PdfExport";

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
    <div className="bg-white rounded-xl border overflow-hidden animate-slide-up" style={{ borderColor: "#E8E5DE", animationDelay: delay }}>
      <div className="px-5 py-3 border-b flex justify-between items-center" style={{ borderColor: "#E8E5DE" }}>
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>{title}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={copy} className="h-7 text-xs" style={{ color: "#6B7280" }}>
          {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? "Kopierad!" : "Kopiera"}
        </Button>
      </div>
      <div className="p-5 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#4B5563" }}>
        {text}
      </div>
    </div>
  );
}

export function ResultSection({ result, onNewPrompt, onRegenerate, isRegenerating }: ResultSectionProps) {
  const [copiedMain, setCopiedMain] = useState(false);
  const [editedText, setEditedText] = useState(result.improvedPrompt);

  // Sync editedText when result changes (e.g. regenerate)
  useEffect(() => {
    setEditedText(result.improvedPrompt);
  }, [result.improvedPrompt]);

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

  const hasExtraTexts = result.headline || result.instagramCaption || result.showingInvitation || result.shortAd;

  return (
    <div className="space-y-4 pb-12">

      {/* ── TEXTKIT HEADER ── */}
      {hasExtraTexts && (
        <div className="flex items-center gap-2 animate-slide-up">
          <div className="w-2 h-2 rounded-full" style={{ background: "#2D6A4F" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#2D6A4F" }}>
            Komplett textkit — 5 texter genererade
          </span>
          <PdfExport result={liveResult} />
        </div>
      )}

      {/* ── STATUS BAR ── */}
      <div className="flex items-center gap-3 flex-wrap animate-slide-up">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "#F0EDE6", color: "#4B5563" }}>
          <BarChart3 className="w-3 h-3" />
          {wordCount} ord
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
      </div>

      {/* ── 1. RUBRIK ── */}
      {result.headline && (
        <CopyCard title="Rubrik" icon={Type} text={result.headline} iconColor="#D4AF37" delay="0.03s" />
      )}

      {/* ── 2. OBJEKTBESKRIVNING (editable) ── */}
      <div className="bg-white rounded-xl border overflow-hidden animate-slide-up" style={{ borderColor: "#E8E5DE", animationDelay: "0.06s" }}>
        <div className="px-6 py-4 border-b flex justify-between items-center flex-wrap gap-2" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: "#2D6A4F" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>
              Objektbeskrivning
            </span>
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
          <TextEditor text={editedText} onTextChange={setEditedText} />
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

      {/* ── 3. INSTAGRAM ── */}
      {result.instagramCaption && (
        <CopyCard title="Instagram / Facebook" icon={Instagram} text={result.instagramCaption} iconColor="#E1306C" delay="0.12s" />
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
        <CopyCard title="Social media-text" icon={Share2} text={result.socialCopy} iconColor="#9CA3AF" delay="0.2s" />
      )}

      {/* ── FACT CHECK ISSUES ── */}
      {result.factCheck?.issues && result.factCheck.issues.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#991B1B" }}>Faktagranskning — problem hittade</span>
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
      <div className="rounded-xl border p-4" style={{ background: "#FFF8E1", borderColor: "#FFE082" }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-3.5 h-3.5" style={{ color: "#F57C00" }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#E65100" }}>Viktig information</span>
        </div>
        <p className="text-xs" style={{ color: "#BF360C" }}>
          AI-analyser och tips avser endast textkvalitet och kommunikation. Inga juridiska, mäklarmässiga eller prisrelaterade råd. Kontrollera alltid information och följ gällande lagar och regler.
        </p>
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="flex justify-center gap-3 pt-2">
        {onRegenerate && (
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="text-sm transition-colors font-medium"
            style={{ borderColor: "#2D6A4F", color: isRegenerating ? "#9CA3AF" : "#2D6A4F" }}
          >
            {isRegenerating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
            {isRegenerating ? "Genererar..." : "Generera igen"}
          </Button>
        )}
        <Button variant="ghost" onClick={onNewPrompt} className="text-sm transition-colors" style={{ color: "#9CA3AF" }}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Ny beskrivning
        </Button>
      </div>
    </div>
  );
}