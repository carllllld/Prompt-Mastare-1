import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "./ui/button";

interface QualityProgressIndicatorProps {
  completedFields: number;
  totalFields: number;
  qualityScore: number; // 1-10
  missingSuggestions: Array<{ label: string; impact: string }>;
  onFieldClick?: (fieldName: string) => void;
  onSubmit?: () => void;
  onImprove?: () => void;
}

export function QualityProgressIndicator({
  completedFields,
  totalFields,
  qualityScore,
  missingSuggestions,
  onFieldClick,
  onSubmit,
  onImprove,
}: QualityProgressIndicatorProps) {
  const percentage = Math.round((completedFields / totalFields) * 100);
  
  const getQualityLevel = () => {
    if (qualityScore >= 9) return { label: "Utmärkt", color: "text-green-600", bgColor: "bg-green-500" };
    if (qualityScore >= 7) return { label: "Bra", color: "text-blue-600", bgColor: "bg-blue-500" };
    if (qualityScore >= 5) return { label: "OK", color: "text-amber-600", bgColor: "bg-amber-500" };
    return { label: "Grundläggande", color: "text-orange-600", bgColor: "bg-orange-500" };
  };
  
  const qualityLevel = getQualityLevel();
  const canImprove = qualityScore < 9 && missingSuggestions.length > 0;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-4 z-10 shadow-sm">
      {/* Quality Score Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-12 h-12 rounded-full ${qualityLevel.bgColor} flex items-center justify-center text-white font-bold text-lg`}>
            {qualityScore}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Textkvalitet: {qualityScore}/10
            </div>
            <div className={`text-xs font-medium ${qualityLevel.color}`}>
              {qualityLevel.label}
              {qualityScore >= 7 && " - över genomsnitt"}
            </div>
          </div>
        </div>
        
        {qualityScore >= 9 ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : qualityScore >= 7 ? (
          <Info className="w-6 h-6 text-blue-500" />
        ) : (
          <AlertCircle className="w-6 h-6 text-amber-500" />
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Ifyllda fält</span>
          <span>{completedFields}/{totalFields} ({percentage}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${qualityLevel.bgColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      {/* Improvement Suggestions */}
      {canImprove && missingSuggestions.length > 0 && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                För att nå {Math.min(10, qualityScore + missingSuggestions.length)}/10, lägg till:
              </p>
              <ul className="space-y-1">
                {missingSuggestions.slice(0, 3).map((suggestion, idx) => (
                  <li key={idx} className="text-xs text-blue-800">
                    • {suggestion.label} <span className="text-blue-600">({suggestion.impact})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={onSubmit}
          className="w-full"
          size="sm"
        >
          Generera text nu ({qualityScore}/10)
        </Button>
        
        {canImprove && onImprove && (
          <Button
            type="button"
            onClick={onImprove}
            variant="outline"
            className="w-full"
            size="sm"
          >
            Lägg till mer för bättre text
          </Button>
        )}
      </div>
      
      {/* Quality Explanation */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          {qualityScore >= 9 && "🎉 Perfekt! Du har fyllt i all viktig information för en topptext."}
          {qualityScore >= 7 && qualityScore < 9 && "👍 Bra! Texten blir över genomsnitt. Lägg till mer för att nå toppnivå."}
          {qualityScore >= 5 && qualityScore < 7 && "⚠️ OK start. Lägg till kök, läge och USP för bättre text."}
          {qualityScore < 5 && "📝 Grundläggande. Fyll i mer information för en professionell text."}
        </p>
      </div>
    </div>
  );
}
