/**
 * Example demonstrating the integrated editing tools
 * This shows how InlineHighlights, ExpertFeedbackPanel, and OneClickFix work together
 */

import { useState } from "react";
import { InlineHighlights } from "./InlineHighlights";
import { ExpertFeedbackPanel } from "./ExpertFeedbackPanel";
import { useOneClickFix } from "@/hooks/use-one-click-fix";

// Mock expert analysis data (in production, this comes from backend)
const mockExpertAnalysis = {
  overallQuality: 8.5,
  strengths: [
    "Tydlig beskrivning av kökets renovering",
    "Konkreta mått och material angivna",
    "Bra flöde mellan rumsbeskrivningar"
  ],
  improvements: [
    {
      id: "fb-1",
      issue: "AI-klyschigt uttryck 'erbjuder'",
      location: "Köket, första meningen",
      textSpan: { start: 0, end: 45, field: "improvedPrompt" },
      suggestion: "Ersätt 'erbjuder' med konkret beskrivning av vad köket har",
      category: "style" as const,
      severity: "important" as const,
      expert: "broker" as const,
      actionable: true,
      autoFix: "Köket har luckor från Ballingslöv och bänkskiva i komposit."
    },
    {
      id: "fb-2",
      issue: "Saknar renoveringsår",
      location: "Badrummet",
      textSpan: { start: 100, end: 130, field: "improvedPrompt" },
      suggestion: "Lägg till när badrummet renoverades för att ge köparen bättre kontext",
      category: "clarity" as const,
      severity: "suggestion" as const,
      expert: "broker" as const,
      actionable: false
    },
    {
      id: "fb-3",
      issue: "Juridisk varning: Uppgift om avgift saknas",
      location: "Bostadsrättsförening",
      textSpan: { start: 200, end: 250, field: "improvedPrompt" },
      suggestion: "Lägg till månadskostnad för bostadsrätten",
      category: "legal" as const,
      severity: "critical" as const,
      expert: "lawyer" as const,
      actionable: false
    }
  ],
  legalCheck: {
    compliant: false,
    notes: "Avgift för bostadsrätten måste anges enligt lag",
    issues: ["Månadskostnad saknas"]
  },
  duration: 6500
};

const mockText = "Köket erbjuder luckor från Ballingslöv och bänkskiva i komposit. Plats för matbord vid fönstret. Badrummet är helkaklat med dubbla handfat. Bostadsrättsföreningen är välskött med låg skuldsättning.";

export function EditingToolsExample() {
  const [text, setText] = useState(mockText);
  const [dismissedFeedback, setDismissedFeedback] = useState<string[]>([]);

  const { applyFix, undo, canUndo } = useOneClickFix({
    onFixApplied: (feedbackId, newText) => {
      setText(newText);
      setDismissedFeedback(prev => [...prev, feedbackId]);
      console.log('[Example] Fix applied:', feedbackId);
    },
    onError: (error) => {
      console.error('[Example] Fix error:', error);
      alert(`Fel: ${error}`);
    }
  });

  // Filter out dismissed feedback
  const activeFeedback = mockExpertAnalysis.improvements.filter(
    f => !dismissedFeedback.includes(f.id)
  );

  const activeAnalysis = {
    ...mockExpertAnalysis,
    improvements: activeFeedback
  };

  const handleFixClick = (feedbackId: string) => {
    const feedback = mockExpertAnalysis.improvements.find(f => f.id === feedbackId);
    if (!feedback) return;

    const result = applyFix(text, feedback, 'improvedPrompt');
    if (!result.success) {
      alert(`Kunde inte applicera fix: ${result.error}`);
    }
  };

  const handleAISuggestClick = async (feedbackId: string) => {
    const feedback = mockExpertAnalysis.improvements.find(f => f.id === feedbackId);
    if (!feedback?.textSpan) return;

    const { start, end } = feedback.textSpan;
    const selectedText = text.slice(start, end);

    console.log('[Example] AI suggest for:', selectedText);
    alert(`AI-förslag skulle genereras för: "${selectedText}"\n\nI produktion anropas /api/selection-edit här.`);
  };

  const handleDismissClick = (feedbackId: string) => {
    setDismissedFeedback(prev => [...prev, feedbackId]);
    console.log('[Example] Dismissed feedback:', feedbackId);
  };

  const handleFeedbackClick = (feedbackId: string) => {
    console.log('[Example] Feedback clicked:', feedbackId);
    // In production, would scroll to text span
  };

  const handleUndo = () => {
    const result = undo();
    if (result.success && result.text) {
      setText(result.text);
      console.log('[Example] Undo successful');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-2xl font-bold mb-2">Editing Tools Demo</h1>
        <p className="text-gray-600 mb-4">
          Detta exempel visar hur InlineHighlights, ExpertFeedbackPanel och OneClickFix fungerar tillsammans.
        </p>
        
        {canUndo && (
          <button
            onClick={handleUndo}
            className="mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            ↶ Ångra senaste ändring
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Text with inline highlights */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600 mb-3">
                Objektbeskrivning med inline highlights
              </h2>
              <div className="text-base leading-relaxed">
                <InlineHighlights
                  text={text}
                  feedback={activeFeedback}
                  field="improvedPrompt"
                  onFixClick={handleFixClick}
                  onTextChange={setText}
                />
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Instruktioner</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Hovra över färgade markeringar för att se feedback</li>
                <li>• Klicka "Fixa automatiskt" i tooltip för att applicera fix</li>
                <li>• Använd panelen till höger för att se all feedback</li>
                <li>• Klicka "Ångra" för att återställa ändringar</li>
              </ul>
            </div>
          </div>

          {/* Expert feedback panel */}
          <div className="lg:col-span-1">
            <ExpertFeedbackPanel
              analysis={activeAnalysis}
              onFeedbackClick={handleFeedbackClick}
              onFixClick={handleFixClick}
              onAISuggestClick={handleAISuggestClick}
              onDismissClick={handleDismissClick}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-900">{activeFeedback.length}</div>
            <div className="text-xs text-green-700">Aktiva förbättringar</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-900">{dismissedFeedback.length}</div>
            <div className="text-xs text-purple-700">Applicerade/avvisade</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-900">{mockExpertAnalysis.overallQuality}/10</div>
            <div className="text-xs text-blue-700">Kvalitetspoäng</div>
          </div>
        </div>
      </div>
    </div>
  );
}
