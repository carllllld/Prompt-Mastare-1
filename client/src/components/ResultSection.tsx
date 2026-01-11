import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, RefreshCw, AlertCircle, Sparkles, Lightbulb } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ResultSectionProps {
  result: {
    improvedPrompt: string;
    improvements?: string[];
    suggestions?: string[];
  };
  onNewPrompt: () => void;
}

export function ResultSection({ result, onNewPrompt }: ResultSectionProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(result.improvedPrompt);
    setCopied(true);
    toast({
      title: "Kopierad!",
      description: "Texten har kopierats till urklipp.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HUVUDTEXTEN (Objektbeskrivningen) */}
      <Card className="p-8 shadow-xl border-slate-200 !bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-black uppercase tracking-widest !text-indigo-600 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Genererad Beskrivning
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={copyToClipboard}
            className="!text-slate-600 hover:!text-indigo-600 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Kopierad" : "Kopiera text"}
          </Button>
        </div>

        {/* Här tvingar vi fram svart text på vit bakgrund */}
        <div className="prose prose-slate max-w-none">
          <p className="!text-slate-900 text-lg leading-relaxed whitespace-pre-wrap font-serif">
            {result.improvedPrompt}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FÖRBÄTTRINGAR */}
        {result.improvements && result.improvements.length > 0 && (
          <Card className="p-6 border-slate-200 !bg-slate-50 shadow-sm">
            <h4 className="text-sm font-bold !text-slate-800 mb-4 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" /> Språkliga val
            </h4>
            <ul className="space-y-2">
              {result.improvements.map((imp, i) => (
                <li key={i} className="text-sm !text-slate-600 flex items-start gap-2">
                  <span className="text-indigo-400 mt-1">•</span> {imp}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* JURIDIK / STYLING */}
        {result.suggestions && result.suggestions.length > 0 && (
          <Card className="p-6 border-slate-200 !bg-slate-50 shadow-sm">
            <h4 className="text-sm font-bold !text-slate-800 mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> Expert-noteringar
            </h4>
            <ul className="space-y-2">
              {result.suggestions.map((sug, i) => (
                <li key={i} className="text-sm !text-slate-600 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-slate-400" /> {sug}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Button
        variant="outline"
        onClick={onNewPrompt}
        className="w-full h-12 border-slate-200 !text-slate-600 hover:!bg-slate-50 rounded-xl font-bold"
      >
        <RefreshCw className="w-4 h-4 mr-2" /> Skapa en ny beskrivning
      </Button>
    </div>
  );
}