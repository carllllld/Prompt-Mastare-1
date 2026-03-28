import { useState } from "react";
import { ExpertFeedbackPanel } from "./ExpertFeedbackPanel";
import { InlineHighlights } from "./InlineHighlights";

// Mock data for demonstration
const mockAnalysis = {
  overallQuality: 8,
  strengths: [
    "Tydlig och engagerande beskrivning",
    "Bra användning av konkreta detaljer",
    "Professionell ton som passar målgruppen",
  ],
  improvements: [
    {
      id: "fb-1",
      issue: "Stavfel: 'rymligt' ska vara 'rymlig' för att matcha genus",
      location: "Huvudtext, rad 3",
      textSpan: { start: 45, end: 52, field: "improvedPrompt" },
      suggestion: "Ändra 'rymligt' till 'rymlig' för att matcha substantivets genus (en lägenhet)",
      category: "grammar" as const,
      severity: "critical" as const,
      expert: "broker" as const,
      actionable: true,
      autoFix: "rymlig",
    },
    {
      id: "fb-2",
      issue: "Juridisk varning: Undvik absoluta påståenden om värdeökning",
      location: "Huvudtext, rad 7",
      textSpan: { start: 120, end: 165, field: "improvedPrompt" },
      suggestion: "Formulera om för att undvika garantier om framtida värde. Använd 'kan' eller 'potentiell' istället för absoluta påståenden.",
      category: "legal" as const,
      severity: "critical" as const,
      expert: "lawyer" as const,
      actionable: true,
      autoFix: "Området har potential för värdeökning",
    },
    {
      id: "fb-3",
      issue: "AI-klyschigt språk: 'drömlägenhet' låter opersonligt",
      location: "Rubrik",
      textSpan: { start: 0, end: 13, field: "headline" },
      suggestion: "Använd mer specifika och konkreta beskrivningar istället för generiska superlativ. Fokusera på unika egenskaper.",
      category: "broker_realism" as const,
      severity: "important" as const,
      expert: "broker" as const,
      actionable: true,
      autoFix: "Ljus 3:a med balkong i Vasastan",
    },
    {
      id: "fb-4",
      issue: "Otydlig meningsbyggnad kan förvirra läsaren",
      location: "Huvudtext, rad 5",
      textSpan: { start: 80, end: 115, field: "improvedPrompt" },
      suggestion: "Dela upp meningen i två kortare meningar för bättre läsbarhet och tydlighet.",
      category: "clarity" as const,
      severity: "important" as const,
      expert: "broker" as const,
      actionable: false,
    },
    {
      id: "fb-5",
      issue: "Överväg att lägga till information om energiklass",
      location: "Huvudtext, slutet",
      textSpan: undefined,
      suggestion: "Lägg till energiklassning för att uppfylla informationskrav och öka transparens.",
      category: "legal" as const,
      severity: "suggestion" as const,
      expert: "lawyer" as const,
      actionable: false,
    },
    {
      id: "fb-6",
      issue: "Stilistisk förbättring: Variera meningsstruktur",
      location: "Huvudtext, genomgående",
      textSpan: undefined,
      suggestion: "Flera meningar börjar med 'Lägenheten'. Variera meningsstruktur för bättre flyt.",
      category: "style" as const,
      severity: "suggestion" as const,
      expert: "broker" as const,
      actionable: false,
    },
  ],
  legalCheck: {
    compliant: true,
    notes: "Texten följer allmänna riktlinjer för mäklartexter. En mindre justering rekommenderas för värdeökningspåståenden.",
    issues: [],
  },
  duration: 5200,
};

const mockText = {
  headline: "Drömlägenhet i Vasastan",
  improvedPrompt: `Välkommen till denna rymligt lägenhet i hjärtat av Vasastan. Lägenheten har ett öppet kök som vetter mot vardagsrummet. Området kommer att öka kraftigt i värde de kommande åren. Lägenheten har balkong med kvällssol och ligger nära tunnelbanan.`,
};

export function ExpertFeedbackPanelExample() {
  const [analysis, setAnalysis] = useState(mockAnalysis);
  const [texts, setTexts] = useState(mockText);

  // Handle feedback click - scroll to text
  const handleFeedbackClick = (feedbackId: string) => {
    const item = analysis.improvements.find(f => f.id === feedbackId);
    if (!item?.textSpan) return;

    console.log("Scroll to feedback:", feedbackId, item.textSpan);
    // In a real implementation, this would scroll to and highlight the text span
  };

  // Handle fix click - apply automatic fix
  const handleFixClick = (feedbackId: string) => {
    const item = analysis.improvements.find(f => f.id === feedbackId);
    if (!item?.autoFix || !item.textSpan) return;

    // Apply the fix to the appropriate field
    const field = item.textSpan.field as keyof typeof texts;
    const currentText = texts[field];
    const { start, end } = item.textSpan;
    const newText = currentText.slice(0, start) + item.autoFix + currentText.slice(end);

    // Update text
    setTexts(prev => ({
      ...prev,
      [field]: newText,
    }));

    // Remove feedback item
    setAnalysis(prev => ({
      ...prev,
      improvements: prev.improvements.filter(f => f.id !== feedbackId),
    }));

    console.log("Applied fix:", feedbackId, item.autoFix);
  };

  // Handle AI suggest click
  const handleAISuggestClick = (feedbackId: string) => {
    const item = analysis.improvements.find(f => f.id === feedbackId);
    console.log("Get AI suggestions for:", feedbackId, item);
    // In a real implementation, this would call an API to get AI suggestions
    alert(`AI-förslag för: ${item?.issue}\n\nDetta skulle öppna en dialog med AI-genererade alternativ.`);
  };

  // Handle dismiss click
  const handleDismissClick = (feedbackId: string) => {
    setAnalysis(prev => ({
      ...prev,
      improvements: prev.improvements.filter(f => f.id !== feedbackId),
    }));
    console.log("Dismissed feedback:", feedbackId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ExpertFeedbackPanel Example
          </h1>
          <p className="text-gray-600">
            Demonstration of the ExpertFeedbackPanel component with interactive features
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Headline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Rubrik</h3>
              <div className="text-2xl font-bold">
                <InlineHighlights
                  text={texts.headline}
                  feedback={analysis.improvements}
                  field="headline"
                  onFixClick={handleFixClick}
                />
              </div>
            </div>

            {/* Main text */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Huvudtext</h3>
              <div className="text-base leading-relaxed">
                <InlineHighlights
                  text={texts.improvedPrompt}
                  feedback={analysis.improvements}
                  field="improvedPrompt"
                  onFixClick={handleFixClick}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Hur man använder
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Hovra över markerad text för att se feedback-tooltip</li>
                <li>• Klicka på feedback i panelen för att scrolla till texten</li>
                <li>• Klicka "Fixa" för att applicera automatisk korrigering</li>
                <li>• Klicka "AI-förslag" för att få fler alternativ</li>
                <li>• Klicka X för att avfärda feedback</li>
              </ul>
            </div>
          </div>

          {/* Feedback panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ExpertFeedbackPanel
                analysis={analysis}
                onFeedbackClick={handleFeedbackClick}
                onFixClick={handleFixClick}
                onAISuggestClick={handleAISuggestClick}
                onDismissClick={handleDismissClick}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Statistik</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.improvements.length}
              </p>
              <p className="text-xs text-gray-600">Förbättringar kvar</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.overallQuality}/10
              </p>
              <p className="text-xs text-gray-600">Kvalitetspoäng</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.improvements.filter(f => f.actionable).length}
              </p>
              <p className="text-xs text-gray-600">Automatiska fixes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.legalCheck.compliant ? '✓' : '⚠'}
              </p>
              <p className="text-xs text-gray-600">Juridisk status</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export for use in development/testing
export default ExpertFeedbackPanelExample;
