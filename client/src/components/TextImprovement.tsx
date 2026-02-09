import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Edit3, Check, X } from "lucide-react";

interface TextImprovementProps {
  fullText: string;
  isPro: boolean;
  onTextUpdate?: (newText: string) => void;
}

export function TextImprovement({ fullText, isPro, onTextUpdate }: TextImprovementProps) {
  const [selectedText, setSelectedText] = useState("");
  const [improvementType, setImprovementType] = useState("");
  const [improvedText, setImprovedText] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [showImprovement, setShowImprovement] = useState(false);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 10) {
      setSelectedText(text);
      setShowImprovement(false);
    }
  };

  const improveText = async () => {
    if (!selectedText || !improvementType) return;
    
    setIsImproving(true);
    try {
      const response = await fetch("/api/improve-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalText: fullText,
          selectedText: selectedText,
          improvementType: improvementType,
          context: "Fastighetsbeskrivning för mäklare"
        }),
      });

      if (!response.ok) {
        throw new Error("Kunde inte förbättra texten");
      }

      const data = await response.json();
      setImprovedText(data.improvedText);
      setShowImprovement(true);
    } catch (error) {
      console.error("Text improvement error:", error);
    } finally {
      setIsImproving(false);
    }
  };

  const applyImprovement = () => {
    if (improvedText && onTextUpdate) {
      const newText = fullText.replace(selectedText, improvedText);
      onTextUpdate(newText);
      setShowImprovement(false);
      setSelectedText("");
      setImprovedText("");
    }
  };

  const improvementTypes = [
    { value: "more_descriptive", label: "Mer beskrivande", description: "Gör texten mer levande och detaljerad" },
    { value: "more_selling", label: "Mer säljande", description: "Fokusera på fördelar och skapa brådska" },
    { value: "more_formal", label: "Mer formell", description: "Använd professionell ton och korrekta termer" },
    { value: "more_warm", label: "Mer personlig", description: "Skapa en inbjudande känsla" },
    { value: "fix_claims", label: "Fixa klyschor", description: "Ersätt svaga påståenden med fakta" }
  ];

  if (!isPro) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-bold text-purple-900 mb-2">AI-textassistent</h3>
            <p className="text-sm text-purple-700 mb-4">
              Välj delar av texten att förbättra med AI-assistenten
            </p>
            <Badge className="bg-purple-100 text-purple-700">Pro-funktion</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Edit3 className="w-5 h-5 text-purple-600" />
          AI-textassistent
          <Badge className="bg-purple-100 text-purple-700 text-xs">Pro</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-purple-100">
          <p className="text-sm text-purple-700 mb-2">
            📝 Markera text du vill förbättra, välj typ av förbättring, och klicka på "Förbättra"
          </p>
          <div className="text-xs text-purple-600">
            Tips: Markera en mening eller ett stycke i beskrivningen ovan
          </div>
        </div>

        {selectedText && (
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-purple-900">Vald text:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedText("")}
                className="text-purple-600 hover:text-purple-800"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-purple-700 italic">"{selectedText}"</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-purple-900 mb-1 block">
              Förbättringstyp
            </label>
            <Select value={improvementType} onValueChange={setImprovementType}>
              <SelectTrigger>
                <SelectValue placeholder="Välj förbättringstyp" />
              </SelectTrigger>
              <SelectContent>
                {improvementTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={improveText}
              disabled={!selectedText || !improvementType || isImproving}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isImproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Förbättrar...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Förbättra text
                </>
              )}
            </Button>
          </div>
        </div>

        {showImprovement && improvedText && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-green-900">Förbättrad version:</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowImprovement(false)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyImprovement}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Använd
                  </Button>
                </div>
              </div>
              <p className="text-sm text-green-700">"{improvedText}"</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
