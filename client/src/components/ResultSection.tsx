import { Button } from "@/components/ui/button";
import { Check, Copy, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { type OptimizeResponse } from "@shared/schema";
import { TextEditor } from "./TextEditor";
import { PdfExport } from "./PdfExport";
import { InlineHighlights } from "./InlineHighlights";
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

// Quick text review — local analysis without API call
function QuickTextReview({ text, wordCount }: { text: string; wordCount: number }) {
  const issues: string[] = [];
  const strengths: string[] = [];

  // Word count check
  if (wordCount < 250) issues.push("Texten är kort (" + wordCount + " ord). En villa med mycket data bör ha minst 300 ord för att ge köparen en komplett bild.");
  if (wordCount >= 350) strengths.push("Bra textlängd (" + wordCount + " ord) — ger köparen tillräckligt med information.");

  // AI-word detection
  const aiWords = ["vilket", "omfattar", "sätter fokus", "sätter ramen", "tar plats", "präglas av", "erbjuder", "bjuder på"];
  const foundAiWords = aiWords.filter(w => text.toLowerCase().includes(w));
  if (foundAiWords.length > 0) issues.push("AI-formuleringar hittade: \"" + foundAiWords.join("\", \"") + "\". Byt ut mot naturligare svenska.");

  // Opening check
  const firstSentence = text.split(/[.!?]/)[0] || "";
  if (firstSentence.length > 120) issues.push("Öppningsmeningen är lång (" + firstSentence.length + " tecken). Korta ner för att fånga läsaren snabbare.");

  // Paragraph check
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length < 3) issues.push("Texten har få stycken (" + paragraphs.length + "). Dela upp i fler stycken för bättre läsbarhet.");
  if (paragraphs.length >= 4) strengths.push("Bra styckeindelning — texten är lätt att skumma igenom.");

  // Repetition check
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const starts = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase());
  const duplicateStarts = starts.filter((s, i) => s && starts[i - 1] === s);
  if (duplicateStarts.length > 0) issues.push("Flera meningar börjar med samma ord. Variera meningsstarten.");

  if (issues.length === 0 && strengths.length === 0) return null;

  return (
    <div className="border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-gray-700 mb-2">Textgranskning</p>
      {issues.length > 0 && (
        <div className="space-y-1 mb-2">
          {issues.map((issue, i) => (
            <p key={i} className="text-xs text-gray-600">- {issue}</p>
          ))}
        </div>
      )}
      {strengths.length > 0 && (
        <div className="space-y-1">
          {strengths.map((s, i) => (
            <p key={i} className="text-xs text-gray-500">+ {s}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function TextCard({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="border border-gray-200 bg-white">
      <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <button onClick={copy} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Kopierad" : "Kopiera"}
        </button>
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
        {text}
      </div>
    </div>
  );
}

export function ResultSection({ result, onNewPrompt, onRegenerate, isRegenerating, propertyData, vitecObjectId, isPro = false }: ResultSectionProps) {
  const [copiedMain, setCopiedMain] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editedText, setEditedText] = useState(result.improvedPrompt);
  const [activeFeedback, setActiveFeedback] = useState<string[]>([]);
  const { toast } = useToast();

  const { applyFix, undo, canUndo } = useOneClickFix({
    onFixApplied: (feedbackId, newText) => {
      setEditedText(newText);
      setActiveFeedback(prev => prev.filter(id => id !== feedbackId));
    },
    onError: (error) => {
      toast({ title: "Kunde inte applicera fix", description: error, variant: "destructive" });
    }
  });

  const expertAnalysis = result.expertAnalysis || null;

  useEffect(() => {
    setEditedText(result.improvedPrompt);
    setActiveFeedback([]);
  }, [result.improvedPrompt]);

  const handleFeedbackClick = useCallback((feedbackId: string) => {
    setActiveFeedback(prev => [...prev, feedbackId]);
    setTimeout(() => setActiveFeedback(prev => prev.filter(id => id !== feedbackId)), 3000);
  }, []);

  const handleFixClick = useCallback((feedbackId: string) => {
    const feedback = expertAnalysis?.improvements?.find((f: any) => f.id === feedbackId);
    if (!feedback) return;
    const r = applyFix(editedText, feedback, 'improvedPrompt');
    if (r.success && r.newText) setEditedText(r.newText);
  }, [expertAnalysis, editedText, applyFix]);

  const handleAISuggestClick = useCallback(async (feedbackId: string) => {
    const feedback = expertAnalysis?.improvements?.find((f: any) => f.id === feedbackId);
    if (!feedback?.textSpan) return;
    const { start, end } = feedback.textSpan;
    try {
      const response = await fetch("/api/selection-edit", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ selectedText: editedText.slice(start, end), fullContext: editedText, field: 'improvedPrompt', style: 'balanced', platform: 'hemnet' }),
      });
      if (!response.ok) throw new Error("Misslyckades");
      const data = await response.json();
      if (data.suggestions?.length > 0) toast({ title: "AI-förslag", description: `${data.suggestions.length} alternativ` });
    } catch { toast({ title: "Fel", description: "Kunde inte generera förslag", variant: "destructive" }); }
  }, [expertAnalysis, editedText, toast]);

  const handleDismissClick = useCallback((feedbackId: string) => {
    setActiveFeedback(prev => prev.filter(id => id !== feedbackId));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        const r = undo();
        if (r.success && r.text) setEditedText(r.text);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, undo]);

  const liveResult = { ...result, improvedPrompt: editedText };
  const wordCount = result.wordCount || result.improvedPrompt.split(/\s+/).filter(Boolean).length;

  const copyMain = () => {
    navigator.clipboard.writeText(editedText);
    setCopiedMain(true);
    setTimeout(() => setCopiedMain(false), 2000);
  };

  const copyAll = () => {
    const parts: string[] = [];
    if (result.headline) parts.push(`RUBRIK\n${result.headline}`);
    parts.push(`OBJEKTBESKRIVNING\n${editedText}`);
    if (result.instagramCaption) parts.push(`SOCIALT INLÄGG\n${result.instagramCaption}`);
    if (result.showingInvitation) parts.push(`VISNINGSINBJUDAN\n${result.showingInvitation}`);
    if (result.shortAd) parts.push(`KORTANNONS\n${result.shortAd}`);
    if (result.socialCopy && !result.instagramCaption) parts.push(`SOCIAL MEDIA\n${result.socialCopy}`);
    navigator.clipboard.writeText(parts.join("\n\n---\n\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const hasExtras = result.headline || result.instagramCaption || result.showingInvitation || result.shortAd;

  return (
    <div className="space-y-4 pb-8">

      {/* Copy all + word count */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{wordCount} ord</span>
        <div className="flex gap-2">
          <PdfExport result={liveResult} />
          {hasExtras && (
            <Button variant="outline" size="sm" onClick={copyAll} className="h-8 text-xs">
              {copiedAll ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
              {copiedAll ? "Kopierat" : "Kopiera alla texter"}
            </Button>
          )}
        </div>
      </div>

      {/* Rubrik */}
      {result.headline && <TextCard title="Rubrik" text={result.headline} />}

      {/* Objektbeskrivning */}
      <div className="border border-gray-200 bg-white">
        <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Objektbeskrivning</span>
          <div className="flex items-center gap-2">
            <button onClick={copyMain} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
              {copiedMain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedMain ? "Kopierad" : "Kopiera"}
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {isPro ? (
            expertAnalysis?.improvements?.length ? (
              <div className="text-sm leading-relaxed text-gray-800">
                <InlineHighlights
                  text={editedText}
                  feedback={expertAnalysis.improvements}
                  field="improvedPrompt"
                  onFixClick={handleFixClick}
                  onTextChange={setEditedText}
                />
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

      {/* Expert feedback — inline under beskrivningen */}
      {expertAnalysis?.improvements?.length > 0 && (
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Förbättringsförslag ({expertAnalysis.improvements.length})</p>
          <div className="space-y-2">
            {expertAnalysis.improvements.slice(0, 5).map((item: any, i: number) => (
              <div key={item.id || i} className="flex items-start justify-between gap-3 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="text-gray-800">{item.suggestion || item.description}</span>
                  {item.textSpan && (
                    <span className="text-gray-400 ml-1">
                      — "{editedText.slice(item.textSpan.start, Math.min(item.textSpan.end, item.textSpan.start + 40))}..."
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleFixClick(item.id)}
                  className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 flex-shrink-0"
                >
                  Fixa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extra texter */}
      {result.instagramCaption && <TextCard title="Socialt inlägg" text={result.instagramCaption} />}
      {result.showingInvitation && <TextCard title="Visningsinbjudan" text={result.showingInvitation} />}
      {result.shortAd && <TextCard title="Kortannons" text={result.shortAd} />}
      {result.socialCopy && !result.instagramCaption && <TextCard title="Social media" text={result.socialCopy} />}

      {/* Snabb textgranskning */}
      <QuickTextReview text={editedText} wordCount={wordCount} />

      {/* Saknad information */}
      {result.improvements && result.improvements.length > 0 && (
        <div className="border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Saknad information som kan förbättra texten:</p>
          <ul className="space-y-1">
            {result.improvements.map((s, i) => (
              <li key={i} className="text-xs text-gray-600">- {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Fact check issues */}
      {result.factCheck?.issues && result.factCheck.issues.length > 0 && (
        <div className="border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-medium text-red-800 mb-2">Kontrollera följande:</p>
          <ul className="space-y-1">
            {result.factCheck.issues.map((issue, i) => (
              <li key={i} className="text-xs text-red-700">
                {issue.quote}{issue.reason ? ` — ${issue.reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-center text-gray-400">Kontrollera alltid fakta före publicering.</p>

      {/* Knappar */}
      <div className="flex gap-3 pt-3 border-t border-gray-200">
        {propertyData && (
          <VitecExportButton
            propertyData={propertyData}
            generatedText={editedText}
            headline={liveResult.headline}
            socialCopy={liveResult.socialCopy}
            shortAd={liveResult.shortAd}
            showingInvitation={liveResult.showingInvitation}
            instagramCaption={liveResult.instagramCaption}
            vitecObjectId={vitecObjectId}
            isPro={isPro}
          />
        )}
        {onRegenerate && (
          <Button variant="outline" onClick={onRegenerate} disabled={isRegenerating} className="flex-1 text-sm">
            {isRegenerating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
            {isRegenerating ? "Genererar..." : "Generera igen"}
          </Button>
        )}
        <Button onClick={onNewPrompt} variant="outline" className="flex-1 text-sm">
          Nytt objekt
        </Button>
      </div>
    </div>
  );
}
